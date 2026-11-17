import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { users, type User } from "@/db/schema";
import type { Db } from "@/db/types";
import { APP } from "@/lib/config";
import { UserError } from "./errors";

export function isValidPin(pin: string) {
  return /^\d{4,6}$/.test(pin);
}

export async function listUsers(db: Db, { onlyActive }: { onlyActive: boolean }) {
  return db
    .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive })
    .from(users)
    .where(onlyActive ? eq(users.isActive, true) : undefined)
    .orderBy(asc(users.role), asc(users.name));
}

export async function createUser(db: Db, input: { name: string; pin: string; role: User["role"] }) {
  const name = input.name.trim();
  if (name.length < 2) throw new UserError("Nama minimal 2 huruf.");
  if (!isValidPin(input.pin)) throw new UserError("PIN harus 4–6 angka.");
  const [user] = await db
    .insert(users)
    .values({ name, role: input.role, pinHash: await bcrypt.hash(input.pin, 10) })
    .returning();
  return user;
}

export async function resetPin(db: Db, userId: number, pin: string) {
  if (!isValidPin(pin)) throw new UserError("PIN harus 4–6 angka.");
  await db
    .update(users)
    .set({ pinHash: await bcrypt.hash(pin, 10), failedAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}

/**
 * Cek PIN. Setelah beberapa kali salah, akun dikunci beberapa menit
 * supaya PIN 4 digit tidak bisa ditebak satu per satu.
 */
export async function verifyPin(db: Db, userId: number, pin: string, now: Date = new Date()) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.isActive) throw new UserError("Pengguna tidak ditemukan.");

  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000);
    throw new UserError(`PIN salah terlalu sering. Coba lagi dalam ${minutes} menit.`);
  }

  const ok = await bcrypt.compare(pin, user.pinHash);
  if (!ok) {
    const attempts = user.failedAttempts + 1;
    const lock = attempts >= APP.maxPinAttempts;
    await db
      .update(users)
      .set({
        failedAttempts: lock ? 0 : attempts,
        lockedUntil: lock ? new Date(now.getTime() + APP.lockMinutes * 60_000) : null,
      })
      .where(eq(users.id, user.id));
    throw new UserError(
      lock
        ? `PIN salah ${APP.maxPinAttempts} kali. Akun dikunci ${APP.lockMinutes} menit.`
        : `PIN salah. Sisa ${APP.maxPinAttempts - attempts} percobaan.`,
    );
  }

  if (user.failedAttempts > 0 || user.lockedUntil) {
    await db.update(users).set({ failedAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  }
  return user;
}
