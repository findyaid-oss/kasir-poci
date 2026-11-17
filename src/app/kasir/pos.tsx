"use client";

import { useMemo, useState, useTransition } from "react";
import { quickCashOptions, parseRupiah } from "@/lib/money";
import { formatRupiah } from "@/lib/time";
import { createSaleAction } from "./actions";

export type PosItem = {
  id: number;
  name: string;
  category: string;
  kind: "minuman" | "makanan" | "topping";
  price: number;
  /** Bahan yang stoknya tidak cukup (kosong = aman). */
  short: string[];
};

type LowStock = { id: number; name: string; detail: string; empty: boolean };
type Line = { key: string; item: PosItem; qty: number; toppings: PosItem[] };
type Sheet =
  | { type: "add"; item: PosItem }
  | { type: "checkout" }
  | { type: "done"; total: number; change: number | null; paymentMethod: "tunai" | "qris" }
  | null;

const lineKey = (itemId: number, toppingIds: number[]) => `${itemId}:${[...toppingIds].sort((a, b) => a - b).join(",")}`;
const unitPrice = (l: Pick<Line, "item" | "toppings">) => l.item.price + l.toppings.reduce((s, t) => s + t.price, 0);

export function Pos({
  categories,
  items,
  toppings,
  lowStock,
}: {
  categories: string[];
  items: PosItem[];
  toppings: PosItem[];
  lowStock: LowStock[];
}) {
  const [category, setCategory] = useState(categories[0] ?? "");
  const [cart, setCart] = useState<Line[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [showLow, setShowLow] = useState(false);

  const total = cart.reduce((s, l) => s + l.qty * unitPrice(l), 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const inCart = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of cart) m.set(l.item.id, (m.get(l.item.id) ?? 0) + l.qty);
    return m;
  }, [cart]);

  function addToCart(item: PosItem, qty: number, chosen: PosItem[]) {
    const key = lineKey(
      item.id,
      chosen.map((t) => t.id),
    );
    setCart((c) => {
      const existing = c.find((l) => l.key === key);
      if (existing) return c.map((l) => (l.key === key ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
      return [...c, { key, item, qty, toppings: chosen }];
    });
  }

  function changeQty(key: string, delta: number) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: Math.min(99, l.qty + delta) } : l)).filter((l) => l.qty > 0));
  }

  const visible = items.filter((i) => i.category === category);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-3 pt-3 pb-32">
      {lowStock.length > 0 ? (
        <div className="mb-3 rounded-2xl border border-kunyit/30 bg-kunyit-100">
          <button
            onClick={() => setShowLow((v) => !v)}
            aria-expanded={showLow}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium"
          >
            <span>⚠️ {lowStock.length} bahan perlu dicek / dibeli</span>
            <span className="text-kopi-muted">{showLow ? "Tutup" : "Lihat"}</span>
          </button>
          {showLow ? (
            <ul className="grid gap-1 px-4 pb-3 text-sm sm:grid-cols-2">
              {lowStock.map((l) => (
                <li key={l.id} className="flex justify-between gap-2">
                  <span>{l.name}</span>
                  <span className={l.empty ? "font-semibold text-cabai" : "text-kopi-muted"}>{l.detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div role="tablist" aria-label="Kategori menu" className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={c === category}
            onClick={() => setCategory(c)}
            className={`press rounded-xl px-2 py-2.5 text-sm font-semibold ${
              c === category ? "bg-kopi text-white" : "border border-garis bg-white text-kopi"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item) => {
          const qty = inCart.get(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setSheet({ type: "add", item })}
              className={`press relative flex min-h-24 flex-col justify-between rounded-2xl border p-3 text-left ${
                qty ? "border-teh bg-teh-50" : "border-garis bg-white hover:border-teh/50"
              }`}
            >
              <span className="pr-6 leading-snug font-semibold">{item.name}</span>
              <span className="mt-2 flex items-end justify-between gap-1">
                <span className="num font-display text-lg font-semibold text-teh">{formatRupiah(item.price)}</span>
                {item.short.length ? <span className="text-[11px] leading-tight font-medium text-cabai">stok kurang</span> : null}
              </span>
              {qty ? (
                <span className="num absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-teh text-xs font-bold text-white">
                  {qty}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {count > 0 && !sheet ? (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-garis bg-white/95 px-3 pt-3 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-kopi-muted">{count} item</p>
              <p className="num font-display text-2xl leading-tight font-semibold">{formatRupiah(total)}</p>
            </div>
            <button onClick={() => setCart([])} className="press rounded-2xl border border-garis px-4 py-3.5 text-sm font-medium text-kopi-muted">
              Kosongkan
            </button>
            <button onClick={() => setSheet({ type: "checkout" })} className="press rounded-2xl bg-teh px-6 py-3.5 text-lg font-semibold text-white">
              Bayar
            </button>
          </div>
        </div>
      ) : null}

      {sheet?.type === "add" ? (
        <AddSheet
          item={sheet.item}
          toppings={sheet.item.kind === "minuman" ? toppings : []}
          onClose={() => setSheet(null)}
          onAdd={(qty, chosen) => {
            addToCart(sheet.item, qty, chosen);
            setSheet(null);
          }}
        />
      ) : null}

      {sheet?.type === "checkout" ? (
        <CheckoutSheet
          cart={cart}
          total={total}
          onQty={changeQty}
          onClose={() => setSheet(null)}
          onDone={(r) => {
            setCart([]);
            setSheet({ type: "done", ...r });
          }}
        />
      ) : null}

      {sheet?.type === "done" ? <DoneSheet {...sheet} onClose={() => setSheet(null)} /> : null}
    </main>
  );
}

/* ---------- Lembar bawah (bottom sheet) ---------- */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-kopi/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet-in pb-safe max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-krem px-4 pt-4 sm:rounded-3xl sm:pb-4"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Tutup" className="press -mt-1 grid size-10 place-items-center rounded-full bg-white text-xl text-kopi-muted">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stepper({ value, onChange, min = 1 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Kurangi"
        className="press grid size-12 place-items-center rounded-2xl border border-garis bg-white text-2xl font-semibold"
      >
        −
      </button>
      <span className="num w-10 text-center font-display text-2xl font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        aria-label="Tambah"
        className="press grid size-12 place-items-center rounded-2xl border border-garis bg-white text-2xl font-semibold"
      >
        +
      </button>
    </div>
  );
}

function AddSheet({
  item,
  toppings,
  onClose,
  onAdd,
}: {
  item: PosItem;
  toppings: PosItem[];
  onClose: () => void;
  onAdd: (qty: number, chosen: PosItem[]) => void;
}) {
  const [qty, setQty] = useState(1);
  const [chosen, setChosen] = useState<PosItem[]>([]);
  const each = item.price + chosen.reduce((s, t) => s + t.price, 0);

  return (
    <Sheet title={item.name} onClose={onClose}>
      <p className="num -mt-2 mb-4 text-kopi-muted">{formatRupiah(item.price)} per {item.kind === "minuman" ? "cup" : "porsi"}</p>
      {item.short.length ? (
        <p className="mb-4 rounded-xl bg-cabai-100 px-3 py-2 text-sm text-cabai">
          Stok tercatat kurang: {item.short.join(", ")}. Tetap bisa dijual, tapi segera cek & isi stok.
        </p>
      ) : null}

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-3">
        <span className="font-medium">Jumlah</span>
        <Stepper value={qty} onChange={setQty} />
      </div>

      {toppings.length ? (
        <div className="mb-5">
          <p className="mb-2 font-medium">Topping {qty > 1 ? <span className="font-normal text-kopi-muted">(untuk semua {qty} cup)</span> : null}</p>
          <div className="grid grid-cols-2 gap-2">
            {toppings.map((t) => {
              const on = chosen.some((c) => c.id === t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setChosen((c) => (on ? c.filter((x) => x.id !== t.id) : [...c, t]))}
                  className={`press rounded-2xl border-2 px-3 py-3 text-left ${on ? "border-teh bg-teh-50" : "border-garis bg-white"}`}
                >
                  <span className="block font-semibold">
                    {on ? "✓ " : "+ "}
                    {t.name}
                  </span>
                  <span className="num text-sm text-kopi-muted">+{formatRupiah(t.price)}</span>
                  {t.short.length ? <span className="block text-xs text-cabai">stok kurang</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <button onClick={() => onAdd(qty, chosen)} className="press h-14 w-full rounded-2xl bg-teh text-lg font-semibold text-white">
        Tambah · <span className="num">{formatRupiah(each * qty)}</span>
      </button>
    </Sheet>
  );
}

function CheckoutSheet({
  cart,
  total,
  onQty,
  onClose,
  onDone,
}: {
  cart: Line[];
  total: number;
  onQty: (key: string, delta: number) => void;
  onClose: () => void;
  onDone: (r: { total: number; change: number | null; paymentMethod: "tunai" | "qris" }) => void;
}) {
  const [method, setMethod] = useState<"tunai" | "qris">("tunai");
  const [cashText, setCashText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const typed = parseRupiah(cashText);
  const cash = typed ?? total; // kosong = uang pas
  const change = cash - total;
  const options = quickCashOptions(total);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await createSaleAction({
        paymentMethod: method,
        cashReceived: method === "tunai" ? cash : null,
        lines: cart.map((l) => ({ menuItemId: l.item.id, qty: l.qty, toppingIds: l.toppings.map((t) => t.id) })),
      });
      if ("error" in res) setError(res.error);
      else onDone(res);
    });
  }

  if (cart.length === 0) {
    return (
      <Sheet title="Pesanan" onClose={onClose}>
        <p className="py-8 text-center text-kopi-muted">Pesanan kosong.</p>
      </Sheet>
    );
  }

  return (
    <Sheet title="Pesanan" onClose={onClose}>
      <ul className="mb-4 divide-y divide-garis rounded-2xl bg-white">
        {cart.map((l) => (
          <li key={l.key} className="flex items-center gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-semibold">{l.item.name}</p>
              {l.toppings.length ? <p className="text-sm text-teh">+ {l.toppings.map((t) => t.name).join(", ")}</p> : null}
              <p className="num text-sm text-kopi-muted">
                {l.qty} × {formatRupiah(unitPrice(l))} = <span className="font-semibold text-kopi">{formatRupiah(l.qty * unitPrice(l))}</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onQty(l.key, -1)} aria-label={`Kurangi ${l.item.name}`} className="press grid size-10 place-items-center rounded-xl border border-garis text-xl">
                {l.qty === 1 ? "🗑" : "−"}
              </button>
              <span className="num w-7 text-center font-semibold">{l.qty}</span>
              <button onClick={() => onQty(l.key, 1)} aria-label={`Tambah ${l.item.name}`} className="press grid size-10 place-items-center rounded-xl border border-garis text-xl">
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-4 flex items-baseline justify-between px-1">
        <span className="text-kopi-muted">Total</span>
        <span className="num font-display text-3xl font-semibold">{formatRupiah(total)}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cara bayar">
        {(["tunai", "qris"] as const).map((m) => (
          <button
            key={m}
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`press h-14 rounded-2xl border-2 text-lg font-semibold ${method === m ? "border-teh bg-teh text-white" : "border-garis bg-white"}`}
          >
            {m === "tunai" ? "💵 Tunai" : "📱 QRIS"}
          </button>
        ))}
      </div>

      {method === "tunai" ? (
        <div className="mb-4 rounded-2xl bg-white p-3">
          <p className="mb-2 text-sm font-medium">Uang diterima</p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {options.map((o) => {
              const on = (typed ?? total) === o;
              return (
                <button
                  key={o}
                  onClick={() => setCashText(o === total ? "" : String(o))}
                  className={`press num rounded-xl border-2 py-2.5 text-sm font-semibold ${on ? "border-teh bg-teh-50 text-teh" : "border-garis"}`}
                >
                  {o === total ? "Uang pas" : formatRupiah(o)}
                </button>
              );
            })}
          </div>
          <label htmlFor="cash" className="sr-only">
            Jumlah lain
          </label>
          <input
            id="cash"
            inputMode="numeric"
            placeholder="Jumlah lain, mis. 25000"
            value={cashText ? new Intl.NumberFormat("id-ID").format(parseRupiah(cashText) ?? 0) : ""}
            onChange={(e) => setCashText(e.target.value)}
            className="num w-full rounded-xl border border-garis px-3 py-2.5 text-base outline-none focus:border-teh"
          />
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-kopi-muted">Kembalian</span>
            <span className={`num font-display text-2xl font-semibold ${change < 0 ? "text-cabai" : "text-daun"}`}>
              {change < 0 ? `kurang ${formatRupiah(-change)}` : formatRupiah(change)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mb-4 rounded-2xl bg-white p-3 text-sm text-kopi-muted">
          Minta pembeli scan QRIS, lalu tekan simpan <b>setelah</b> pembayaran masuk.
        </p>
      )}

      {error ? (
        <p role="alert" className="mb-3 rounded-xl bg-cabai-100 px-3 py-2 text-sm text-cabai">
          {error}
        </p>
      ) : null}

      <button
        onClick={save}
        disabled={pending || (method === "tunai" && change < 0)}
        className="press h-14 w-full rounded-2xl bg-daun text-lg font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Menyimpan…" : "✓ Simpan transaksi"}
      </button>
    </Sheet>
  );
}

function DoneSheet({
  total,
  change,
  paymentMethod,
  onClose,
}: {
  total: number;
  change: number | null;
  paymentMethod: "tunai" | "qris";
  onClose: () => void;
}) {
  return (
    <Sheet title="Tersimpan ✓" onClose={onClose}>
      <div className="mb-5 rounded-2xl bg-white p-5 text-center">
        <p className="text-kopi-muted">
          {paymentMethod === "tunai" ? "Tunai" : "QRIS"} · total <span className="num font-semibold text-kopi">{formatRupiah(total)}</span>
        </p>
        {paymentMethod === "tunai" ? (
          <>
            <p className="mt-4 text-sm font-medium tracking-wide text-kopi-muted uppercase">Kembalian</p>
            <p className="num font-display text-5xl font-semibold text-daun">{formatRupiah(change ?? 0)}</p>
          </>
        ) : null}
      </div>
      <button autoFocus onClick={onClose} className="press h-14 w-full rounded-2xl bg-teh text-lg font-semibold text-white">
        Pesanan baru
      </button>
    </Sheet>
  );
}
