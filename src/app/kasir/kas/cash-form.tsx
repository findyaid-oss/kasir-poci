"use client";

import { useActionState, useState } from "react";
import { parseRupiah } from "@/lib/money";
import { formatRupiah } from "@/lib/time";
import { addCashAction, type ActionState } from "../actions";

const NOTES = {
  keluar: ["Beli es batu", "Beli gas", "Beli plastik", "Diambil pemilik"],
  masuk: ["Tambah uang kembalian", "Modal dari pemilik", "Tukar uang kecil"],
};

export function CashForm() {
  const [type, setType] = useState<"keluar" | "masuk">("keluar");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, formData) => {
    const res = await addCashAction(prev, formData);
    // Kosongkan isian setelah berhasil disimpan
    if (res.ok) {
      setAmount("");
      setNote("");
    }
    return res;
  }, {});
  const value = parseRupiah(amount);

  return (
    <form action={action} className="grid gap-3 rounded-2xl border border-garis bg-white p-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Jenis">
        {(["keluar", "masuk"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => setType(t)}
            className={`press h-12 rounded-xl border-2 font-semibold ${
              type === t ? (t === "keluar" ? "border-cabai bg-cabai text-white" : "border-daun bg-daun text-white") : "border-garis"
            }`}
          >
            {t === "keluar" ? "− Kas keluar" : "+ Kas masuk"}
          </button>
        ))}
      </div>

      <label htmlFor="amount" className="text-sm font-medium">
        Jumlah
      </label>
      <div className="-mt-2 flex items-center rounded-xl border border-garis px-3 focus-within:border-teh">
        <span className="text-kopi-muted">Rp</span>
        <input
          id="amount"
          name="amount"
          inputMode="numeric"
          autoComplete="off"
          required
          value={amount}
          onChange={(e) => {
            const n = parseRupiah(e.target.value);
            setAmount(n === null ? "" : new Intl.NumberFormat("id-ID").format(n));
          }}
          className="num w-full bg-transparent px-2 py-3 font-display text-2xl font-semibold outline-none"
        />
      </div>

      <label htmlFor="note" className="text-sm font-medium">
        Keterangan
      </label>
      <input
        id="note"
        name="note"
        required
        minLength={3}
        maxLength={120}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="mis. beli es batu"
        className="-mt-2 rounded-xl border border-garis px-3 py-2.5 outline-none focus:border-teh"
      />
      <div className="-mt-1 flex flex-wrap gap-1.5">
        {NOTES[type].map((n) => (
          <button key={n} type="button" onClick={() => setNote(n)} className="press rounded-full border border-garis px-3 py-1 text-sm hover:border-teh">
            {n}
          </button>
        ))}
      </div>

      {state.error ? <p className="text-sm text-cabai">{state.error}</p> : state.ok ? <p className="text-sm text-daun">✓ {state.message}</p> : null}
      <button
        disabled={pending || value === null || value <= 0}
        className={`press h-12 rounded-xl font-semibold text-white disabled:opacity-40 ${type === "keluar" ? "bg-cabai" : "bg-daun"}`}
      >
        {pending ? "Menyimpan…" : `Simpan kas ${type}${value ? ` · ${formatRupiah(value)}` : ""}`}
      </button>
    </form>
  );
}
