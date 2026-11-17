"use client";

import { useState, useTransition } from "react";
import { PinPad } from "@/components/pin-pad";
import { loginWithPin } from "./actions";

type Person = { id: number; name: string; role: "owner" | "staff" };

export function PinLogin({ users }: { users: Person[] }) {
  const [selected, setSelected] = useState<Person | null>(users.length === 1 ? users[0] : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
            setError(null);
          }}
          className="mt-1 text-sm text-teh underline underline-offset-4"
        >
          Ganti orang
        </button>
      ) : null}
      <PinPad
        key={selected.id}
        pending={pending}
        error={error}
        onType={() => setError(null)}
        onSubmit={(pin) =>
          new Promise((resolve) =>
            startTransition(async () => {
              const res = await loginWithPin(selected.id, pin);
              if (res?.error) setError(res.error);
              resolve(res?.error ? false : true);
            }),
          )
        }
      />
    </div>
  );
}
