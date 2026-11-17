"use server";

import { refresh } from "next/cache";
import { db } from "@/db";
import { checkStatusEnum } from "@/db/schema";
import { requireUser } from "@/lib/auth/session";
import { parseRupiah } from "@/lib/money";
import { saleSchema } from "@/lib/validation";
import { UserError } from "@/services/errors";
import { addCashMovement, deleteCashMovement } from "@/services/cash";
import { createSale, voidSale } from "@/services/sales";
import { closeShift, getOpenShift, openShift } from "@/services/shifts";

export type ActionState = { error?: string; ok?: boolean; message?: string };

async function guard<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    console.error(e);
    return { error: "Terjadi kesalahan. Coba lagi, atau periksa koneksi internet." };
  }
}

/* ---------- Buka kas ---------- */

export async function openShiftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const cash = parseRupiah(formData.get("openingCash"));
  if (cash === null) return { error: "Isi jumlah uang di laci (boleh 0)." };
  const res = await guard(() => openShift(db, { userId: user.userId, openingCash: cash }));
  if ("error" in res) return res;
  refresh();
  return { ok: true };
}

/* ---------- Penjualan ---------- */

export type SaleResult = { ok: true; total: number; change: number | null; paymentMethod: "tunai" | "qris" } | { error: string };

export async function createSaleAction(payload: unknown): Promise<SaleResult> {
  const user = await requireUser();
  const parsed = saleSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Data pesanan tidak valid." };
  const res = await guard(() => createSale(db, { userId: user.userId, ...parsed.data }));
  if ("error" in res) return res;
  refresh();
  return { ok: true, total: res.total, change: res.change, paymentMethod: res.paymentMethod };
}

export async function voidSaleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const saleId = Number(formData.get("saleId"));
  const reason = String(formData.get("reason") ?? "");
  if (!Number.isInteger(saleId)) return { error: "Transaksi tidak valid." };
  const res = await guard(() => voidSale(db, { saleId, userId: user.userId, role: user.role, reason }));
  if ("error" in res) return res;
  refresh();
  return { ok: true, message: "Transaksi dibatalkan, stok dikembalikan." };
}

/* ---------- Kas masuk / keluar ---------- */

export async function addCashAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const type = formData.get("type") === "masuk" ? "masuk" : "keluar";
  const amount = parseRupiah(formData.get("amount"));
  if (amount === null) return { error: "Isi jumlah uang." };
  const res = await guard(() => addCashMovement(db, { userId: user.userId, type, amount, note: String(formData.get("note") ?? "") }));
  if ("error" in res) return res;
  refresh();
  return { ok: true, message: `Kas ${type} ${new Intl.NumberFormat("id-ID").format(amount)} dicatat.` };
}

export async function deleteCashAction(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const res = await guard(() => deleteCashMovement(db, { id, role: user.role }));
  if (!(res && typeof res === "object" && "error" in res)) refresh();
}

/* ---------- Tutup kas ---------- */

export type CloseResult = ActionState & {
  summary?: { expectedCash: number; countedCash: number; difference: number; total: number; qris: number; transactions: number };
};

export async function closeShiftAction(_prev: CloseResult, formData: FormData): Promise<CloseResult> {
  const user = await requireUser();
  const shift = await getOpenShift(db);
  if (!shift) return { error: "Tidak ada kas yang sedang dibuka." };

  const counted = parseRupiah(formData.get("countedCash"));
  if (counted === null) return { error: "Isi jumlah uang yang ada di laci sekarang." };

  const statuses = checkStatusEnum.enumValues as readonly string[];
  const checks: { ingredientId: number; status: (typeof checkStatusEnum.enumValues)[number] }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("cek-")) continue;
    const ingredientId = Number(key.slice(4));
    if (Number.isInteger(ingredientId) && statuses.includes(String(value))) {
      checks.push({ ingredientId, status: value as (typeof checkStatusEnum.enumValues)[number] });
    }
  }
  const expectedChecks = Number(formData.get("checkCount") ?? 0);
  if (checks.length < expectedChecks) return { error: "Lengkapi cek bahan: pilih Masih banyak, Setengah, atau Habis untuk setiap bahan." };

  const res = await guard(() =>
    closeShift(db, {
      shiftId: shift.id,
      userId: user.userId,
      countedCash: counted,
      checks,
      note: String(formData.get("note") ?? ""),
    }),
  );
  if ("error" in res) return res;
  return {
    ok: true,
    summary: {
      expectedCash: res.expectedCash,
      countedCash: counted,
      difference: res.difference,
      total: res.totals.total,
      qris: res.totals.qrisSales,
      transactions: res.totals.transactions,
    },
  };
}
