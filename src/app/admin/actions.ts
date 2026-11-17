"use server";

import { eq, not } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { checkStatusEnum, ingredients, menuItems, settings, users } from "@/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { decimal, fieldErrors, ingredientSchema, menuSchema, settingsSchema } from "@/lib/validation";
import { saveMenuItem } from "@/services/catalog";
import { UserError } from "@/services/errors";
import { addPurchase, setCheckStatus, setStock } from "@/services/stock";
import { createUser, resetPin } from "@/services/users";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
};

async function run(fn: () => Promise<string | void>): Promise<FormState> {
  try {
    const message = await fn();
    refresh();
    return { ok: true, message: message ?? "Tersimpan." };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    if (String((e as { cause?: unknown })?.cause ?? e).includes("unique")) return { error: "Nama itu sudah dipakai." };
    console.error(e);
    return { error: "Gagal menyimpan. Coba lagi." };
  }
}

const num = (label: string, v: FormDataEntryValue | null) => {
  const r = decimal(label).safeParse(v);
  if (!r.success) throw new UserError(r.error.issues[0].message);
  return r.data;
};

/* ---------- Stok ---------- */

export async function addPurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireOwner();
  return run(async () => {
    const res = await addPurchase(db, {
      ingredientId: Number(formData.get("ingredientId")),
      packs: num("jumlah kemasan", formData.get("packs")),
      packSize: num("isi per kemasan", formData.get("packSize")),
      userId: owner.userId,
    });
    return `+${fmt(res.added)} ${res.unit} ${res.name}. Stok sekarang ${fmt(res.stock)} ${res.unit}.`;
  });
}

export async function setStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const owner = await requireOwner();
  return run(async () => {
    const res = await setStock(db, {
      ingredientId: Number(formData.get("ingredientId")),
      stock: num("stok sebenarnya", formData.get("stock")),
      userId: owner.userId,
      note: String(formData.get("note") ?? ""),
    });
    return `Stok ${res.name} diperbarui (${res.change >= 0 ? "+" : ""}${fmt(res.change)}).`;
  });
}

export async function updateIngredientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  return run(async () => {
    const id = Number(formData.get("ingredientId"));
    await db
      .update(ingredients)
      .set({
        lowThreshold: num("batas peringatan", formData.get("lowThreshold")),
        packLabel: String(formData.get("packLabel") ?? "kemasan").trim().slice(0, 30) || "kemasan",
        isActive: formData.get("isActive") === "on",
      })
      .where(eq(ingredients.id, id));
    return "Pengaturan bahan disimpan.";
  });
}

export async function createIngredientAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = ingredientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return run(async () => {
    await db.insert(ingredients).values({
      ...parsed.data,
      checkStatus: parsed.data.tracking === "manual" ? "aman" : null,
      sortOrder: 999,
    });
    return `${parsed.data.name} ditambahkan.`;
  });
}

export async function setCheckStatusAction(formData: FormData) {
  const owner = await requireOwner();
  const status = String(formData.get("status"));
  if (!(checkStatusEnum.enumValues as readonly string[]).includes(status)) return;
  await setCheckStatus(db, Number(formData.get("ingredientId")), status as (typeof checkStatusEnum.enumValues)[number], owner.userId);
  refresh();
}

/* ---------- Menu ---------- */

export async function saveMenuAction(payload: unknown, id?: number): Promise<FormState> {
  await requireOwner();
  const parsed = menuSchema.safeParse(payload);
  if (!parsed.success) return { errors: fieldErrors(parsed.error), error: "Periksa isian yang ditandai." };
  const res = await run(async () => {
    await saveMenuItem(db, parsed.data, id);
  });
  // Kembali ke daftar menu dengan data terbaru (redirect dari server action selalu memuat ulang halaman tujuan).
  if (res.ok) redirect("/admin/menu");
  return res;
}

export async function toggleMenuAction(formData: FormData) {
  await requireOwner();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .update(menuItems)
    .set({ isActive: not(menuItems.isActive) })
    .where(eq(menuItems.id, id));
  refresh();
}

/* ---------- Pengaturan ---------- */

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  return run(async () => {
    const { startDate, ...rest } = parsed.data;
    await db
      .update(settings)
      .set({ ...rest, startDate: startDate || null })
      .where(eq(settings.id, 1));
    return "Pengaturan disimpan.";
  });
}

export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  return run(async () => {
    const role = formData.get("role") === "owner" ? "owner" : "staff";
    const user = await createUser(db, { name: String(formData.get("name") ?? ""), pin: String(formData.get("pin") ?? ""), role });
    return `${user.name} bisa masuk dengan PIN-nya.`;
  });
}

export async function resetPinAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  return run(async () => {
    await resetPin(db, Number(formData.get("userId")), String(formData.get("pin") ?? ""));
    return "PIN diganti.";
  });
}

export async function toggleUserAction(formData: FormData) {
  const owner = await requireOwner();
  const id = Number(formData.get("userId"));
  if (!Number.isInteger(id) || id === owner.userId) return; // tidak bisa menonaktifkan diri sendiri
  await db
    .update(users)
    .set({ isActive: not(users.isActive) })
    .where(eq(users.id, id));
  refresh();
}

function fmt(n: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
}
