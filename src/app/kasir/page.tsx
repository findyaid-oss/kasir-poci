import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { db } from "@/db";
import { requireUser } from "@/lib/auth/session";
import { CHECK_LABEL } from "@/lib/labels";
import { formatQty } from "@/lib/time";
import { listMenuWithRecipes, sortCategories } from "@/services/catalog";
import { getOpenShift } from "@/services/shifts";
import { listIngredients, listLowStock } from "@/services/stock";
import { OpenShiftForm } from "./open-shift-form";
import { Pos, type PosItem } from "./pos";

export const metadata: Metadata = { title: "Jual" };

export default function KasirPage() {
  return (
    <Suspense fallback={<Loading label="Menyiapkan kasir…" />}>
      <KasirContent />
    </Suspense>
  );
}

async function KasirContent() {
  const user = await requireUser();
  const shift = await getOpenShift(db);
  if (!shift) return <OpenShiftForm name={user.name} />;

  const [menu, stock, low] = await Promise.all([
    listMenuWithRecipes(db, { onlyActive: true }),
    listIngredients(db),
    listLowStock(db),
  ]);
  const stockById = new Map(stock.map((s) => [s.id, s]));

  const toItem = (m: (typeof menu)[number]): PosItem => {
    // Menu ditandai kalau ada bahan yang stoknya tidak cukup untuk 1 cup/porsi (tetap bisa dijual).
    const short = m.recipe
      .filter((r) => r.tracking === "auto" && (stockById.get(r.ingredientId)?.stock ?? 0) < r.qty)
      .map((r) => r.name);
    return { id: m.id, name: m.name, category: m.category, kind: m.kind, price: m.price, short };
  };

  const items = menu.filter((m) => m.kind !== "topping").map(toItem);
  const toppings = menu.filter((m) => m.kind === "topping").map(toItem);

  return (
    <Pos
      categories={sortCategories(items.map((i) => i.category))}
      items={items}
      toppings={toppings}
      lowStock={low.map((l) => ({
        id: l.id,
        name: l.name,
        detail:
          l.tracking === "manual"
            ? CHECK_LABEL[l.checkStatus ?? "aman"].toLowerCase()
            : `sisa ${formatQty(l.stock)} ${l.unit}`,
        empty: l.tracking === "manual" ? l.checkStatus === "habis" : l.stock <= 0,
      }))}
    />
  );
}
