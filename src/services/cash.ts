import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { cashMovements, shifts, users } from "@/db/schema";
import type { Db } from "@/db/types";
import { todayInBali } from "@/lib/time";
import { UserError } from "./errors";

/** Catat uang masuk/keluar laci di luar penjualan, ke shift yang sedang terbuka. */
export async function addCashMovement(
  db: Db,
  input: { userId: number; type: "masuk" | "keluar"; amount: number; note: string },
  now: Date = new Date(),
) {
  const note = input.note.trim();
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new UserError("Isi jumlah uang lebih dari 0.");
  if (input.amount > 100_000_000) throw new UserError("Jumlah terlalu besar.");
  if (note.length < 3) throw new UserError("Tulis keterangannya, mis. beli es batu.");

  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(isNull(shifts.closedAt)).for("update");
    if (!shift) throw new UserError("Kas belum dibuka.");
    const [row] = await tx
      .insert(cashMovements)
      .values({
        shiftId: shift.id,
        userId: input.userId,
        businessDate: todayInBali(now),
        type: input.type,
        amount: input.amount,
        note: note.slice(0, 120),
        createdAt: now,
      })
      .returning();
    return row;
  });
}

/** Hapus catatan kas yang salah input. Karyawan hanya boleh selama shift-nya masih terbuka. */
export async function deleteCashMovement(db: Db, input: { id: number; role: "owner" | "staff" }) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: cashMovements.id, closedAt: shifts.closedAt })
      .from(cashMovements)
      .innerJoin(shifts, eq(cashMovements.shiftId, shifts.id))
      .where(eq(cashMovements.id, input.id));
    if (!row) throw new UserError("Catatan kas tidak ditemukan.");
    if (input.role !== "owner" && row.closedAt) throw new UserError("Kas shift ini sudah ditutup. Minta pemilik untuk menghapus.");
    await tx.delete(cashMovements).where(eq(cashMovements.id, input.id));
  });
}

export async function listCashMovements(db: Db, where: { shiftId?: number; businessDate?: string }) {
  return db
    .select({
      id: cashMovements.id,
      type: cashMovements.type,
      amount: cashMovements.amount,
      note: cashMovements.note,
      createdAt: cashMovements.createdAt,
      by: users.name,
    })
    .from(cashMovements)
    .innerJoin(users, eq(cashMovements.userId, users.id))
    .where(
      and(
        where.shiftId ? eq(cashMovements.shiftId, where.shiftId) : undefined,
        where.businessDate ? eq(cashMovements.businessDate, where.businessDate) : undefined,
      ),
    )
    .orderBy(desc(cashMovements.createdAt), desc(cashMovements.id));
}

export async function cashTotals(db: Db, where: { shiftId?: number; businessDate?: string }) {
  const [row] = await db
    .select({
      masuk: sql<number>`coalesce(sum(${cashMovements.amount}) filter (where ${cashMovements.type} = 'masuk'), 0)`.mapWith(Number),
      keluar: sql<number>`coalesce(sum(${cashMovements.amount}) filter (where ${cashMovements.type} = 'keluar'), 0)`.mapWith(Number),
    })
    .from(cashMovements)
    .where(
      and(
        where.shiftId ? eq(cashMovements.shiftId, where.shiftId) : undefined,
        where.businessDate ? eq(cashMovements.businessDate, where.businessDate) : undefined,
      ),
    );
  return row;
}
