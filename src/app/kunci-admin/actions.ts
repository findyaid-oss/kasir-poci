"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { lockAdmin, requireUser, unlockAdmin } from "@/lib/auth/session";
import { UserError } from "@/services/errors";
import { verifyPin } from "@/services/users";

export async function unlockAdminAction(pin: string): Promise<{ error: string } | void> {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/kasir");
  if (typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) return { error: "PIN harus 4–6 angka." };
  try {
    await verifyPin(db, user.userId, pin);
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  await unlockAdmin(user.userId);
  redirect("/admin");
}

/** Kunci admin lagi dan kembali ke layar jualan. */
export async function lockAdminAction() {
  await lockAdmin();
  redirect("/kasir");
}
