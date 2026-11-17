/**
 * Data awal kios: bahan, menu, harga, HPP, dan resep.
 * Dipakai oleh `npm run db:seed` dan oleh tes. Setelah aplikasi berjalan, semua ini bisa diubah
 * dari halaman admin, jadi file ini hanya titik awal.
 */

type SeedIngredient = {
  name: string;
  group: string;
  unit: string;
  tracking: "auto" | "manual";
  lowThreshold: number;
  packLabel?: string;
  packSize?: number;
  stock?: number;
};

const sachet = (name: string): SeedIngredient => ({
  name,
  group: "Sachet minuman",
  unit: "sachet",
  tracking: "auto",
  lowThreshold: 3,
  packLabel: "renceng",
  packSize: 10,
});

export const SEED_INGREDIENTS: SeedIngredient[] = [
  // Bahan teh
  { name: "Teh celup Poci", group: "Bahan teh", unit: "kantong", tracking: "auto", lowThreshold: 3, packLabel: "kotak", packSize: 25 },
  { name: "Gula pasir", group: "Bahan teh", unit: "g", tracking: "auto", lowThreshold: 500, packLabel: "bungkus 1 kg", packSize: 1000 },
  sachet("Poci Es Teh Tarik Gula Aren"),
  sachet("Susu kental manis"),

  // Sachet minuman
  sachet("NutriSari Sweet Guava"),
  sachet("NutriSari Jeruk Nipis"),
  sachet("NutriSari Jeruk Manis"),
  sachet("NutriSari Florida Orange"),
  sachet("NutriSari Apple Tea"),
  sachet("NutriSari Lychee Tea"),
  sachet("Pop Ice Melon"),
  sachet("Pop Ice Blueberry"),
  sachet("Pop Ice Cokelat"),
  sachet("Pop Ice Strawberry"),
  sachet("Pop Ice Avocado"),
  sachet("Chocolatos Drink"),
  sachet("Energen Kacang Hijau"),
  sachet("Milo"),
  sachet("GoodDay Vanilla Latte"),
  sachet("GoodDay Chococino"),
  sachet("GoodDay Cappuccino"),
  sachet("GoodDay Mocafrio Freeze"),
  sachet("Torabika Cappuccino"),
  sachet("Top Coffee Avocado"),
  sachet("ABC Kopi Susu"),
  sachet("ABC Plus Gula"),
  sachet("ExtraJoss"),

  // Topping
  { name: "Boba mentah", group: "Topping", unit: "g", tracking: "auto", lowThreshold: 100, packLabel: "bungkus", packSize: 1000 },
  { name: "Oreo crumb", group: "Topping", unit: "g", tracking: "auto", lowThreshold: 100, packLabel: "bungkus", packSize: 500 },

  // Kemasan
  { name: "Cup 16 oz", group: "Kemasan", unit: "pcs", tracking: "auto", lowThreshold: 10, packLabel: "pak", packSize: 50, stock: 150 },
  { name: "Sedotan", group: "Kemasan", unit: "pcs", tracking: "auto", lowThreshold: 10, packLabel: "pak", packSize: 100 },
  { name: "Cup plastik kecil", group: "Kemasan", unit: "pcs", tracking: "auto", lowThreshold: 10, packLabel: "pak", packSize: 50 },
  { name: "Lunch box L", group: "Kemasan", unit: "pcs", tracking: "auto", lowThreshold: 10, packLabel: "pak", packSize: 50, stock: 50 },

  // Dicek manual saat tutup kas
  { name: "Film seal", group: "Cek manual", unit: "gulung", tracking: "manual", lowThreshold: 0 },
  { name: "Kentang", group: "Cek manual", unit: "g", tracking: "manual", lowThreshold: 0 },
  { name: "Sosis", group: "Cek manual", unit: "pcs", tracking: "manual", lowThreshold: 0 },
  { name: "Nugget", group: "Cek manual", unit: "pcs", tracking: "manual", lowThreshold: 0 },
  { name: "Saus", group: "Cek manual", unit: "botol", tracking: "manual", lowThreshold: 0 },
  { name: "Tusuk", group: "Cek manual", unit: "pak", tracking: "manual", lowThreshold: 0 },
  { name: "Tisu", group: "Cek manual", unit: "pak", tracking: "manual", lowThreshold: 0 },
];

type SeedMenu = {
  name: string;
  category: string;
  kind: "minuman" | "makanan" | "topping";
  price: number;
  hpp: number;
  /** Bahan yang dihitung otomatis, selain cup & sedotan yang ditambahkan untuk semua minuman. */
  recipe: Record<string, number>;
};

const TEH = { "Teh celup Poci": 0.5, "Gula pasir": 15 };
const drink = (category: string, name: string, price: number, hpp: number, recipe: Record<string, number>): SeedMenu => ({
  name,
  category,
  kind: "minuman",
  price,
  hpp,
  recipe: { ...recipe, "Cup 16 oz": 1, Sedotan: 1 },
});

