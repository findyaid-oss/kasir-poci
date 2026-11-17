"use client";

import { useActionState, useState } from "react";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { formatQty } from "@/lib/time";
import {
  addPurchaseAction,
  createIngredientAction,
  setStockAction,
  updateIngredientAction,
  type FormState,
} from "../actions";

type Ingredient = {
  id: number;
  name: string;
  unit: string;
  stock: number;
  lowThreshold: number;
  packSize: number;
  packLabel: string;
  isActive: boolean;
};

const toNum = (v: string) => Number(v.replace(",", "."));

export function IngredientActions({ ingredient: i }: { ingredient: Ingredient }) {
  const [tab, setTab] = useState<"belanja" | "hitung" | "atur">("belanja");
  return (
    <div>
      <div className="my-2 flex gap-1" role="tablist">
        {(
          [
            ["belanja", "Belanja"],
            ["hitung", "Hitung ulang"],
            ["atur", "Atur"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${tab === key ? "bg-kopi text-white" : "bg-white text-kopi-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "belanja" ? <PurchaseForm i={i} /> : tab === "hitung" ? <CountForm i={i} /> : <SettingsForm i={i} />}
    </div>
  );
}

function Result({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-cabai">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-daun">✓ {state.message}</p>;
  return null;
}

function PurchaseForm({ i }: { i: Ingredient }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPurchaseAction, {});
  const [packs, setPacks] = useState("1");
  const [size, setSize] = useState(String(i.packSize).replace(".", ","));
  const added = toNum(packs) * toNum(size);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="ingredientId" value={i.id} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <Field label={`Jumlah ${i.packLabel}`} htmlFor={`packs-${i.id}`}>
          <input id={`packs-${i.id}`} name="packs" inputMode="decimal" value={packs} onChange={(e) => setPacks(e.target.value)} className={inputClass} />
        </Field>
        <span className="pb-3 text-kopi-muted">×</span>
        <Field label={`Isi per ${i.packLabel} (${i.unit})`} htmlFor={`size-${i.id}`}>
          <input id={`size-${i.id}`} name="packSize" inputMode="decimal" value={size} onChange={(e) => setSize(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <p className="text-sm text-kopi-muted">
        {Number.isFinite(added) && added > 0 ? (
          <>
            Stok bertambah <b className="text-kopi">{formatQty(added)} {i.unit}</b> → menjadi {formatQty(i.stock + added)} {i.unit}.
            Lihat isi per kemasan di bungkusnya; angka ini diingat untuk belanja berikutnya.
          </>
        ) : (
          "Isi jumlah kemasan dan isi per kemasan."
        )}
      </p>
      <Result state={state} />
      <button disabled={pending} className={buttonClass.primary}>
        {pending ? "Menyimpan…" : "Simpan belanja"}
      </button>
    </form>
  );
}

function CountForm({ i }: { i: Ingredient }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setStockAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="ingredientId" value={i.id} />
      <Field
        label={`Stok sebenarnya (${i.unit})`}
        htmlFor={`stock-${i.id}`}
        hint={`Tercatat ${formatQty(i.stock)} ${i.unit}. Isi hasil hitungan Anda, selisihnya dicatat sebagai koreksi.`}
      >
        <input id={`stock-${i.id}`} name="stock" inputMode="decimal" required className={inputClass} />
      </Field>
      <Field label="Keterangan (opsional)" htmlFor={`note-${i.id}`}>
        <input id={`note-${i.id}`} name="note" placeholder="mis. stok awal, tumpah, rusak" className={inputClass} />
      </Field>
      <Result state={state} />
      <button disabled={pending} className={buttonClass.primary}>
        {pending ? "Menyimpan…" : "Simpan hitungan"}
      </button>
    </form>
  );
}

function SettingsForm({ i }: { i: Ingredient }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateIngredientAction, {});
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="ingredientId" value={i.id} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Peringatan jika ≤ (${i.unit})`} htmlFor={`low-${i.id}`}>
          <input id={`low-${i.id}`} name="lowThreshold" inputMode="decimal" defaultValue={String(i.lowThreshold).replace(".", ",")} className={inputClass} />
        </Field>
        <Field label="Nama kemasan beli" htmlFor={`pl-${i.id}`}>
          <input id={`pl-${i.id}`} name="packLabel" defaultValue={i.packLabel} placeholder="renceng, pak, kotak" className={inputClass} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={i.isActive} className="size-4 accent-teh" />
        Masih dipakai (hilangkan centang untuk menyembunyikan dari peringatan)
      </label>
      <Result state={state} />
      <button disabled={pending} className={buttonClass.secondary}>
        {pending ? "Menyimpan…" : "Simpan pengaturan"}
      </button>
    </form>
  );
}

export function NewIngredientForm({ groups }: { groups: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createIngredientAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nama bahan" htmlFor="ni-name" error={state.errors?.name}>
        <input id="ni-name" name="name" placeholder="mis. Pop Ice Mangga" className={inputClass} />
      </Field>
      <Field label="Kelompok" htmlFor="ni-group" error={state.errors?.group}>
        <input id="ni-group" name="group" list="groups" placeholder="Sachet minuman" className={inputClass} />
        <datalist id="groups">
          {groups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </Field>
      <Field label="Satuan" htmlFor="ni-unit" error={state.errors?.unit}>
        <input id="ni-unit" name="unit" placeholder="sachet, g, pcs" className={inputClass} />
      </Field>
      <Field label="Peringatan jika stok ≤" htmlFor="ni-low" error={state.errors?.lowThreshold}>
        <input id="ni-low" name="lowThreshold" inputMode="decimal" defaultValue="3" className={inputClass} />
      </Field>
      <Field label="Cara hitung" htmlFor="ni-tracking">
        <select id="ni-tracking" name="tracking" className={inputClass} defaultValue="auto">
          <option value="auto">Otomatis (berkurang tiap penjualan)</option>
          <option value="manual">Cek manual (Masih banyak / Setengah / Habis)</option>
        </select>
      </Field>
      <div className="flex flex-col justify-end gap-2">
        <Result state={state} />
        <button disabled={pending} className={buttonClass.primary}>
          {pending ? "Menyimpan…" : "Tambah bahan"}
        </button>
      </div>
    </form>
  );
}
