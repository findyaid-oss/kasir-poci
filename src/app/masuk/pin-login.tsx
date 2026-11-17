"use client";

import { useState, useTransition } from "react";
import { loginWithPin } from "./actions";

type Person = { id: number; name: string; role: "owner" | "staff" };

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinLogin({ users }: { users: Person[] }) {
  const [selected, setSelected] = useState<Person | null>(users.length === 1 ? users[0] : null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(value: string) {
    if (!selected) return;
    startTransition(async () => {
      const res = await loginWithPin(selected.id, value);
      if (res?.error) {
        setError(res.error);
        setPin("");
      }
    });
  }

  function press(key: string) {
    if (pending) return;
    setError(null);
    if (key === "⌫") return setPin((p) => p.slice(0, -1));
    if (!key || pin.length >= 6) return;
    setPin(pin + key);
  }

  if (!selected) {
    return (
      <div className="grid gap-3">
        <p className="text-center text-kopi-muted">Siapa yang bertugas?</p>
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className="press flex items-center justify-between rounded-2xl border border-garis bg-white px-5 py-4 text-left text-lg font-semibold hover:border-teh"
          >
            {u.name}
            <span className="text-sm font-normal text-kopi-muted">{u.role === "owner" ? "Pemilik" : "Karyawan"}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-kopi-muted">Masuk sebagai</p>
      <p className="font-display text-2xl font-semibold">{selected.name}</p>
      {users.length > 1 ? (
        <button
          onClick={() => {
            setSelected(null);
            setPin("");
            setError(null);
          }}
          className="mt-1 text-sm text-teh underline underline-offset-4"
        >
          Ganti orang
        </button>
      ) : null}

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
        onClick={() => submit(pin)}
        disabled={pin.length < 4 || pending}
        className="press mt-5 h-14 w-full rounded-2xl bg-teh text-lg font-semibold text-white disabled:opacity-40"
      >
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </div>
  );
}
