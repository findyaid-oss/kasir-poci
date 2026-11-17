import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { buttonClass, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { getOpenShift, shiftTotals } from "@/services/shifts";
import { listIngredients } from "@/services/stock";
import { CloseShiftForm } from "./close-shift-form";

export const metadata: Metadata = { title: "Tutup kas" };

export default function TutupPage() {
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
        <PageHeading title="Tutup kas">Tidak ada kas yang sedang dibuka.</PageHeading>
        <Link href="/kasir" className={buttonClass.primary}>
          Ke kasir
        </Link>
      </div>
    );
  }
  const [totals, ingredients] = await Promise.all([shiftTotals(db, shift.id), listIngredients(db)]);
  const manual = ingredients.filter((i) => i.tracking === "manual").map((i) => ({ id: i.id, name: i.name, last: i.checkStatus }));

  return (
    <>
      <PageHeading title="Tutup kas">Hitung uang di laci dan cek bahan sebelum pulang.</PageHeading>
      <CloseShiftForm openingCash={shift.openingCash} cashSales={totals.cashSales} qrisSales={totals.qrisSales} transactions={totals.transactions} manual={manual} />
    </>
  );
}
