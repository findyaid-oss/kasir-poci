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
