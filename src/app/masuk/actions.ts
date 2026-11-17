"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { createSession, deleteSession } from "@/lib/auth/session";
import { UserError } from "@/services/errors";
import { verifyPin } from "@/services/users";

export async function loginWithPin(userId: number, pin: string): Promise<{ error: string } | void> {
  if (!Number.isInteger(userId) || typeof pin !== "string" || !/^\d{4,6}$/.test(pin)) {
    return { error: "PIN harus 4–6 angka." };
  }
  try {
    const user = await verifyPin(db, userId, pin);
    await createSession({ userId: user.id, name: user.name, role: user.role });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  redirect("/kasir");
}

export async function logout() {
  await deleteSession();
  redirect("/masuk");
}
