import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  ingredients,
  menuItems,
  recipeItems,
  saleItems,
  sales,
  shifts,
  stockMovements,
  type MenuItem,
  type Sale,
} from "@/db/schema";
import type { Db } from "@/db/types";
import { todayInBali } from "@/lib/time";
import { UserError } from "./errors";
import { applyStockChanges, round2 } from "./stock";

export type CartLine = { menuItemId: number; qty: number; toppingIds: number[] };

export type SaleInput = {
  userId: number;
  lines: CartLine[];
  paymentMethod: "tunai" | "qris";
  /** Uang yang diterima dari pembeli (hanya untuk tunai). Kosong = uang pas. */
  cashReceived?: number | null;
};

/**
 * Mencatat satu penjualan: menyimpan transaksi, menyalin harga & HPP saat ini,
 * lalu memotong stok bahan sesuai resep. Semua dalam satu transaksi database,
 * jadi tidak mungkin penjualan tercatat tanpa stok terpotong (atau sebaliknya).
 */
export async function createSale(db: Db, input: SaleInput, now: Date = new Date()) {
  const lines = input.lines.filter((l) => l.qty > 0);
  if (lines.length === 0) throw new UserError("Pesanan masih kosong.");
  for (const l of lines) {
    if (!Number.isInteger(l.qty) || l.qty > 99) throw new UserError("Jumlah per menu harus 1–99.");
  }

  return db.transaction(async (tx) => {
    const [shift] = await tx.select().from(shifts).where(isNull(shifts.closedAt)).for("update");
    if (!shift) throw new UserError("Kas belum dibuka. Buka kas dulu sebelum mencatat penjualan.");

    const ids = [...new Set(lines.flatMap((l) => [l.menuItemId, ...l.toppingIds]))];
    const menu = await tx.select().from(menuItems).where(inArray(menuItems.id, ids));
    const byId = new Map(menu.map((m) => [m.id, m]));

    const priced: { item: MenuItem; qty: number; toppings: MenuItem[] }[] = lines.map((l) => {
      const item = byId.get(l.menuItemId);
      if (!item || !item.isActive || item.kind === "topping") throw new UserError("Ada menu yang sudah tidak tersedia.");
      const toppings = [...new Set(l.toppingIds)].map((tid) => {
        const t = byId.get(tid);
        if (!t || !t.isActive || t.kind !== "topping") throw new UserError("Ada topping yang sudah tidak tersedia.");
        if (item.kind !== "minuman") throw new UserError(`Topping hanya untuk minuman, bukan ${item.name}.`);
        return t;
      });
      return { item, qty: l.qty, toppings };
    });

    let total = 0;
    let hppTotal = 0;
    for (const p of priced) {
      total += p.qty * (p.item.price + p.toppings.reduce((s, t) => s + t.price, 0));
      hppTotal += p.qty * (p.item.hpp + p.toppings.reduce((s, t) => s + t.hpp, 0));
    }

    let cashReceived: number | null = null;
    let change: number | null = null;
    if (input.paymentMethod === "tunai") {
      cashReceived = input.cashReceived ?? total;
      if (cashReceived < total) throw new UserError("Uang yang diterima kurang dari total.");
      change = cashReceived - total;
    }

    const [sale] = await tx
      .insert(sales)
      .values({
        shiftId: shift.id,
        userId: input.userId,
        businessDate: todayInBali(now),
        createdAt: now,
        paymentMethod: input.paymentMethod,
        total,
        hppTotal,
        cashReceived,
        change,
      })
      .returning();

    for (const p of priced) {
      const [parent] = await tx
        .insert(saleItems)
        .values(snapshot(sale.id, p.item, p.qty, null))
        .returning({ id: saleItems.id });
      if (p.toppings.length) {
        await tx.insert(saleItems).values(p.toppings.map((t) => snapshot(sale.id, t, p.qty, parent.id)));
      }
    }

    // Pemakaian bahan = resep × jumlah, untuk menu utama dan toppingnya. Hanya bahan yang dihitung otomatis.
    const qtyByMenu = new Map<number, number>();
    for (const p of priced) {
      qtyByMenu.set(p.item.id, (qtyByMenu.get(p.item.id) ?? 0) + p.qty);
      for (const t of p.toppings) qtyByMenu.set(t.id, (qtyByMenu.get(t.id) ?? 0) + p.qty);
    }
    const recipes = await tx
      .select({ menuItemId: recipeItems.menuItemId, ingredientId: recipeItems.ingredientId, qty: recipeItems.qty })
      .from(recipeItems)
      .innerJoin(ingredients, eq(recipeItems.ingredientId, ingredients.id))
      .where(and(inArray(recipeItems.menuItemId, [...qtyByMenu.keys()]), eq(ingredients.tracking, "auto")));

    const usage = new Map<number, number>();
    for (const r of recipes) {
      usage.set(r.ingredientId, round2((usage.get(r.ingredientId) ?? 0) - r.qty * qtyByMenu.get(r.menuItemId)!));
    }
    await applyStockChanges(tx, usage, { reason: "jual", saleId: sale.id, userId: input.userId });

    return sale;
  });
}

