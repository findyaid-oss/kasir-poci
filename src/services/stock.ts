import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { ingredients, stockMovements, type CheckStatus, type Ingredient } from "@/db/schema";
import type { Db } from "@/db/types";
import { UserError } from "./errors";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Mengubah stok beberapa bahan sekaligus dan mencatat riwayatnya.
 * Diurutkan berdasarkan id supaya dua transaksi bersamaan selalu mengunci baris dengan urutan yang sama
 * (mencegah deadlock). Stok boleh minus: penjualan tidak pernah ditolak hanya karena catatan stok belum diisi.
 */
export async function applyStockChanges(
  tx: Tx | Db,
  changes: Map<number, number>,
  meta: { reason: "jual" | "batal" | "belanja" | "koreksi"; saleId?: number; userId?: number; note?: string },
) {
  const ids = [...changes.keys()].sort((a, b) => a - b);
  for (const id of ids) {
    const change = changes.get(id)!;
    if (change === 0) continue;
    const [row] = await tx
      .update(ingredients)
      .set({ stock: sql`${ingredients.stock} + ${change}` })
      .where(eq(ingredients.id, id))
      .returning({ stock: ingredients.stock });
    if (!row) continue;
    await tx.insert(stockMovements).values({
      ingredientId: id,
      change,
      stockAfter: row.stock,
      reason: meta.reason,
      saleId: meta.saleId,
      userId: meta.userId,
      note: meta.note ?? "",
    });
  }
}

export async function listIngredients(db: Db, { includeInactive = false } = {}) {
  return db
    .select()
    .from(ingredients)
    .where(includeInactive ? undefined : eq(ingredients.isActive, true))
    .orderBy(asc(ingredients.sortOrder), asc(ingredients.id));
}

export function isLow(i: Pick<Ingredient, "tracking" | "stock" | "lowThreshold" | "checkStatus">): boolean {
  if (i.tracking === "manual") return i.checkStatus === "menipis" || i.checkStatus === "habis";
  return i.stock <= i.lowThreshold;
}

/** Bahan yang perlu dibeli: stok otomatis di bawah batas, atau hasil cek manual "menipis"/"habis". */
export async function listLowStock(db: Db) {
  return db
    .select()
    .from(ingredients)
    .where(
      and(
        eq(ingredients.isActive, true),
        or(
          and(eq(ingredients.tracking, "auto"), sql`${ingredients.stock} <= ${ingredients.lowThreshold}`),
          and(eq(ingredients.tracking, "manual"), inArray(ingredients.checkStatus, ["menipis", "habis"])),
        ),
      ),
    )
    .orderBy(asc(ingredients.stock), asc(ingredients.sortOrder));
}

/** Catat belanja: jumlah kemasan × isi per kemasan. Isi per kemasan diingat untuk belanja berikutnya. */
export async function addPurchase(
  db: Db,
  input: { ingredientId: number; packs: number; packSize: number; userId: number; note?: string },
) {
  if (!(input.packs > 0) || !(input.packSize > 0)) throw new UserError("Jumlah kemasan dan isi harus lebih dari 0.");
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(ingredients).where(eq(ingredients.id, input.ingredientId)).for("update");
    if (!item) throw new UserError("Bahan tidak ditemukan.");
    if (item.tracking !== "auto") throw new UserError(`${item.name} dicek manual, tidak dihitung angkanya.`);
    const added = round2(input.packs * input.packSize);
    await tx.update(ingredients).set({ packSize: input.packSize }).where(eq(ingredients.id, item.id));
    await applyStockChanges(tx, new Map([[item.id, added]]), {
      reason: "belanja",
      userId: input.userId,
      note: input.note || `${formatNum(input.packs)} × ${formatNum(input.packSize)} ${item.unit}`,
    });
    return { name: item.name, unit: item.unit, added, stock: round2(item.stock + added) };
  });
}

/** Hitung ulang stok: isi angka yang sebenarnya, selisihnya dicatat sebagai koreksi. */
export async function setStock(db: Db, input: { ingredientId: number; stock: number; userId: number; note?: string }) {
  if (!(input.stock >= 0)) throw new UserError("Stok tidak boleh minus.");
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(ingredients).where(eq(ingredients.id, input.ingredientId)).for("update");
    if (!item) throw new UserError("Bahan tidak ditemukan.");
    const change = round2(input.stock - item.stock);
    await applyStockChanges(tx, new Map([[item.id, change]]), {
      reason: "koreksi",
      userId: input.userId,
      note: input.note || "Hitung ulang stok",
    });
    return { name: item.name, change };
  });
}

export async function setCheckStatus(db: Db, ingredientId: number, status: CheckStatus, userId: number, now = new Date()) {
  await db
    .update(ingredients)
    .set({ checkStatus: status, checkedAt: now, checkedBy: userId })
    .where(and(eq(ingredients.id, ingredientId), eq(ingredients.tracking, "manual")));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function formatNum(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
}
