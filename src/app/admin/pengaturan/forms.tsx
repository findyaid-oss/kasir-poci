"use client";

import { useActionState, useState } from "react";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { createUserAction, resetPinAction, saveSettingsAction, type FormState } from "../actions";

function Result({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-cabai">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-daun">✓ {state.message}</p>;
  return null;
}

export function NewUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUserAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-2xl bg-krem p-3 sm:grid-cols-[1fr_120px_140px_auto] sm:items-end">
      <Field label="Nama" htmlFor="nu-name">
        <input id="nu-name" name="name" required minLength={2} placeholder="Nama karyawan" className={inputClass} />
      </Field>
      <Field label="PIN (4–6 angka)" htmlFor="nu-pin">
        <input id="nu-pin" name="pin" required inputMode="numeric" pattern="\d{4,6}" className={inputClass} />
      </Field>
      <Field label="Peran" htmlFor="nu-role">
        <select id="nu-role" name="role" defaultValue="staff" className={inputClass}>
          <option value="staff">Karyawan</option>
          <option value="owner">Pemilik</option>
        </select>
      </Field>
      <button disabled={pending} className={buttonClass.primary}>
        {pending ? "…" : "Tambah"}
      </button>
      <div className="sm:col-span-4">
        <Result state={state} />
      </div>
    </form>
  );
}

export function ResetPinForm({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(resetPinAction, {});
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={buttonClass.small}>
        Ganti PIN
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor={`pin-${userId}`} className="sr-only">
        PIN baru
      </label>
      <input id={`pin-${userId}`} name="pin" required inputMode="numeric" pattern="\d{4,6}" placeholder="PIN baru" className={`${inputClass} w-28 py-1.5`} />
      <button disabled={pending} className={buttonClass.small}>
        Simpan
      </button>
      {state.ok ? <span className="text-sm text-daun">✓</span> : state.error ? <span className="text-sm text-cabai">{state.error}</span> : null}
    </form>
  );
}

type SettingsValues = {
  businessName: string;
  rentMonthly: number;
  electricityMonthly: number;
  securityMonthly: number;
  otherMonthly: number;
  initialCapital: number;
  startDate: string;
  targetDrinks: number;
  targetFood: number;
};

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});
  const e = state.errors ?? {};
  const money = (name: keyof SettingsValues, label: string, hint?: string) => (
    <Field label={label} htmlFor={name} error={e[name]} hint={hint}>
      <input id={name} name={name} inputMode="numeric" defaultValue={String(initial[name])} className={inputClass} />
    </Field>
  );
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nama kios" htmlFor="businessName" error={e.businessName}>
        <input id="businessName" name="businessName" defaultValue={initial.businessName} className={inputClass} />
      </Field>
      <Field label="Tanggal mulai usaha" htmlFor="startDate" error={e.startDate} hint="Untuk menghitung balik modal. Kosong = sejak penjualan pertama.">
        <input id="startDate" name="startDate" type="date" defaultValue={initial.startDate} className={inputClass} />
      </Field>
      {money("rentMonthly", "Sewa per bulan (Rp)", "Rp 8 juta/tahun = 666.667/bulan")}
      {money("electricityMonthly", "Listrik per bulan (Rp)")}
      {money("securityMonthly", "Keamanan per bulan (Rp)")}
      {money("otherMonthly", "Biaya tetap lain per bulan (Rp)", "mis. gaji karyawan, iuran")}
      {money("initialCapital", "Modal awal (Rp)")}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Target cup/hari" htmlFor="targetDrinks" error={e.targetDrinks}>
          <input id="targetDrinks" name="targetDrinks" inputMode="numeric" defaultValue={initial.targetDrinks} className={inputClass} />
        </Field>
        <Field label="Target porsi/hari" htmlFor="targetFood" error={e.targetFood}>
          <input id="targetFood" name="targetFood" inputMode="numeric" defaultValue={initial.targetFood} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass.primary}>
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}
