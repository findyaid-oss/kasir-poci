import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

/**
 * Pemeriksaan awal: yang belum login diarahkan ke halaman masuk.
 * Pemeriksaan sesungguhnya (termasuk peran pemilik/karyawan) tetap dilakukan requireUser()/requireOwner() di server.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? "/kasir" : "/masuk", request.url));
  }
  if (!session) return NextResponse.redirect(new URL("/masuk", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/kasir/:path*", "/admin/:path*", "/kunci-admin"],
};
