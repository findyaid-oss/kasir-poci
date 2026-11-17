import { and, asc, desc, eq, gte, lte, min, sql } from "drizzle-orm";
import { saleItems, sales, settings, type Settings } from "@/db/schema";
import type { Db } from "@/db/types";
import { daysInclusive } from "@/lib/time";

export type DayTotals = {
  date: string;
  transactions: number;
  omzet: number;
  tunai: number;
  qris: number;
  hpp: number;
  labaKotor: number;
  cups: number;
  porsi: number;
};

const lunas = eq(sales.status, "lunas");

/** Total per hari untuk rentang tanggal (hanya hari yang ada penjualannya). */
export async function dailyTotals(db: Db, from: string, to: string): Promise<DayTotals[]> {
  const money = await db
    .select({
      date: sales.businessDate,
      transactions: sql<number>`count(*)`.mapWith(Number),
      omzet: sql<number>`sum(${sales.total})`.mapWith(Number),
      tunai: sql<number>`coalesce(sum(${sales.total}) filter (where ${sales.paymentMethod} = 'tunai'), 0)`.mapWith(Number),
      qris: sql<number>`coalesce(sum(${sales.total}) filter (where ${sales.paymentMethod} = 'qris'), 0)`.mapWith(Number),
      hpp: sql<number>`sum(${sales.hppTotal})`.mapWith(Number),
    })
    .from(sales)
    .where(and(lunas, gte(sales.businessDate, from), lte(sales.businessDate, to)))
    .groupBy(sales.businessDate)
    .orderBy(desc(sales.businessDate));

  const units = await db
    .select({
      date: sales.businessDate,
      cups: sql<number>`coalesce(sum(${saleItems.qty}) filter (where ${saleItems.kind} = 'minuman'), 0)`.mapWith(Number),
      porsi: sql<number>`coalesce(sum(${saleItems.qty}) filter (where ${saleItems.kind} = 'makanan'), 0)`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(lunas, gte(sales.businessDate, from), lte(sales.businessDate, to)))
    .groupBy(sales.businessDate);
  const unitsByDate = new Map(units.map((u) => [u.date, u]));

  return money.map((m) => ({
    ...m,
    labaKotor: m.omzet - m.hpp,
    cups: unitsByDate.get(m.date)?.cups ?? 0,
    porsi: unitsByDate.get(m.date)?.porsi ?? 0,
  }));
}

export function emptyDay(date: string): DayTotals {
  return { date, transactions: 0, omzet: 0, tunai: 0, qris: 0, hpp: 0, labaKotor: 0, cups: 0, porsi: 0 };
}

export type ItemSummary = {
  name: string;
  category: string;
  kind: string;
  qty: number;
  omzet: number;
  labaKotor: number;
};

/** Jumlah cup/porsi, omzet, dan laba kotor per menu (dan per topping) untuk satu hari. */
export async function itemSummary(db: Db, date: string): Promise<ItemSummary[]> {
  const rows = await db
    .select({
      name: saleItems.name,
      category: saleItems.category,
      kind: saleItems.kind,
      qty: sql<number>`sum(${saleItems.qty})`.mapWith(Number),
      omzet: sql<number>`sum(${saleItems.qty} * ${saleItems.unitPrice})`.mapWith(Number),
      hpp: sql<number>`sum(${saleItems.qty} * ${saleItems.unitHpp})`.mapWith(Number),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(lunas, eq(sales.businessDate, date)))
    .groupBy(saleItems.name, saleItems.category, saleItems.kind)
    .orderBy(desc(sql`sum(${saleItems.qty})`), asc(saleItems.name));
  return rows.map(({ hpp, ...r }) => ({ ...r, labaKotor: r.omzet - hpp }));
}

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}

export function fixedCostMonthly(s: Settings) {
  return s.rentMonthly + s.electricityMonthly + s.securityMonthly + s.otherMonthly;
}

/** Biaya tetap per hari, memakai rata-rata 30 hari per bulan. */
export function fixedCostDaily(s: Settings) {
  return Math.round(fixedCostMonthly(s) / 30);
}

export type CapitalProgress = {
  startDate: string | null;
  days: number;
  labaKotor: number;
  biayaTetap: number;
  labaBersih: number;
  modal: number;
  /** 0..1 (bisa minus kalau masih rugi) */
  progress: number;
};

/**
 * Progres balik modal: laba kotor sejak mulai usaha dikurangi biaya tetap selama hari-hari itu,
 * dibandingkan dengan modal awal.
 */
export async function capitalProgress(db: Db, s: Settings, today: string): Promise<CapitalProgress> {
  const [{ first }] = await db.select({ first: min(sales.businessDate) }).from(sales).where(lunas);
  const startDate = s.startDate ?? first ?? null;
  const [{ laba }] = await db
    .select({ laba: sql<number>`coalesce(sum(${sales.total} - ${sales.hppTotal}), 0)`.mapWith(Number) })
    .from(sales)
    .where(and(lunas, startDate ? gte(sales.businessDate, startDate) : undefined));
  const days = startDate ? daysInclusive(startDate, today) : 0;
  const biayaTetap = days * fixedCostDaily(s);
  const labaBersih = laba - biayaTetap;
  return {
    startDate,
    days,
    labaKotor: laba,
    biayaTetap,
    labaBersih,
    modal: s.initialCapital,
    progress: s.initialCapital > 0 ? labaBersih / s.initialCapital : 0,
  };
}

/** Baris penjualan untuk ekspor Excel. */
export async function exportRows(db: Db, from: string, to: string) {
  return db
    .select({
      saleId: sales.id,
      date: sales.businessDate,
      createdAt: sales.createdAt,
      payment: sales.paymentMethod,
      status: sales.status,
      parentId: saleItems.parentId,
      name: saleItems.name,
      category: saleItems.category,
      kind: saleItems.kind,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
      unitHpp: saleItems.unitHpp,
      cashier: sql<string>`(select name from users where users.id = ${sales.userId})`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(and(gte(sales.businessDate, from), lte(sales.businessDate, to)))
    .orderBy(asc(sales.createdAt), asc(saleItems.id));
}
