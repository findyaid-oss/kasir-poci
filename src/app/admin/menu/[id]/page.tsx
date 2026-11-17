import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading, PageHeading } from "@/components/ui";
import { requireOwner } from "@/lib/auth/session";
import { loadMenuFormData } from "../load";
import { MenuForm } from "../menu-form";

export const metadata: Metadata = { title: "Ubah menu" };

export default function EditMenuPage({ params }: PageProps<"/admin/menu/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/admin/menu/[id]">["params"] }) {
  await requireOwner();
  const id = Number((await params).id);
  const { ingredients, categories, menu } = await loadMenuFormData();
  const item = menu.find((m) => m.id === id);
  if (!item) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeading title={`Ubah: ${item.name}`} />
      <MenuForm
        ingredients={ingredients}
        categories={categories}
        initial={{
          id: item.id,
          name: item.name,
          category: item.category,
          kind: item.kind,
          price: item.price,
          hpp: item.hpp,
          isActive: item.isActive,
          recipe: item.recipe.filter((r) => r.tracking === "auto").map((r) => ({ ingredientId: r.ingredientId, qty: r.qty })),
        }}
      />
    </div>
  );
}
