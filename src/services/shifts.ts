import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ingredients, sales, shifts, stockChecks, users, type CheckStatus, type Shift } from "@/db/schema";
import type { Db } from "@/db/types";
import { todayInBali } from "@/lib/time";
import { cashTotals } from "./cash";
import { UserError } from "./errors";

export async function getOpenShift(db: Db): Promise<(Shift & { openedByName: string }) | null> {
  const [row] = await db
    .select({ shift: shifts, openedByName: users.name })
    .from(shifts)
    .innerJoin(users, eq(shifts.openedBy, users.id))
    .where(isNull(shifts.closedAt))
    .limit(1);
  return row ? { ...row.shift, openedByName: row.openedByName } : null;
}

export async function openShift(db: Db, input: { userId: number; openingCash: number }, now: Date = new Date()) {
  if (!Number.isInteger(input.openingCash) || input.openingCash < 0) throw new UserError("Isi jumlah uang di laci.");
  const existing = await getOpenShift(db);
  if (existing) throw new UserError(`Kas sudah dibuka oleh ${existing.openedByName}.`);
  try {
    const [shift] = await db
      .insert(shifts)
      .values({ openedBy: input.userId, openingCash: input.openingCash, openedAt: now, businessDate: todayInBali(now) })
      .returning();
    return shift;
  } catch (e) {
    // Unique index one_open_shift: ada orang lain yang membuka kas di detik yang sama.
    if (String((e as { cause?: unknown })?.cause ?? e).includes("one_open_shift")) {
      throw new UserError("Kas sudah dibuka.");
    }
    throw e;
  }
}

export type ShiftTotals = {
  transactions: number;
  voided: number;
  cashSales: number;
  qrisSales: number;
  total: number;
  hpp: number;
  /** Kas masuk / keluar di luar penjualan */
  cashIn: number;
  cashOut: number;
};

/** Uang yang seharusnya ada di laci: kas awal + jualan tunai + kas masuk − kas keluar. */
export function expectedDrawer(openingCash: number, t: Pick<ShiftTotals, "cashSales" | "cashIn" | "cashOut">) {
  return openingCash + t.cashSales + t.cashIn - t.cashOut;
}

export async function shiftTotals(db: Db, shiftId: number): Promise<ShiftTotals> {
  const [row] = await db
    .select({
      transactions: sql<number>`count(*) filter (where ${sales.status} = 'lunas')`.mapWith(Number),
      voided: sql<number>`count(*) filter (where ${sales.status} = 'batal')`.mapWith(Number),
      cashSales: sql<number>`coalesce(sum(${sales.total}) filter (where ${sales.status} = 'lunas' and ${sales.paymentMethod} = 'tunai'), 0)`.mapWith(Number),
      qrisSales: sql<number>`coalesce(sum(${sales.total}) filter (where ${sales.status} = 'lunas' and ${sales.paymentMethod} = 'qris'), 0)`.mapWith(Number),
      hpp: sql<number>`coalesce(sum(${sales.hppTotal}) filter (where ${sales.status} = 'lunas'), 0)`.mapWith(Number),
    })
    .from(sales)
    .where(eq(sales.shiftId, shiftId));
  const cash = await cashTotals(db, { shiftId });
  return { ...row, total: row.cashSales + row.qrisSales, cashIn: cash.masuk, cashOut: cash.keluar };
}

/**
 * Tutup kas: hitung uang yang seharusnya ada (kas awal + penjualan tunai), simpan uang yang dihitung karyawan,
 * dan simpan hasil cek bahan manual (kentang, sosis, saus, dll).
 */
export async function closeShift(
  db: Db,
  input: {
    shiftId: number;
    userId: number;
    countedCash: number;
    checks: { ingredientId: number; status: CheckStatus }[];
    note?: string;
  },
  now: Date = new Date(),
) {
  if (!Number.isInteger(input.countedCash) || input.countedCash < 0) throw new UserError("Isi jumlah uang di laci.");

  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(eq(shifts.id, input.shiftId)).for("update");
    if (!shift) throw new UserError("Shift tidak ditemukan.");
    if (shift.closedAt) throw new UserError("Kas ini sudah ditutup.");

    const totals = await shiftTotals(tx as unknown as Db, shift.id);
    const expectedCash = expectedDrawer(shift.openingCash, totals);

    const [closed] = await tx
      .update(shifts)
      .set({
        closedAt: now,
        closedBy: input.userId,
        expectedCash,
        countedCash: input.countedCash,
        note: input.note?.trim() ?? "",
      })
      .where(eq(shifts.id, shift.id))
      .returning();

    for (const c of input.checks) {
      await tx.insert(stockChecks).values({ shiftId: shift.id, ingredientId: c.ingredientId, status: c.status });
      await tx
        .update(ingredients)
        .set({ checkStatus: c.status, checkedAt: now, checkedBy: input.userId })
        .where(and(eq(ingredients.id, c.ingredientId), eq(ingredients.tracking, "manual")));
    }

    return { shift: closed, totals, expectedCash, difference: input.countedCash - expectedCash };
  });
}

export async function listShifts(db: Db, limit = 60) {
  const opener = sql<string>`(select name from users where users.id = ${shifts.openedBy})`;
  const closer = sql<string | null>`(select name from users where users.id = ${shifts.closedBy})`;
  const rows = await db
    .select({ shift: shifts, openedByName: opener, closedByName: closer })
    .from(shifts)
    .orderBy(desc(shifts.openedAt))
    .limit(limit);
  return Promise.all(
    rows.map(async (r) => ({ ...r.shift, openedByName: r.openedByName, closedByName: r.closedByName, totals: await shiftTotals(db, r.shift.id) })),
  );
}

export async function listShiftChecks(db: Db, shiftId: number) {
  return db
    .select({ name: ingredients.name, status: stockChecks.status })
    .from(stockChecks)
    .innerJoin(ingredients, eq(stockChecks.ingredientId, ingredients.id))
    .where(eq(stockChecks.shiftId, shiftId))
    .orderBy(ingredients.sortOrder);
}
