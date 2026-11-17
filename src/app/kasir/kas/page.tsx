import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CashList } from "@/components/cash-list";
import { buttonClass, Card, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { formatRupiah } from "@/lib/time";
import { listCashMovements } from "@/services/cash";
import { expectedDrawer, getOpenShift, shiftTotals } from "@/services/shifts";
import { CashForm } from "./cash-form";

export const metadata: Metadata = { title: "Kas masuk / keluar" };

export default function KasPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-5">
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
        <PageHeading title="Kas masuk / keluar">Kas belum dibuka.</PageHeading>
        <Link href="/kasir" className={buttonClass.primary}>
          Buka kas
        </Link>
      </div>
    );
  }
  const [rows, totals] = await Promise.all([listCashMovements(db, { shiftId: shift.id }), shiftTotals(db, shift.id)]);

  return (
    <>
      <PageHeading title="Kas masuk / keluar">Uang yang keluar atau masuk laci selain dari jualan.</PageHeading>
      <CashForm />
      <Card className="mt-4">
        <dl className="num grid gap-1 text-sm">
          <Row label="Kas awal" value={formatRupiah(shift.openingCash)} />
          <Row label="Jualan tunai" value={`+ ${formatRupiah(totals.cashSales)}`} />
          <Row label="Kas masuk" value={`+ ${formatRupiah(totals.cashIn)}`} />
          <Row label="Kas keluar" value={`− ${formatRupiah(totals.cashOut)}`} />
          <div className="mt-1 flex justify-between border-t border-garis pt-2 font-semibold">
            <dt>Seharusnya ada di laci</dt>
            <dd>{formatRupiah(expectedDrawer(shift.openingCash, totals))}</dd>
          </div>
        </dl>
      </Card>
      <Card className="mt-4">
        <h2 className="mb-1 font-semibold">Catatan shift ini</h2>
        <CashList rows={rows} canDelete />
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-kopi-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
