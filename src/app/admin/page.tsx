import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CashList } from "@/components/cash-list";
import { SaleList } from "@/components/sale-list";
import { Badge, buttonClass, Card, Loading, Progress, Stat } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { CHECK_LABEL } from "@/lib/labels";
import { formatDateLong, formatQty, formatRupiah, isIsoDate, shiftDate, todayInBali } from "@/lib/time";
import { capitalProgress, dailyTotals, emptyDay, fixedCostDaily, getSettings, itemSummary } from "@/services/reports";
import { listCashMovements } from "@/services/cash";
import { listSales } from "@/services/sales";
import { listLowStock } from "@/services/stock";

export const metadata: Metadata = { title: "Rekap" };

export default function RekapPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<Loading label="Menghitung rekap…" />}>
      <Rekap searchParams={searchParams} />
    </Suspense>
  );
}

async function Rekap({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireOwner();
  const today = todayInBali();
  const raw = (await searchParams).tanggal;
  const date = isIsoDate(raw) && raw <= today ? raw : today;
  const isToday = date === today;

  const [[day = emptyDay(date)], items, settings, sales, low, cashRows] = await Promise.all([
    dailyTotals(db, date, date),
    itemSummary(db, date),
    getSettings(db),
    listSales(db, { businessDate: date }),
    listLowStock(db),
    listCashMovements(db, { businessDate: date }),
  ]);
  const cashIn = cashRows.filter((r) => r.type === "masuk").reduce((s, r) => s + r.amount, 0);
  const cashOut = cashRows.filter((r) => r.type === "keluar").reduce((s, r) => s + r.amount, 0);
  const capital = await capitalProgress(db, settings, today);

  const fixed = fixedCostDaily(settings);
  const net = day.labaKotor - fixed;
  const main = items.filter((i) => i.kind !== "topping");
  const tops = items.filter((i) => i.kind === "topping");
  const voided = sales.filter((s) => s.status === "batal").length;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{isToday ? "Rekap hari ini" : "Rekap"}</h1>
          <p className="text-kopi-muted">{formatDateLong(date)}</p>
        </div>
        <form className="flex items-center gap-1.5">
          <Link href={`/admin?tanggal=${shiftDate(date, -1)}`} className={buttonClass.small} aria-label="Hari sebelumnya">
            ‹
          </Link>
          <label htmlFor="tanggal" className="sr-only">
            Tanggal
          </label>
          <input id="tanggal" name="tanggal" type="date" max={today} defaultValue={date} className="rounded-xl border border-garis bg-white px-2 py-1.5 text-sm" />
          <button className={buttonClass.small}>Lihat</button>
          {!isToday ? (
            <Link href={`/admin?tanggal=${shiftDate(date, 1)}`} className={buttonClass.small} aria-label="Hari berikutnya">
              ›
            </Link>
          ) : null}
        </form>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Omzet" value={formatRupiah(day.omzet)} sub={`Tunai ${formatRupiah(day.tunai)} · QRIS ${formatRupiah(day.qris)}`} />
        <Stat label="Laba kotor" value={formatRupiah(day.labaKotor)} sub={`Modal (HPP) ${formatRupiah(day.hpp)}`} tone={day.labaKotor > 0 ? "ok" : undefined} />
        <Stat label="Minuman" value={`${day.cups} cup`} sub={`${day.transactions} transaksi`} />
        <Stat label="Makanan" value={`${day.porsi} porsi`} sub={voided ? `${voided} transaksi dibatalkan` : "Tidak ada pembatalan"} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Biaya tetap {isToday ? "hari ini" : "hari itu"}</h2>
          <p className="mb-3 text-sm text-kopi-muted">
            Sewa + listrik + keamanan ≈ {formatRupiah(fixed)} per hari
          </p>
          <Progress value={fixed > 0 ? day.labaKotor / fixed : 1} tone={net >= 0 ? "daun" : "teh"} />
          <p className={`mt-2 font-semibold ${net >= 0 ? "text-daun" : "text-kopi"}`}>
            {net >= 0 ? `✓ Tertutup. Untung bersih ± ${formatRupiah(net)}` : `Kurang ${formatRupiah(-net)} lagi untuk menutup biaya tetap`}
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Target harian</h2>
          <TargetRow label="Minuman" value={day.cups} target={settings.targetDrinks} unit="cup" />
          <div className="h-3" />
          <TargetRow label="Makanan" value={day.porsi} target={settings.targetFood} unit="porsi" />
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Terjual per menu</h2>
        {main.length === 0 ? (
          <p className="text-kopi-muted">Belum ada penjualan.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-kopi-muted">
                <tr className="border-b border-garis">
                  <th className="px-4 py-2 font-medium sm:px-0">Menu</th>
                  <th className="px-2 py-2 text-right font-medium">Terjual</th>
                  <th className="px-2 py-2 text-right font-medium">Omzet</th>
                  <th className="px-4 py-2 text-right font-medium sm:px-0">Laba kotor</th>
                </tr>
              </thead>
              <tbody className="num">
                {[...main, ...tops].map((i) => (
                  <tr key={i.name + i.kind} className="border-b border-garis/60 last:border-0">
                    <td className="px-4 py-2 sm:px-0">
                      {i.kind === "topping" ? <span className="text-teh">+ {i.name}</span> : i.name}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {i.qty} <span className="font-normal text-kopi-muted">{i.kind === "makanan" ? "porsi" : "cup"}</span>
                    </td>
                    <td className="px-2 py-2 text-right">{formatRupiah(i.omzet)}</td>
                    <td className="px-4 py-2 text-right sm:px-0">{formatRupiah(i.labaKotor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Balik modal</h2>
          <p className="mb-3 text-sm text-kopi-muted">
            {capital.startDate
              ? `${capital.days} hari sejak ${formatDateLong(capital.startDate)}`
              : "Mulai dihitung sejak penjualan pertama."}
          </p>
          <Progress value={capital.progress} tone="daun" />
          <dl className="mt-3 grid gap-1 text-sm">
            <Row label="Laba kotor terkumpul" value={formatRupiah(capital.labaKotor)} />
            <Row label="Dikurangi biaya tetap" value={`− ${formatRupiah(capital.biayaTetap)}`} />
            <Row label="Laba bersih" value={formatRupiah(capital.labaBersih)} bold />
            <Row label="Modal awal" value={formatRupiah(capital.modal)} />
          </dl>
          <p className="mt-2 text-sm font-medium">
            {capital.labaBersih >= capital.modal
              ? "🎉 Modal sudah kembali!"
              : capital.labaBersih > 0
                ? `${Math.floor(capital.progress * 100)}% modal sudah kembali`
                : "Belum mulai balik modal"}
          </p>
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">Perlu belanja</h2>
            <Link href="/admin/stok" className="text-sm text-teh underline underline-offset-4">
              Kelola stok
            </Link>
          </div>
          {low.length === 0 ? (
            <p className="text-sm text-daun">Semua stok aman 👍</p>
          ) : (
            <ul className="grid gap-1 text-sm">
              {low.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span>{l.name}</span>
                  {l.tracking === "manual" ? (
                    <Badge tone={l.checkStatus === "habis" ? "bad" : "warn"}>{CHECK_LABEL[l.checkStatus ?? "aman"]}</Badge>
                  ) : (
                    <span className={`num ${l.stock <= 0 ? "font-semibold text-cabai" : "text-kopi-muted"}`}>
                      {formatQty(l.stock)} {l.unit}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Kas masuk / keluar</h2>
          <p className="num text-sm">
            <span className="text-daun">+ {formatRupiah(cashIn)}</span> · <span className="text-cabai">− {formatRupiah(cashOut)}</span>
          </p>
        </div>
        <p className="mb-2 text-xs text-kopi-muted">Di luar penjualan, tidak mengubah omzet atau laba kotor di atas.</p>
        <CashList rows={cashRows} canDelete />
      </Card>

      <details className="rounded-2xl border border-garis bg-white p-4">
        <summary className="cursor-pointer font-semibold">Daftar transaksi ({sales.length})</summary>
        <div className="mt-3">
          <p className="mb-3 text-sm text-kopi-muted">
            Mau menghapus transaksi uji coba?{" "}
            <Link href={`/admin/transaksi?tanggal=${date}`} className="text-teh underline underline-offset-4">
              Buka halaman Transaksi
            </Link>
          </p>
          <SaleList sales={sales} canVoid />
        </div>
      </details>
    </div>
  );
}

function TargetRow({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const done = target > 0 && value >= target;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className={`num font-semibold ${done ? "text-daun" : ""}`}>
          {value} / {target} {unit} {done ? "✓" : ""}
        </span>
      </div>
      <Progress value={target > 0 ? value / target : 1} tone={done ? "daun" : "teh"} />
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <dt className={bold ? "" : "text-kopi-muted"}>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
