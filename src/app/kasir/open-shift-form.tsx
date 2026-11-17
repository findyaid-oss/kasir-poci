"use client";

import { useActionState, useState } from "react";
import { formatRupiah } from "@/lib/time";
import { parseRupiah } from "@/lib/money";
import { openShiftAction, type ActionState } from "./actions";

const QUICK = [0, 50_000, 100_000, 150_000, 200_000];

export function OpenShiftForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(openShiftAction, {});
  const [value, setValue] = useState("");
  const amount = parseRupiah(value);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-8">
      <h1 className="font-display text-2xl font-semibold">Halo, {name} 👋</h1>
      <p className="mt-1 text-kopi-muted">Sebelum mulai jualan, hitung dulu uang yang ada di laci.</p>

      <form action={action} className="mt-6 grid gap-4">
        <label htmlFor="openingCash" className="text-sm font-medium">
          Uang di laci sekarang
        </label>
        <div className="flex items-center rounded-2xl border border-garis bg-white px-4 focus-within:border-teh focus-within:ring-2 focus-within:ring-teh/20">
          <span className="text-lg text-kopi-muted">Rp</span>
          <input
            id="openingCash"
            name="openingCash"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            value={value}
            onChange={(e) => {
              const n = parseRupiah(e.target.value);
              setValue(n === null ? "" : new Intl.NumberFormat("id-ID").format(n));
            }}
            className="num w-full bg-transparent px-2 py-4 font-display text-3xl font-semibold outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setValue(new Intl.NumberFormat("id-ID").format(q))}
              className="press rounded-xl border border-garis bg-white px-3 py-2 text-sm font-medium hover:border-teh"
            >
              {q === 0 ? "Kosong" : formatRupiah(q)}
            </button>
          ))}
        </div>
        {state.error ? <p className="text-sm text-cabai">{state.error}</p> : null}
        <button disabled={pending || amount === null} className="press mt-2 h-14 rounded-2xl bg-teh text-lg font-semibold text-white disabled:opacity-40">
          {pending ? "Membuka kas…" : `Buka kas${amount !== null ? ` · ${formatRupiah(amount)}` : ""}`}
        </button>
      </form>
    </main>
  );
}
