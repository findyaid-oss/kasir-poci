import "server-only";
import { db } from "@/db";
import { listMenuWithRecipes, sortCategories } from "@/services/catalog";
import { listIngredients } from "@/services/stock";

export async function loadMenuFormData() {
  const [ingredients, menu] = await Promise.all([listIngredients(db), listMenuWithRecipes(db, { onlyActive: false })]);
  return {
    menu,
    categories: sortCategories(menu.map((m) => m.category)),
    ingredients: ingredients
      .filter((i) => i.tracking === "auto")
      .map((i) => ({ id: i.id, name: i.name, unit: i.unit, group: i.group })),
  };
}
