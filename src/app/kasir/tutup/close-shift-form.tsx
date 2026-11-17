"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { logout } from "@/app/masuk/actions";
import { parseRupiah } from "@/lib/money";
import { formatRupiah } from "@/lib/time";
import { closeShiftAction, type CloseResult } from "../actions";

type Status = "aman" | "menipis" | "habis";
const OPTIONS: { value: Status; label: string; on: string }[] = [
  { value: "aman", label: "Aman", on: "border-daun bg-daun text-white" },
  { value: "menipis", label: "Menipis", on: "border-kunyit bg-kunyit text-white" },
  { value: "habis", label: "Habis", on: "border-cabai bg-cabai text-white" },
];

export function CloseShiftForm({
  openingCash,
  cashSales,
  qrisSales,
  transactions,
  manual,
}: {
  openingCash: number;
  cashSales: number;
  qrisSales: number;
  transactions: number;
  manual: { id: number; name: string; last: Status | null }[];
}) {
  const [state, action, pending] = useActionState<CloseResult, FormData>(closeShiftAction, {});
  const [counted, setCounted] = useState("");
  const [checks, setChecks] = useState<Record<number, Status>>({});
  const expected = openingCash + cashSales;
  const countedNum = parseRupiah(counted);
  const diff = countedNum === null ? null : countedNum - expected;

  if (state.ok && state.summary) {
    const s = state.summary;
    return (
      <div className="grid gap-4">
        <div className="rounded-2xl border border-garis bg-white p-5">
          <p className="text-lg font-semibold">Kas sudah ditutup ✓</p>
          <dl className="mt-3 grid gap-1.5 text-sm">
            <Row label="Transaksi" value={String(s.transactions)} />
            <Row label="Total penjualan" value={formatRupiah(s.total)} />
            <Row label="Lewat QRIS" value={formatRupiah(s.qris)} />
            <Row label="Seharusnya di laci" value={formatRupiah(s.expectedCash)} />
            <Row label="Dihitung" value={formatRupiah(s.countedCash)} />
          </dl>
          <DiffNote diff={s.difference} />
        </div>
        <form action={logout}>
          <button className="press h-14 w-full rounded-2xl bg-teh text-lg font-semibold text-white">Selesai & keluar</button>
        </form>
        <Link href="/kasir" className="text-center text-sm text-teh underline underline-offset-4">
          Buka kas baru
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <section className="rounded-2xl border border-garis bg-white p-4">
        <h2 className="mb-2 font-semibold">1. Uang di laci</h2>
        <dl className="grid gap-1.5 text-sm">
          <Row label="Kas awal" value={formatRupiah(openingCash)} />
          <Row label={`Penjualan tunai (${transactions} transaksi total)`} value={`+ ${formatRupiah(cashSales)}`} />
          <Row label="Seharusnya ada di laci" value={formatRupiah(expected)} bold />
          <Row label="QRIS (tidak masuk laci)" value={formatRupiah(qrisSales)} muted />
        </dl>
        <label htmlFor="countedCash" className="mt-4 block text-sm font-medium">
          Uang yang benar-benar ada di laci
        </label>
        <div className="mt-1.5 flex items-center rounded-xl border border-garis px-3 focus-within:border-teh">
          <span className="text-kopi-muted">Rp</span>
          <input
            id="countedCash"
            name="countedCash"
            inputMode="numeric"
            required
            autoComplete="off"
            value={counted}
            onChange={(e) => {
              const n = parseRupiah(e.target.value);
              setCounted(n === null ? "" : new Intl.NumberFormat("id-ID").format(n));
            }}
            className="num w-full bg-transparent px-2 py-3 font-display text-2xl font-semibold outline-none"
          />
        </div>
        {diff !== null ? <DiffNote diff={diff} /> : null}
      </section>

      {manual.length ? (
        <section className="rounded-2xl border border-garis bg-white p-4">
          <h2 className="font-semibold">2. Cek bahan</h2>
          <p className="mb-3 text-sm text-kopi-muted">Lihat sisa bahan di kios, lalu pilih kondisinya.</p>
          <input type="hidden" name="checkCount" value={manual.length} />
          <div className="grid gap-3">
            {manual.map((m) => (
              <fieldset key={m.id}>
                <legend className="mb-1.5 text-sm font-medium">{m.name}</legend>
                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map((o) => {
                    const on = checks[m.id] === o.value;
                    return (
                      <label key={o.value} className={`press cursor-pointer rounded-xl border-2 py-2.5 text-center text-sm font-semibold ${on ? o.on : "border-garis"}`}>
                        <input
                          type="radio"
                          name={`cek-${m.id}`}
                          value={o.value}
                          checked={on}
                          onChange={() => setChecks((c) => ({ ...c, [m.id]: o.value }))}
                          className="sr-only"
                          required
                        />
                        {o.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <label htmlFor="note" className="text-sm font-medium">
          Catatan <span className="font-normal text-kopi-muted">(opsional)</span>
        </label>
        <textarea id="note" name="note" rows={2} maxLength={300} placeholder="mis. es batu tinggal sedikit" className="mt-1.5 w-full rounded-xl border border-garis bg-white px-3 py-2.5 outline-none focus:border-teh" />
      </section>

      {state.error ? (
        <p role="alert" className="rounded-xl bg-cabai-100 px-3 py-2 text-sm text-cabai">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending || countedNum === null} className="press h-14 rounded-2xl bg-teh text-lg font-semibold text-white disabled:opacity-40">
        {pending ? "Menutup kas…" : "Tutup kas"}
      </button>
    </form>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? "font-semibold" : ""} ${muted ? "text-kopi-muted" : ""}`}>
      <dt>{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function DiffNote({ diff }: { diff: number }) {
  if (diff === 0) return <p className="mt-3 rounded-xl bg-daun-100 px-3 py-2 text-sm font-medium text-daun">Pas, tidak ada selisih 👍</p>;
  return (
    <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${diff < 0 ? "bg-cabai-100 text-cabai" : "bg-kunyit-100 text-kopi"}`}>
      {diff < 0 ? `Kurang ${formatRupiah(-diff)}` : `Lebih ${formatRupiah(diff)}`} dari seharusnya.
    </p>
  );
}
