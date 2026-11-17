/**
 * Pilihan uang cepat di layar bayar tunai: uang pas, lalu pecahan yang masuk akal di atas total.
 * Contoh total 13.000 → [13.000, 15.000, 20.000, 50.000, 100.000]
 */
export function quickCashOptions(total: number): number[] {
  if (total <= 0) return [];
  const options = new Set<number>([total]);
  for (const step of [5_000, 10_000, 20_000, 50_000, 100_000]) {
    const rounded = Math.ceil(total / step) * step;
    if (rounded > total) options.add(rounded);
  }
  return [...options].sort((a, b) => a - b).slice(0, 5);
}

/** Nilai rupiah dari input teks seperti "15.000", "15000", "Rp 15.000". */
export function parseRupiah(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/[^\d]/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}
