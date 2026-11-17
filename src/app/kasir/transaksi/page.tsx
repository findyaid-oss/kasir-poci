import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SaleList } from "@/components/sale-list";
import { buttonClass, Card, Loading, PageHeading, Stat } from "@/components/ui";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { formatRupiah } from "@/lib/time";
import { listSales } from "@/services/sales";
import { getOpenShift, shiftTotals } from "@/services/shifts";

export const metadata: Metadata = { title: "Transaksi shift ini" };

export default function TransaksiPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-5">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  await requireUser();
  const shift = await getOpenShift(db);
  if (!shift) {
    return (
      <div className="text-center">
        <PageHeading title="Transaksi">Kas belum dibuka.</PageHeading>
        <Link href="/kasir" className={buttonClass.primary}>
          Buka kas
        </Link>
      </div>
    );
  }
  const [sales, totals] = await Promise.all([listSales(db, { shiftId: shift.id }), shiftTotals(db, shift.id)]);

  // Jumlah per menu di shift ini (tanpa transaksi batal)
  const perMenu = new Map<string, number>();
  for (const s of sales) {
    if (s.status !== "lunas") continue;
    for (const i of s.items) perMenu.set(i.name, (perMenu.get(i.name) ?? 0) + i.qty);
  }

  return (
    <>
      <PageHeading title="Transaksi shift ini">Salah input? Tekan Batalkan, stok otomatis dikembalikan.</PageHeading>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Transaksi" value={totals.transactions} />
        <Stat label="Tunai" value={formatRupiah(totals.cashSales)} />
        <Stat label="QRIS" value={formatRupiah(totals.qrisSales)} />
      </div>
      {perMenu.size ? (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold">Terjual</h2>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {[...perMenu].sort((a, b) => b[1] - a[1]).map(([name, qty]) => (
              <li key={name} className="flex justify-between">
                <span>{name}</span>
                <span className="num font-semibold">{qty}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <SaleList sales={sales} canVoid />
    </>
  );
}
