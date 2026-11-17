import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass, Card, Loading, PageHeading, Stat } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { daysInclusive, formatDateShort, formatRupiah, isIsoDate, shiftDate, todayInBali } from "@/lib/time";
import { dailyTotals, fixedCostDaily, getSettings } from "@/services/reports";

export const metadata: Metadata = { title: "Riwayat" };

export default function RiwayatPage({ searchParams }: PageProps<"/admin/riwayat">) {
  return (
    <Suspense fallback={<Loading />}>
      <Riwayat searchParams={searchParams} />
    </Suspense>
  );
}

async function Riwayat({ searchParams }: { searchParams: PageProps<"/admin/riwayat">["searchParams"] }) {
  await requireOwner();
  const today = todayInBali();
  const sp = await searchParams;
  const to = isIsoDate(sp.sampai) ? sp.sampai : today;
  const from = isIsoDate(sp.dari) && sp.dari <= to ? sp.dari : shiftDate(to, -29);

  const [days, settings] = await Promise.all([dailyTotals(db, from, to), getSettings(db)]);
  const fixed = fixedCostDaily(settings);
  const sum = days.reduce(
    (a, d) => ({ omzet: a.omzet + d.omzet, labaKotor: a.labaKotor + d.labaKotor, cups: a.cups + d.cups, porsi: a.porsi + d.porsi }),
    { omzet: 0, labaKotor: 0, cups: 0, porsi: 0 },
  );
  const span = daysInclusive(from, to);
  const fixedTotal = fixed * span;

  return (
    <>
      <PageHeading title="Riwayat penjualan">Pilih rentang tanggal, ketuk satu hari untuk melihat detailnya.</PageHeading>

      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          Dari
          <input type="date" name="dari" defaultValue={from} max={today} className="rounded-xl border border-garis bg-white px-2 py-1.5" />
        </label>
        <label className="grid gap-1 text-sm">
          Sampai
          <input type="date" name="sampai" defaultValue={to} max={today} className="rounded-xl border border-garis bg-white px-2 py-1.5" />
        </label>
        <button className={buttonClass.small}>Tampilkan</button>
        <a href={`/admin/ekspor?dari=${from}&sampai=${to}`} className={`${buttonClass.small} ml-auto`}>
          ⬇ Ekspor Excel
        </a>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Omzet" value={formatRupiah(sum.omzet)} sub={`${span} hari`} />
        <Stat label="Laba kotor" value={formatRupiah(sum.labaKotor)} />
        <Stat
          label="Setelah biaya tetap"
          value={formatRupiah(sum.labaKotor - fixedTotal)}
          sub={`Biaya tetap ${span} hari ${formatRupiah(fixedTotal)}`}
          tone={sum.labaKotor - fixedTotal >= 0 ? "ok" : "bad"}
        />
        <Stat label="Terjual" value={`${sum.cups} cup`} sub={`${sum.porsi} porsi makanan`} />
      </div>

      <Card className="p-0 sm:p-0">
        {days.length === 0 ? (
          <p className="p-6 text-center text-kopi-muted">Tidak ada penjualan di rentang ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-kopi-muted">
                <tr className="border-b border-garis">
                  <th className="px-4 py-2.5 font-medium">Tanggal</th>
                  <th className="px-2 py-2.5 text-right font-medium">Cup</th>
                  <th className="px-2 py-2.5 text-right font-medium">Porsi</th>
                  <th className="px-2 py-2.5 text-right font-medium">Omzet</th>
                  <th className="px-2 py-2.5 text-right font-medium">Laba kotor</th>
                  <th className="px-4 py-2.5 text-right font-medium">Biaya tetap</th>
                </tr>
              </thead>
              <tbody className="num">
                {days.map((d) => {
                  const covered = d.labaKotor >= fixed;
                  return (
                    <tr key={d.date} className="border-b border-garis/60 last:border-0 hover:bg-teh-50">
                      <td className="px-4 py-2.5">
                        <Link href={`/admin?tanggal=${d.date}`} className="font-medium text-teh underline-offset-4 hover:underline">
                          {formatDateShort(d.date)}
                        </Link>
                      </td>
                      <td className="px-2 py-2.5 text-right">{d.cups}</td>
                      <td className="px-2 py-2.5 text-right">{d.porsi}</td>
                      <td className="px-2 py-2.5 text-right">{formatRupiah(d.omzet)}</td>
                      <td className="px-2 py-2.5 text-right font-semibold">{formatRupiah(d.labaKotor)}</td>
                      <td className={`px-4 py-2.5 text-right ${covered ? "text-daun" : "text-cabai"}`}>
                        {covered ? "✓ tertutup" : `kurang ${formatRupiah(fixed - d.labaKotor)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
