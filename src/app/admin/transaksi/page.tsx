import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass, Card, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { formatDateLong, isIsoDate, shiftDate, todayInBali } from "@/lib/time";
import { listSales } from "@/services/sales";
import { ResetAllForm, SaleTable } from "./forms";

export const metadata: Metadata = { title: "Transaksi" };

export default function TransaksiAdminPage({ searchParams }: PageProps<"/admin/transaksi">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/transaksi">["searchParams"] }) {
  await requireOwner();
  const today = todayInBali();
  const raw = (await searchParams).tanggal;
  const date = isIsoDate(raw) && raw <= today ? raw : today;
  const sales = await listSales(db, { businessDate: date });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <PageHeading title="Transaksi">
        Hapus transaksi uji coba, atau reset semua penjualan sebelum mulai jualan sungguhan. Stok yang terpakai otomatis dikembalikan.
      </PageHeading>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{formatDateLong(date)}</p>
        <form className="flex items-center gap-1.5">
          <Link href={`/admin/transaksi?tanggal=${shiftDate(date, -1)}`} className={buttonClass.small} aria-label="Hari sebelumnya">
            ‹
          </Link>
          <label htmlFor="tanggal" className="sr-only">
            Tanggal
          </label>
          <input id="tanggal" name="tanggal" type="date" max={today} defaultValue={date} className="rounded-xl border border-garis bg-white px-2 py-1.5 text-sm" />
          <button className={buttonClass.small}>Lihat</button>
          {date !== today ? (
            <Link href={`/admin/transaksi?tanggal=${shiftDate(date, 1)}`} className={buttonClass.small} aria-label="Hari berikutnya">
              ›
            </Link>
          ) : null}
        </form>
      </div>

      <SaleTable key={date} sales={sales.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))} />

      <Card className="border-cabai/40">
        <h2 className="font-semibold text-cabai">Reset semua penjualan</h2>
        <p className="mt-1 mb-3 text-sm text-kopi-muted">
          Menghapus <b>semua</b> transaksi di semua tanggal, semua shift kas, dan kas masuk/keluar. Stok yang terpakai penjualan dikembalikan.
          Menu, harga, stok belanja/hitung ulang, pengguna, dan pengaturan <b>tidak</b> berubah. Tidak bisa dibatalkan.
        </p>
        <ResetAllForm />
      </Card>
    </div>
  );
}
