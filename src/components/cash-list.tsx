import { deleteCashAction } from "@/app/kasir/actions";
import { formatRupiah, formatTime } from "@/lib/time";

type Row = { id: number; type: "masuk" | "keluar"; amount: number; note: string; createdAt: Date; by: string };

/** Daftar kas masuk/keluar. Dipakai di halaman kasir (shift berjalan) dan rekap admin. */
export function CashList({ rows, canDelete }: { rows: Row[]; canDelete: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-kopi-muted">Belum ada kas masuk/keluar.</p>;
  return (
    <ul className="divide-y divide-garis">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="font-medium">{r.note}</p>
            <p className="text-xs text-kopi-muted">
              {formatTime(r.createdAt)} · {r.by}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`num font-semibold ${r.type === "masuk" ? "text-daun" : "text-cabai"}`}>
              {r.type === "masuk" ? "+" : "−"} {formatRupiah(r.amount)}
            </span>
            {canDelete ? (
              <form action={deleteCashAction}>
                <input type="hidden" name="id" value={r.id} />
                <button aria-label={`Hapus ${r.note}`} className="press grid size-8 place-items-center rounded-lg border border-garis text-kopi-muted hover:border-cabai hover:text-cabai">
                  ×
                </button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
