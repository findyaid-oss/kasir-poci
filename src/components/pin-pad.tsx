"use client";

import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

/** Papan angka PIN besar untuk HP. Memanggil onSubmit(pin) saat tombol utama ditekan. */
export function PinPad({
  onSubmit,
  pending,
  error,
  onType,
  submitLabel = "Masuk",
}: {
  onSubmit: (pin: string) => Promise<boolean | void>;
  pending: boolean;
  error: string | null;
  onType?: () => void;
  submitLabel?: string;
}) {
  const [pin, setPin] = useState("");

  function press(key: string) {
    if (pending) return;
    onType?.();
    if (key === "⌫") return setPin((p) => p.slice(0, -1));
    if (!key || pin.length >= 6) return;
    setPin(pin + key);
  }

  async function submit() {
    const ok = await onSubmit(pin);
    if (ok === false) setPin("");
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="my-6 flex h-6 gap-3" aria-label={`${pin.length} angka dimasukkan`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full border-2 ${i < pin.length ? "border-teh bg-teh" : "border-garis"}`} />
        ))}
      </div>

      <p role="alert" className="mb-3 min-h-6 text-center text-sm text-cabai">
        {error}
      </p>

      <div className="grid w-full grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "⌫" ? "Hapus" : k}
              className="press h-16 rounded-2xl border border-garis bg-white font-display text-2xl font-semibold hover:border-teh"
            >
              {k}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={pin.length < 4 || pending}
        className="press mt-5 h-14 w-full rounded-2xl bg-teh text-lg font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Memeriksa…" : submitLabel}
      </button>
    </div>
  );
}
