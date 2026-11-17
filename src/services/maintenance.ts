import { inArray, isNotNull, sql } from "drizzle-orm";
import { cashMovements, ingredients, sales, shifts, stockChecks, stockMovements } from "@/db/schema";
import type { Db } from "@/db/types";
import { UserError } from "./errors";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Kembalikan stok yang terpakai oleh transaksi-transaksi ini lalu hapus riwayat stoknya.
 * Jumlah semua pergerakan stok sebuah transaksi = pemakaian bersihnya
 * (transaksi lunas: minus; transaksi yang sudah dibatalkan: 0 karena stoknya sudah kembali).
 */
async function restoreStockFor(tx: Tx, saleIds: number[] | "all") {
  const where = saleIds === "all" ? isNotNull(stockMovements.saleId) : inArray(stockMovements.saleId, saleIds);
  const used = await tx
    .select({ ingredientId: stockMovements.ingredientId, net: sql<number>`sum(${stockMovements.change})`.mapWith(Number) })
    .from(stockMovements)
    .where(where)
    .groupBy(stockMovements.ingredientId)
    .orderBy(stockMovements.ingredientId);
  for (const u of used) {
    if (u.net === 0) continue;
    await tx
      .update(ingredients)
      .set({ stock: sql`${ingredients.stock} - ${u.net}` })
      .where(sql`${ingredients.id} = ${u.ingredientId}`);
  }
  await tx.delete(stockMovements).where(where);
}

/** Hapus beberapa transaksi sekaligus (untuk data uji coba). Stok yang terpakai dikembalikan. */
export async function deleteSales(db: Db, saleIds: number[]) {
  const ids = [...new Set(saleIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (ids.length === 0) throw new UserError("Pilih transaksi yang mau dihapus.");
  return db.transaction(async (tx) => {
    await restoreStockFor(tx, ids);
    const deleted = await tx.delete(sales).where(inArray(sales.id, ids)).returning({ id: sales.id });
    return deleted.length;
  });
}

/**
 * Reset semua penjualan: hapus semua transaksi, shift kas, kas masuk/keluar, dan hasil cek tutup kas.
 * Stok yang terpakai penjualan dikembalikan. Menu, harga, stok (belanja & hitung ulang), pengguna,
 * dan pengaturan tidak berubah.
 */
export async function resetAllSales(db: Db) {
  return db.transaction(async (tx) => {
    await restoreStockFor(tx, "all");
    const deleted = await tx.delete(sales).returning({ id: sales.id });
    await tx.delete(cashMovements);
    await tx.delete(stockChecks);
    await tx.delete(shifts);
    return deleted.length;
  });
}
