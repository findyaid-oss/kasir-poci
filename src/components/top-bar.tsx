import { db } from "@/db";
import { lockAdminAction } from "@/app/kunci-admin/actions";
import { logout } from "@/app/masuk/actions";
import { requireUser } from "@/lib/auth/session";
import { formatTime } from "@/lib/time";
import { getSettings } from "@/services/reports";
import { getOpenShift } from "@/services/shifts";
import { NavLinks } from "./nav-links";

/** Bilah atas untuk semua halaman: nama kios, status kas, navigasi, dan tombol keluar. */
export async function TopBar({ area }: { area: "kasir" | "admin" }) {
  const user = await requireUser();
  const [shift, settings] = await Promise.all([getOpenShift(db), getSettings(db)]);

  const links =
    area === "kasir"
      ? [
          { href: "/kasir", label: "Jual" },
          { href: "/kasir/transaksi", label: "Transaksi" },
          { href: "/kasir/kas", label: "Kas" },
          { href: "/kasir/tutup", label: "Tutup kas" },
          ...(user.role === "owner" ? [{ href: "/admin", label: "🔒 Admin" }] : []),
        ]
      : [
          { href: "/admin", label: "Rekap" },
          { href: "/admin/riwayat", label: "Riwayat" },
          { href: "/admin/stok", label: "Stok" },
          { href: "/admin/menu", label: "Menu" },
          { href: "/admin/shift", label: "Shift kas" },
          { href: "/admin/transaksi", label: "Transaksi" },
          { href: "/admin/pengaturan", label: "Pengaturan" },
        ];

  return (
    <header className="sticky top-0 z-30 border-b border-garis bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight font-semibold">{settings.businessName}</p>
          <p className="truncate text-xs text-kopi-muted">
            {user.name} ·{" "}
            {shift ? (
              <span className="text-daun">
                Kas buka {formatTime(shift.openedAt)} ({shift.openedByName})
              </span>
            ) : (
              <span className="text-cabai">Kas belum dibuka</span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {area === "admin" ? (
            <form action={lockAdminAction}>
              <button className="press rounded-xl bg-kopi px-3 py-1.5 text-sm font-medium text-white">🔒 Ke kasir</button>
            </form>
          ) : null}
          <form action={logout}>
            <button className="press rounded-xl border border-garis px-3 py-1.5 text-sm text-kopi-muted hover:text-cabai">Keluar</button>
          </form>
        </div>
      </div>
      <NavLinks links={links} />
    </header>
  );
}
