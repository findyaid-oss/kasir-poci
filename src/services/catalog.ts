import { asc, eq, inArray, max } from "drizzle-orm";
import { CATEGORY_ORDER, SEED_INGREDIENTS, SEED_MENU } from "@/db/catalog";
import { ingredients, menuItems, recipeItems, settings, type Ingredient, type MenuItem } from "@/db/schema";
import type { Db } from "@/db/types";

/**
 * Mengisi bahan, menu, resep, dan pengaturan awal. Aman dijalankan berkali-kali:
 * bahan/menu yang namanya sudah ada tidak diubah.
 */
export async function seedCatalog(db: Db) {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  await db
    .insert(ingredients)
    .values(
      SEED_INGREDIENTS.map((i, idx) => ({
        name: i.name,
        group: i.group,
        unit: i.unit,
        tracking: i.tracking,
        lowThreshold: i.lowThreshold,
        packLabel: i.packLabel ?? "kemasan",
        packSize: i.packSize ?? 1,
        stock: i.stock ?? 0,
        checkStatus: i.tracking === "manual" ? ("aman" as const) : null,
        sortOrder: idx,
      })),
    )
    .onConflictDoNothing({ target: ingredients.name });

  const allIngredients = await db.select().from(ingredients);
  const byName = new Map(allIngredients.map((i) => [i.name, i.id]));

  const existingMenu = await db.select({ name: menuItems.name }).from(menuItems);
  const existing = new Set(existingMenu.map((m) => m.name));

  for (const [idx, m] of SEED_MENU.entries()) {
    if (existing.has(m.name)) continue;
    const [created] = await db
      .insert(menuItems)
      .values({ name: m.name, category: m.category, kind: m.kind, price: m.price, hpp: m.hpp, sortOrder: idx })
      .returning();
    const rows = Object.entries(m.recipe).map(([ingredientName, qty]) => {
      const ingredientId = byName.get(ingredientName);
      if (!ingredientId) throw new Error(`Bahan "${ingredientName}" untuk menu ${m.name} tidak ditemukan.`);
      return { menuItemId: created.id, ingredientId, qty };
    });
    if (rows.length) await db.insert(recipeItems).values(rows);
  }
}

export function sortCategories(categories: string[]): string[] {
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...new Set(categories)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export type MenuWithRecipe = MenuItem & {
  recipe: { ingredientId: number; qty: number; name: string; unit: string; tracking: Ingredient["tracking"] }[];
};

export async function listMenuWithRecipes(db: Db, { onlyActive }: { onlyActive: boolean }): Promise<MenuWithRecipe[]> {
  const items = await db
    .select()
    .from(menuItems)
    .where(onlyActive ? eq(menuItems.isActive, true) : undefined)
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  if (items.length === 0) return [];

  const recipes = await db
    .select({
      menuItemId: recipeItems.menuItemId,
      ingredientId: recipeItems.ingredientId,
      qty: recipeItems.qty,
      name: ingredients.name,
      unit: ingredients.unit,
      tracking: ingredients.tracking,
    })
    .from(recipeItems)
    .innerJoin(ingredients, eq(recipeItems.ingredientId, ingredients.id))
    .where(
      inArray(
        recipeItems.menuItemId,
        items.map((i) => i.id),
      ),
    )
    .orderBy(asc(ingredients.sortOrder));

  return items.map((item) => ({
    ...item,
    recipe: recipes
      .filter((r) => r.menuItemId === item.id)
      .map(({ ingredientId, qty, name, unit, tracking }) => ({ ingredientId, qty, name, unit, tracking })),
  }));
}

export type MenuInput = {
  name: string;
  category: string;
  kind: MenuItem["kind"];
  price: number;
  hpp: number;
  isActive: boolean;
  recipe: { ingredientId: number; qty: number }[];
};

/** Simpan menu baru atau ubah menu lama, termasuk resepnya (resep lama diganti seluruhnya). */
export async function saveMenuItem(db: Db, input: MenuInput, id?: number): Promise<MenuItem> {
  return db.transaction(async (tx) => {
    const values = {
      name: input.name,
      category: input.category,
      kind: input.kind,
      price: input.price,
      hpp: input.hpp,
      isActive: input.isActive,
    };
    let item: MenuItem;
    if (id) {
      [item] = await tx.update(menuItems).set(values).where(eq(menuItems.id, id)).returning();
      if (!item) throw new Error("Menu tidak ditemukan.");
      await tx.delete(recipeItems).where(eq(recipeItems.menuItemId, id));
    } else {
      const [{ last }] = await tx.select({ last: max(menuItems.sortOrder) }).from(menuItems);
      [item] = await tx
        .insert(menuItems)
        .values({ ...values, sortOrder: (last ?? 0) + 1 })
        .returning();
    }
    const merged = new Map<number, number>();
    for (const r of input.recipe) if (r.qty > 0) merged.set(r.ingredientId, (merged.get(r.ingredientId) ?? 0) + r.qty);
    if (merged.size) {
      await tx
        .insert(recipeItems)
        .values([...merged].map(([ingredientId, qty]) => ({ menuItemId: item.id, ingredientId, qty })));
    }
    return item;
  });
}
