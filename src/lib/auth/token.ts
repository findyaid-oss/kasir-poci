import { jwtVerify, SignJWT } from "jose";

/** Dipakai bersama oleh proxy.ts dan server, jadi tidak boleh mengimpor modul khusus Node. */
export const SESSION_COOKIE = "kp_session";
export const SESSION_DAYS = 14;

export type SessionPayload = { userId: number; name: string; role: "owner" | "staff" };

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET harus diisi minimal 32 karakter. Lihat .env.example.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "number" || (payload.role !== "owner" && payload.role !== "staff")) return null;
    return { userId: payload.userId, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

/* ---------- Kunci admin: pemilik harus memasukkan PIN lagi untuk membuka halaman Admin ---------- */

export const ADMIN_COOKIE = "kp_admin";
export const ADMIN_MINUTES = 30;

export async function signAdminUnlock(userId: number): Promise<string> {
  return new SignJWT({ userId, purpose: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_MINUTES}m`)
    .sign(secretKey());
}

/** userId pemilik yang sedang membuka admin, atau null kalau terkunci / kedaluwarsa. */
export async function verifyAdminUnlock(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<{ userId: number; purpose: string }>(token, secretKey(), { algorithms: ["HS256"] });
    return payload.purpose === "admin" && typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}
