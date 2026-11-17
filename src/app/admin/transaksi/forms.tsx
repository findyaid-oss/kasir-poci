"use client";

import { useActionState, useState, useTransition } from "react";
import { Badge, buttonClass, inputClass } from "@/components/ui";
import { formatRupiah, formatTime } from "@/lib/time";
import { deleteSalesAction, resetAllSalesAction, type FormState } from "../actions";

type Sale = {
  id: number;
  createdAt: string;
  paymentMethod: "tunai" | "qris";
  total: number;
  status: "lunas" | "batal";
  items: { id: number; parentId: number | null; name: string; qty: number }[];
};

export function SaleTable({ sales }: { sales: Sale[] }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const allOn = sales.length > 0 && selected.size === sales.length;
  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  function remove() {
    startTransition(async () => {
      const res = await deleteSalesAction([...selected]);
      setState(res);
      if (res.ok) {
        setSelected(new Set());
        setConfirming(false);
      }
    });
  }

  if (sales.length === 0) {
    return (
      <div className="grid gap-2">
        {state.ok ? <p className="text-sm text-daun">✓ {state.message}</p> : null}
        <p className="rounded-2xl border border-dashed border-garis p-6 text-center text-kopi-muted">Tidak ada transaksi di tanggal ini.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-garis bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-garis px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allOn}
            onChange={() => setSelected(allOn ? new Set() : new Set(sales.map((s) => s.id)))}
            className="size-5 accent-teh"
          />
          Pilih semua ({sales.length})
        </label>
        {selected.size > 0 && !confirming ? (
          <button onClick={() => setConfirming(true)} className={buttonClass.danger}>
            Hapus terpilih ({selected.size})
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-garis bg-cabai-100 px-4 py-3 text-sm">
          <span>
            Hapus <b>{selected.size} transaksi</b>? Stoknya dikembalikan. Tidak bisa dibatalkan.
          </span>
          <span className="flex gap-2">
            <button onClick={() => setConfirming(false)} className={buttonClass.small}>
              Batal
            </button>
            <button onClick={remove} disabled={pending} className="press rounded-xl bg-cabai px-3 py-1.5 text-sm font-semibold text-white">
              {pending ? "Menghapus…" : "Ya, hapus"}
            </button>
          </span>
        </div>
      ) : null}
      {state.error ? <p className="px-4 pt-3 text-sm text-cabai">{state.error}</p> : state.ok ? <p className="px-4 pt-3 text-sm text-daun">✓ {state.message}</p> : null}

      <ul className="divide-y divide-garis">
        {sales.map((s) => {
          const on = selected.has(s.id);
          return (
            <li key={s.id}>
              <label className={`flex cursor-pointer items-start gap-3 px-4 py-3 ${on ? "bg-cabai-100/60" : "hover:bg-krem"}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} className="mt-1 size-5 shrink-0 accent-teh" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-kopi-muted">
                    {formatTime(new Date(s.createdAt))} · #{s.id} · {s.paymentMethod === "tunai" ? "Tunai" : "QRIS"}{" "}
                    {s.status === "batal" ? <Badge tone="bad">Batal</Badge> : null}
                  </span>
                  <span className="block text-sm">
                    {s.items
                      .filter((i) => i.parentId === null)
                      .map((i) => {
                        const tops = s.items.filter((t) => t.parentId === i.id).map((t) => t.name);
                        return `${i.qty}× ${i.name}${tops.length ? ` + ${tops.join(", ")}` : ""}`;
                      })
                      .join(" · ")}
                  </span>
                </span>
                <span className="num shrink-0 font-semibold">{formatRupiah(s.total)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ResetAllForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resetAllSalesAction, {});
  const [text, setText] = useState("");
  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
      <div className="grid gap-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          Ketik <b>RESET</b> untuk memastikan
        </label>
        <input id="confirm" name="confirm" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
      </div>
      <button disabled={pending || text.trim().toUpperCase() !== "RESET"} className="press h-11 rounded-xl bg-cabai px-4 font-semibold text-white disabled:opacity-40">
        {pending ? "Mereset…" : "Reset semua penjualan"}
      </button>
      <div className="sm:col-span-2">
        {state.error ? <p className="text-sm text-cabai">{state.error}</p> : state.ok ? <p className="text-sm text-daun">✓ {state.message}</p> : null}
      </div>
    </form>
  );
}
