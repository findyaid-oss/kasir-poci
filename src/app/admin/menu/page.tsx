import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, buttonClass, Card, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { formatQty, formatRupiah } from "@/lib/time";
import { listMenuWithRecipes, sortCategories } from "@/services/catalog";
import { toggleMenuAction } from "../actions";

export const metadata: Metadata = { title: "Menu & harga" };

export default function MenuPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MenuList />
    </Suspense>
  );
}

async function MenuList() {
  await requireOwner();
  const menu = await listMenuWithRecipes(db, { onlyActive: false });
  const categories = sortCategories(menu.map((m) => m.category));

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeading title="Menu & harga">Ubah harga jual, HPP, dan resep. Rekap hari-hari lalu tidak ikut berubah.</PageHeading>
        <Link href="/admin/menu/baru" className={buttonClass.primary}>
          + Menu baru
        </Link>
      </div>
      <div className="grid gap-4">
        {categories.map((c) => (
          <Card key={c} className="p-0 sm:p-0">
            <h2 className="border-b border-garis px-4 py-3 font-semibold">{c}</h2>
            <ul className="divide-y divide-garis">
              {menu
                .filter((m) => m.category === c)
                .map((m) => {
                  const laba = m.price - m.hpp;
                  return (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
                      <div className="min-w-0">
                        <p className={`font-medium ${m.isActive ? "" : "text-kopi-muted line-through"}`}>
                          {m.name} {m.isActive ? null : <Badge tone="muted">disembunyikan</Badge>}
                        </p>
                        <p className="text-xs text-kopi-muted">
                          {m.recipe.filter((r) => r.tracking === "auto").map((r) => `${formatQty(r.qty)} ${r.unit} ${r.name}`).join(" · ") || "Tanpa resep stok"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="num text-right text-sm">
                          <p className="font-semibold">{formatRupiah(m.price)}</p>
                          <p className="text-kopi-muted">
                            HPP {formatRupiah(m.hpp)} · <span className={laba > 0 ? "text-daun" : "text-cabai"}>laba {formatRupiah(laba)}</span>
                          </p>
                        </div>
                        <Link href={`/admin/menu/${m.id}`} className={buttonClass.small}>
                          Ubah
                        </Link>
                        <form action={toggleMenuAction}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className={buttonClass.small}>{m.isActive ? "Sembunyikan" : "Tampilkan"}</button>
                        </form>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
