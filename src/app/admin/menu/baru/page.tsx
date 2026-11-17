import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, PageHeading } from "@/components/ui";
import { requireOwner } from "@/lib/auth/session";
import { loadMenuFormData } from "../load";
import { MenuForm } from "../menu-form";

export const metadata: Metadata = { title: "Menu baru" };

export default function NewMenuPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireOwner();
  const { ingredients, categories } = await loadMenuFormData();
  return (
    <div className="max-w-2xl">
      <PageHeading title="Menu baru" />
      <MenuForm
        ingredients={ingredients}
        categories={categories}
        initial={{
          name: "",
          category: "",
          kind: "minuman",
          price: 0,
          hpp: 0,
          isActive: true,
          // Semua minuman memakai cup & sedotan
          recipe: ingredients.filter((i) => i.name === "Cup 16 oz" || i.name === "Sedotan").map((i) => ({ ingredientId: i.id, qty: 1 })),
        }}
      />
    </div>
  );
}
