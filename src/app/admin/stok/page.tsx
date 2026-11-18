import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, Card, Loading, Notice, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { ingredients, stockMovements, users } from "@/db/schema";
import { requireOwner } from "@/lib/auth/session";
import { CHECK_LABEL } from "@/lib/labels";
import { formatDateTime, formatQty } from "@/lib/time";
import { isLow, listIngredients } from "@/services/stock";
import { makeAutoAction, setCheckStatusAction } from "../actions";
import { IngredientActions, NewIngredientForm } from "./stock-forms";

export const metadata: Metadata = { title: "Stok" };

const REASON = { jual: "Terjual", batal: "Batal jual", belanja: "Belanja", koreksi: "Hitung ulang" } as const;

export default function StokPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Stok />
    </Suspense>
  );
}

async function Stok() {
  await requireOwner();
  const [all, moves] = await Promise.all([
    listIngredients(db, { includeInactive: true }),
    db
      .select({
        id: stockMovements.id,
        name: ingredients.name,
        unit: ingredients.unit,
        change: stockMovements.change,
        stockAfter: stockMovements.stockAfter,
        reason: stockMovements.reason,
        note: stockMovements.note,
        createdAt: stockMovements.createdAt,
        by: users.name,
      })
      .from(stockMovements)
      .innerJoin(ingredients, eq(stockMovements.ingredientId, ingredients.id))
      .leftJoin(users, eq(stockMovements.userId, users.id))
      .where(eq(stockMovements.reason, "belanja"))
      .orderBy(desc(stockMovements.id))
      .limit(15),
  ]);

  const auto = all.filter((i) => i.tracking === "auto");
  const manual = all.filter((i) => i.tracking === "manual");
  const groups = [...new Set(auto.map((i) => i.group))];
  const emptyCount = auto.filter((i) => i.isActive && i.stock <= 0).length;

  return (
    <>
      <PageHeading title="Stok bahan">
        Stok otomatis berkurang setiap penjualan. Baru belanja? Buka bahannya lalu isi <b>Belanja</b>. Mau menyamakan
        dengan hitungan di kios? Pakai <b>Hitung ulang</b>.
      </PageHeading>

      {emptyCount >= 5 ? (
        <div className="mb-4">
          <Notice tone="warn">
            <b>{emptyCount} bahan stoknya masih 0 atau minus.</b> Kalau baru mulai memakai aplikasi: Hitung barang di kios, lalu untuk setiap bahan buka{" "}
            <b>Hitung ulang</b> dan isi jumlah sebenarnya. Setelah itu, setiap belanja cukup dicatat lewat <b>Belanja</b>.
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-4">
        {groups.map((g) => (
          <Card key={g} className="p-0 sm:p-0">
            <h2 className="border-b border-garis px-4 py-3 font-semibold">{g}</h2>
            <ul className="divide-y divide-garis">
              {auto
                .filter((i) => i.group === g)
                .map((i) => {
                  const low = isLow(i);
                  return (
                    <li key={i.id}>
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-teh-50">
                          <span className={`min-w-0 ${i.isActive ? "" : "text-kopi-muted line-through"}`}>{i.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className={`num font-semibold ${i.stock <= 0 ? "text-cabai" : low ? "text-kunyit" : ""}`}>
                              {formatQty(i.stock)} <span className="font-normal text-kopi-muted">{i.unit}</span>
                            </span>
                            {i.stock <= 0 ? <Badge tone="bad">habis</Badge> : low ? <Badge tone="warn">menipis</Badge> : null}
                            <span className="text-kopi-muted transition-transform group-open:rotate-90">›</span>
                          </span>
                        </summary>
                        <div className="bg-krem/60 px-4 pt-1 pb-4">
                          <IngredientActions
                            ingredient={{
                              id: i.id,
                              name: i.name,
                              unit: i.unit,
                              stock: i.stock,
                              lowThreshold: i.lowThreshold,
                              packSize: i.packSize,
                              packLabel: i.packLabel,
                              isActive: i.isActive,
                            }}
                          />
                        </div>
                      </details>
                    </li>
                  );
                })}
            </ul>
          </Card>
        ))}

        <Card>
          <h2 className="font-semibold">Dicek manual</h2>
          <p className="mb-3 text-sm text-kopi-muted">Karyawan mengisi kondisinya saat tutup kas. Anda juga bisa mengubahnya di sini setelah belanja.</p>
          <ul className="grid gap-3">
            {manual.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-kopi-muted">{m.checkedAt ? `Dicek ${formatDateTime(m.checkedAt)}` : "Belum pernah dicek"}</p>
                </div>
                <form action={setCheckStatusAction} className="flex flex-wrap items-center gap-1">
                  <input type="hidden" name="ingredientId" value={m.id} />
                  {(["aman", "menipis", "habis"] as const).map((s) => {
                    const on = m.checkStatus === s;
                    const color = s === "aman" ? "bg-daun" : s === "menipis" ? "bg-kunyit" : "bg-cabai";
                    return (
                      <button
                        key={s}
                        name="status"
                        value={s}
                        aria-pressed={on}
                        className={`press rounded-lg border px-2.5 py-1 text-sm ${on ? `${color} border-transparent text-white` : "border-garis bg-white"}`}
                      >
                        {CHECK_LABEL[s]}
                      </button>
                    );
                  })}
                  <button
                    formAction={makeAutoAction}
                    title="Jadikan hitung otomatis (angka stok, terpotong tiap penjualan)"
                    className="press ml-1 rounded-lg px-2 py-1 text-xs text-kopi-muted underline underline-offset-2 hover:text-teh"
                  >
                    hitung angka
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Tambah bahan baru</h2>
          <NewIngredientForm groups={[...new Set(all.map((i) => i.group))]} />
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold">Belanja terakhir</h2>
          {moves.length === 0 ? (
            <p className="text-sm text-kopi-muted">Belum ada catatan belanja.</p>
          ) : (
            <ul className="grid gap-1.5 text-sm">
              {moves.map((m) => (
                <li key={m.id} className="flex flex-wrap justify-between gap-x-3">
                  <span>
                    <span className="text-kopi-muted">{formatDateTime(m.createdAt)}</span> · {m.name}{" "}
                    <span className="text-kopi-muted">({m.note || REASON[m.reason]})</span>
                  </span>
                  <span className="num font-semibold text-daun">
                    +{formatQty(m.change)} {m.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
