import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  ADMIN_COOKIE,
  ADMIN_MINUTES,
  SESSION_COOKIE,
  SESSION_DAYS,
  signAdminUnlock,
  signSession,
  verifyAdminUnlock,
  verifySession,
  type SessionPayload,
} from "./token";

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(ADMIN_COOKIE);
}

/** Buka kunci admin selama ADMIN_MINUTES menit (dipanggil setelah PIN pemilik benar). */
export async function unlockAdmin(userId: number) {
  (await cookies()).set(ADMIN_COOKIE, await signAdminUnlock(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_MINUTES * 60,
  });
}

export async function lockAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdminUnlocked(userId: number) {
  return (await verifyAdminUnlock((await cookies()).get(ADMIN_COOKIE)?.value)) === userId;
}

/**
 * Pengguna yang sedang login. Status aktif dan peran dicek ulang ke database,
 * jadi karyawan yang dinonaktifkan pemilik langsung tidak bisa memakai aplikasi.
 */
export async function getUser(): Promise<SessionPayload | null> {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!user || !user.isActive) return null;
  return { userId: user.id, name: user.name, role: user.role };
}

/** Wajib dipanggil di setiap halaman kasir DAN setiap server action. */
export async function requireUser(): Promise<SessionPayload> {
  const user = await getUser();
  if (!user) redirect("/masuk");
  return user;
}

/**
 * Hanya pemilik yang sudah memasukkan PIN lagi (kunci admin): rekap lengkap, stok, menu, harga, pengaturan.
 * Wajib dipanggil di setiap halaman admin DAN setiap server action admin.
 */
export async function requireOwner(): Promise<SessionPayload> {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/kasir");
  if (!(await isAdminUnlocked(user.userId))) redirect("/kunci-admin");
  return user;
}
