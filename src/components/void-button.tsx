"use client";

import { useActionState, useState } from "react";
import { voidSaleAction, type ActionState } from "@/app/kasir/actions";
import { buttonClass, inputClass } from "./ui";

export function VoidButton({ saleId }: { saleId: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(voidSaleAction, {});

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={`${buttonClass.danger} mt-1`}>
        Batalkan
      </button>
    );
  }
  return (
    <form action={action} className="mt-2 grid w-52 gap-2 text-left">
      <input type="hidden" name="saleId" value={saleId} />
      <label htmlFor={`reason-${saleId}`} className="text-xs font-medium">
        Alasan batal
      </label>
      <input id={`reason-${saleId}`} name="reason" required minLength={3} placeholder="mis. salah input" className={`${inputClass} py-2 text-sm`} />
      {state.error ? <p className="text-xs text-cabai">{state.error}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className={buttonClass.small}>
          Tidak
        </button>
        <button disabled={pending} className={buttonClass.danger}>
          {pending ? "…" : "Ya, batalkan"}
        </button>
      </div>
    </form>
  );
}
