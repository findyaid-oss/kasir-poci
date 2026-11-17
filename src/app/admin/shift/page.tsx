import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Card, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { formatDateTime, formatRupiah, formatTime } from "@/lib/time";
import { listShiftChecks, listShifts } from "@/services/shifts";

export const metadata: Metadata = { title: "Shift kas" };

export default function ShiftPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Shifts />
    </Suspense>
  );
}

async function Shifts() {
  await requireOwner();
  const shifts = await listShifts(db, 60);
  const checks = await Promise.all(shifts.map((s) => (s.closedAt ? listShiftChecks(db, s.id) : Promise.resolve([]))));

  return (
    <>
      <PageHeading title="Shift kas">Setiap buka–tutup kas: uang di laci, selisih, dan hasil cek bahan dari karyawan.</PageHeading>
      {shifts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-garis p-6 text-center text-kopi-muted">Belum ada shift.</p>
      ) : (
        <div className="grid gap-3">
          {shifts.map((s, idx) => {
            const diff = s.countedCash !== null && s.expectedCash !== null ? s.countedCash - s.expectedCash : null;
            const problems = checks[idx].filter((c) => c.status !== "aman");
            return (
              <Card key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {formatDateTime(s.openedAt)} – {s.closedAt ? formatTime(s.closedAt) : <Badge tone="ok">masih buka</Badge>}
                    </p>
                    <p className="text-sm text-kopi-muted">
                      Dibuka {s.openedByName}
                      {s.closedByName ? ` · ditutup ${s.closedByName}` : ""} · {s.totals.transactions} transaksi
                      {s.totals.voided ? ` · ${s.totals.voided} batal` : ""}
                    </p>
                  </div>
                  {diff === null ? null : diff === 0 ? (
                    <Badge tone="ok">Kas pas</Badge>
                  ) : (
                    <Badge tone={diff < 0 ? "bad" : "warn"}>
                      {diff < 0 ? "Kurang" : "Lebih"} {formatRupiah(Math.abs(diff))}
                    </Badge>
                  )}
                </div>
                <dl className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <Item label="Kas awal" value={formatRupiah(s.openingCash)} />
                  <Item label="Penjualan tunai" value={formatRupiah(s.totals.cashSales)} />
                  <Item label="QRIS" value={formatRupiah(s.totals.qrisSales)} />
                  <Item
                    label="Seharusnya / dihitung"
                    value={s.closedAt ? `${formatRupiah(s.expectedCash ?? 0)} / ${formatRupiah(s.countedCash ?? 0)}` : "—"}
                  />
                </dl>
                {problems.length ? (
                  <p className="mt-2 text-sm">
                    Cek bahan:{" "}
                    {problems.map((c) => (
                      <span key={c.name} className="mr-1">
                        <Badge tone={c.status === "habis" ? "bad" : "warn"}>
                          {c.name} {c.status}
                        </Badge>
                      </span>
                    ))}
                  </p>
                ) : s.closedAt && checks[idx].length ? (
                  <p className="mt-2 text-sm text-daun">Cek bahan: semua aman</p>
                ) : null}
                {s.note ? <p className="mt-2 text-sm text-kopi-muted">Catatan: {s.note}</p> : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-kopi-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