function snapshot(saleId: number, item: MenuItem, qty: number, parentId: number | null) {
  return {
    saleId,
    parentId,
    menuItemId: item.id,
    name: item.name,
    category: item.category,
    kind: item.kind,
    qty,
    unitPrice: item.price,
    unitHpp: item.hpp,
  };
}

/**
 * Membatalkan penjualan dan mengembalikan stok yang terpakai.
 * Karyawan hanya boleh membatalkan transaksi di shift yang masih terbuka; pemilik boleh kapan saja.
 */
export async function voidSale(
  db: Db,
  input: { saleId: number; userId: number; role: "owner" | "staff"; reason: string },
  now: Date = new Date(),
): Promise<Sale> {
  const reason = input.reason.trim();
  if (reason.length < 3) throw new UserError("Tulis alasan pembatalan.");

  return db.transaction(async (tx) => {
    const [sale] = await tx.select().from(sales).where(eq(sales.id, input.saleId)).for("update");
    if (!sale) throw new UserError("Transaksi tidak ditemukan.");
    if (sale.status === "batal") throw new UserError("Transaksi ini sudah dibatalkan.");

    if (input.role !== "owner") {
      const [shift] = await tx.select().from(shifts).where(eq(shifts.id, sale.shiftId));
      if (!shift || shift.closedAt) throw new UserError("Kas shift ini sudah ditutup. Minta pemilik untuk membatalkan.");
    }

    const used = await tx
      .select({ ingredientId: stockMovements.ingredientId, change: stockMovements.change })
      .from(stockMovements)
      .where(and(eq(stockMovements.saleId, sale.id), eq(stockMovements.reason, "jual")));
    const restore = new Map<number, number>();
    for (const m of used) restore.set(m.ingredientId, round2((restore.get(m.ingredientId) ?? 0) - m.change));
    await applyStockChanges(tx, restore, { reason: "batal", saleId: sale.id, userId: input.userId, note: reason });

    const [updated] = await tx
      .update(sales)
      .set({ status: "batal", voidReason: reason, voidedAt: now, voidedBy: input.userId })
      .where(eq(sales.id, sale.id))
      .returning();
    return updated;
  });
}

export type SaleWithItems = Sale & {
  items: { id: number; parentId: number | null; name: string; kind: string; qty: number; unitPrice: number }[];
};

export async function listSales(
  db: Db,
  where: { shiftId?: number; businessDate?: string },
): Promise<SaleWithItems[]> {
  const rows = await db
    .select()
    .from(sales)
    .where(
      and(
        where.shiftId ? eq(sales.shiftId, where.shiftId) : undefined,
        where.businessDate ? eq(sales.businessDate, where.businessDate) : undefined,
      ),
    )
    .orderBy(desc(sales.createdAt), desc(sales.id));
  if (rows.length === 0) return [];
  const items = await db
    .select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      parentId: saleItems.parentId,
      name: saleItems.name,
      kind: saleItems.kind,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
    })
    .from(saleItems)
    .where(
      inArray(
        saleItems.saleId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(saleItems.id));
  return rows.map((r) => ({ ...r, items: items.filter((i) => i.saleId === r.id) }));
}
