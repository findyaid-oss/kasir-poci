"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { buttonClass, Field, inputClass } from "@/components/ui";
import { parseRupiah } from "@/lib/money";
import { formatRupiah } from "@/lib/time";
import { saveMenuAction, type FormState } from "../actions";

type Ingredient = { id: number; name: string; unit: string; group: string };
type Initial = {
  id?: number;
  name: string;
  category: string;
  kind: "minuman" | "makanan" | "topping";
  price: number;
  hpp: number;
  isActive: boolean;
  recipe: { ingredientId: number; qty: number }[];
};

export function MenuForm({ initial, ingredients, categories }: { initial: Initial; ingredients: Ingredient[]; categories: string[] }) {
  const [form, setForm] = useState({
    name: initial.name,
    category: initial.category,
    kind: initial.kind,
    price: initial.price ? String(initial.price) : "",
    hpp: initial.hpp ? String(initial.hpp) : "",
    isActive: initial.isActive,
  });
  const [recipe, setRecipe] = useState(initial.recipe.map((r) => ({ ingredientId: r.ingredientId, qty: String(r.qty).replace(".", ",") })));
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();

  const price = parseRupiah(form.price) ?? 0;
  const hpp = parseRupiah(form.hpp) ?? 0;
  const groups = [...new Set(ingredients.map((i) => i.group))];

  function save() {
    startTransition(async () => {
      const res = await saveMenuAction(
        {
          name: form.name,
          category: form.category,
          kind: form.kind,
          price: form.price,
          hpp: form.hpp,
          isActive: form.isActive,
          recipe: recipe
            .filter((r) => r.ingredientId && r.qty)
            .map((r) => ({ ingredientId: r.ingredientId, qty: Number(r.qty.replace(",", ".")) })),
        },
        initial.id,
      );
      if (res) setState(res);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nama menu" htmlFor="name" error={state.errors?.name}>
          <input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Kategori (tab di kasir)" htmlFor="category" error={state.errors?.category}>
          <input id="category" list="categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass} />
          <datalist id="categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Jenis" htmlFor="kind" error={state.errors?.kind} hint="Minuman dihitung per cup dan bisa diberi topping. Makanan per porsi.">
          <select id="kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Initial["kind"] })} className={inputClass}>
            <option value="minuman">Minuman (cup)</option>
            <option value="makanan">Makanan (porsi)</option>
            <option value="topping">Topping</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-center text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="size-4 accent-teh" />
          Tampil di kasir
        </label>
        <Field label="Harga jual (Rp)" htmlFor="price" error={state.errors?.price}>
          <input id="price" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
        </Field>
        <Field label="HPP / modal per cup atau porsi (Rp)" htmlFor="hpp" error={state.errors?.hpp}>
          <input id="hpp" inputMode="numeric" value={form.hpp} onChange={(e) => setForm({ ...form, hpp: e.target.value })} className={inputClass} />
        </Field>
      </div>
      {price > 0 ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${price - hpp > 0 ? "bg-daun-100 text-daun" : "bg-cabai-100 text-cabai"}`}>
          Laba kotor per {form.kind === "makanan" ? "porsi" : "cup"}: <b>{formatRupiah(price - hpp)}</b>
          {price > 0 ? ` (${Math.round(((price - hpp) / price) * 100)}% dari harga jual)` : ""}
        </p>
      ) : null}

      <div>
        <h2 className="font-semibold">Resep (bahan yang dipotong dari stok per 1 {form.kind === "makanan" ? "porsi" : "cup"})</h2>
        <p className="mb-2 text-sm text-kopi-muted">Hanya bahan yang dihitung otomatis. Contoh: ½ kantong teh ditulis 0,5.</p>
        <div className="grid gap-2">
          {recipe.map((r, idx) => {
            const unit = ingredients.find((i) => i.id === r.ingredientId)?.unit ?? "";
            return (
              <div key={idx} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                <label className="sr-only" htmlFor={`ing-${idx}`}>
                  Bahan
                </label>
                <select
                  id={`ing-${idx}`}
                  value={r.ingredientId || ""}
                  onChange={(e) => setRecipe(recipe.map((x, i) => (i === idx ? { ...x, ingredientId: Number(e.target.value) } : x)))}
                  className={inputClass}
                >
                  <option value="">Pilih bahan…</option>
                  {groups.map((g) => (
                    <optgroup key={g} label={g}>
                      {ingredients
                        .filter((i) => i.group === g)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <label className="sr-only" htmlFor={`qty-${idx}`}>
                    Jumlah
                  </label>
                  <input
                    id={`qty-${idx}`}
                    inputMode="decimal"
                    value={r.qty}
                    onChange={(e) => setRecipe(recipe.map((x, i) => (i === idx ? { ...x, qty: e.target.value } : x)))}
                    className={inputClass.replace("w-full", "w-16") + " px-2 text-center"}
                  />
                  <span className="w-12 text-xs text-kopi-muted">{unit}</span>
                </div>
                <button type="button" onClick={() => setRecipe(recipe.filter((_, i) => i !== idx))} aria-label="Hapus bahan" className={buttonClass.danger}>
                  ×
                </button>
              </div>
            );
          })}
          <button type="button" onClick={() => setRecipe([...recipe, { ingredientId: 0, qty: "1" }])} className={`${buttonClass.small} justify-self-start`}>
            + Tambah bahan
          </button>
        </div>
      </div>

      {state.error ? <p className="text-sm text-cabai">{state.error}</p> : null}
      <div className="flex gap-2">
        <Link href="/admin/menu" className={buttonClass.secondary}>
          Batal
        </Link>
        <button onClick={save} disabled={pending} className={buttonClass.primary}>
          {pending ? "Menyimpan…" : "Simpan menu"}
        </button>
      </div>
    </div>
  );
}