export const SEED_MENU: SeedMenu[] = [
  drink("Es Teh", "Es Teh Poci Original", 3000, 2017, { ...TEH }),
  drink("Es Teh", "Es Teh Susu", 5000, 3339, { ...TEH, "Susu kental manis": 1 }),
  drink("Es Teh", "Es Teh Jeruk Nipis", 5000, 3189, { ...TEH, "NutriSari Jeruk Nipis": 1 }),
  drink("Es Teh", "Es Teh Leci", 5000, 3089, { ...TEH, "NutriSari Lychee Tea": 1 }),
  drink("Es Teh", "Teh Tarik Gula Aren", 6000, 3347, { "Poci Es Teh Tarik Gula Aren": 1 }),

  drink("NutriSari", "NutriSari Sweet Guava", 5000, 2997, { "NutriSari Sweet Guava": 1 }),
  drink("NutriSari", "NutriSari Jeruk Nipis", 5000, 2997, { "NutriSari Jeruk Nipis": 1 }),
  drink("NutriSari", "NutriSari Jeruk Manis", 5000, 2997, { "NutriSari Jeruk Manis": 1 }),
  drink("NutriSari", "NutriSari Florida Orange", 5000, 2997, { "NutriSari Florida Orange": 1 }),
  drink("NutriSari", "NutriSari Apple Tea", 5000, 2897, { "NutriSari Apple Tea": 1 }),
  drink("NutriSari", "NutriSari Lychee Tea", 5000, 2897, { "NutriSari Lychee Tea": 1 }),

  drink("Milk", "Pop Ice Melon", 5000, 2697, { "Pop Ice Melon": 1 }),
  drink("Milk", "Pop Ice Blueberry", 5000, 2697, { "Pop Ice Blueberry": 1 }),
  drink("Milk", "Pop Ice Cokelat", 5000, 2697, { "Pop Ice Cokelat": 1 }),
  drink("Milk", "Pop Ice Strawberry", 5000, 2697, { "Pop Ice Strawberry": 1 }),
  drink("Milk", "Pop Ice Avocado", 5000, 2697, { "Pop Ice Avocado": 1 }),
  drink("Milk", "Chocolatos", 6000, 3617, { "Chocolatos Drink": 1 }),
  drink("Milk", "Energen Kacang Hijau", 6000, 3597, { "Energen Kacang Hijau": 1 }),
  drink("Milk", "Milo", 6000, 4097, { Milo: 1 }),

  drink("Kopi", "GoodDay Vanilla Latte", 5000, 2987, { "GoodDay Vanilla Latte": 1 }),
  drink("Kopi", "GoodDay Chococino", 5000, 2987, { "GoodDay Chococino": 1 }),
  drink("Kopi", "ABC Kopi Susu", 5000, 2847, { "ABC Kopi Susu": 1 }),
  drink("Kopi", "ABC Kopi Hitam", 5000, 2647, { "ABC Plus Gula": 1 }),
  drink("Kopi", "GoodDay Cappuccino", 6000, 3597, { "GoodDay Cappuccino": 1 }),
  drink("Kopi", "GoodDay Mocafrio Freeze", 6000, 3797, { "GoodDay Mocafrio Freeze": 1 }),
  drink("Kopi", "Torabika Cappuccino", 6000, 3647, { "Torabika Cappuccino": 1 }),
  drink("Kopi", "Kopi Alpukat", 6000, 3347, { "Top Coffee Avocado": 1 }),

  drink("ExtraJoss", "ExtraJoss", 5000, 2847, { ExtraJoss: 1 }),
  drink("ExtraJoss", "ExtraJoss Susu", 6000, 4447, { ExtraJoss: 1, "Susu kental manis": 1 }),

  { name: "Kentang Goreng", category: "Makanan", kind: "makanan", price: 8000, hpp: 4954, recipe: { "Lunch box L": 1 } },
  { name: "Sosis (4 pcs)", category: "Makanan", kind: "makanan", price: 8000, hpp: 4346, recipe: { "Cup plastik kecil": 1 } },
  { name: "Nugget (6 pcs)", category: "Makanan", kind: "makanan", price: 8000, hpp: 6422, recipe: { "Cup plastik kecil": 1 } },
  { name: "Mix Platter", category: "Makanan", kind: "makanan", price: 12000, hpp: 7809, recipe: { "Lunch box L": 1 } },

  { name: "Boba", category: "Topping", kind: "topping", price: 2000, hpp: 750, recipe: { "Boba mentah": 30 } },
  { name: "Oreo Crumb", category: "Topping", kind: "topping", price: 2000, hpp: 700, recipe: { "Oreo crumb": 10 } },
];

/** Urutan kategori di layar kasir. Kategori baru otomatis muncul di belakang. */
export const CATEGORY_ORDER = ["Es Teh", "NutriSari", "Milk", "Kopi", "ExtraJoss", "Makanan"];
