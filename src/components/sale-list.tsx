import { formatRupiah, formatTime } from "@/lib/time";
import type { SaleWithItems } from "@/services/sales";
import { Badge } from "./ui";
import { VoidButton } from "./void-button";

/** Daftar transaksi dengan tombol batal. Dipakai di halaman kasir (shift berjalan) dan admin (per hari). */
export function SaleList({ sales, canVoid }: { sales: SaleWithItems[]; canVoid: boolean }) {
  if (sales.length === 0) {
    return <p className="rounded-2xl border border-dashed border-garis p-6 text-center text-kopi-muted">Belum ada transaksi.</p>;
  }
  return (
    <ul className="grid gap-2">
      {sales.map((s) => {
        const batal = s.status === "batal";
        return (
          <li key={s.id} className={`rounded-2xl border border-garis bg-white p-3 ${batal ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-kopi-muted">
                  {formatTime(s.createdAt)} · #{s.id} · {s.paymentMethod === "tunai" ? "Tunai" : "QRIS"}{" "}
                  {batal ? <Badge tone="bad">Batal</Badge> : null}
                </p>
                <ul className="mt-1 text-sm">
                  {s.items
                    .filter((i) => i.parentId === null)
                    .map((i) => {
                      const tops = s.items.filter((t) => t.parentId === i.id).map((t) => t.name);
                      return (
                        <li key={i.id} className={batal ? "line-through" : ""}>
                          {i.qty}× {i.name}
                          {tops.length ? <span className="text-teh"> + {tops.join(", ")}</span> : null}
                        </li>
                      );
                    })}
                </ul>
                {batal && s.voidReason ? <p className="mt-1 text-xs text-cabai">Alasan: {s.voidReason}</p> : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="num font-display text-lg font-semibold">{formatRupiah(s.total)}</p>
                {canVoid && !batal ? <VoidButton saleId={s.id} /> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
