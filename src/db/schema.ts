import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* ---------- Pengguna ---------- */

export const roleEnum = pgEnum("role", ["owner", "staff"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("staff"),
  pinHash: text("pin_hash").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  /** Penguncian sementara setelah PIN salah berkali-kali, supaya PIN 4 digit tidak bisa ditebak. */
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Bahan & stok ---------- */

/**
 * auto   : stok berupa angka yang otomatis berkurang setiap penjualan (sachet, gula, cup, dll).
 * manual : tidak dihitung angkanya, cukup dicek karyawan saat tutup kas (kentang, sosis, saus, dll).
 */
export const trackingEnum = pgEnum("tracking", ["auto", "manual"]);
export const checkStatusEnum = pgEnum("check_status", ["aman", "menipis", "habis"]);

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  /** Kelompok tampilan di halaman stok, misalnya "Sachet", "Kemasan". */
  group: text("group").notNull(),
  /** Satuan stok: sachet, kantong, g, pcs. */
  unit: text("unit").notNull(),
  tracking: trackingEnum("tracking").notNull().default("auto"),
  stock: numeric("stock", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  /** Peringatan muncul kalau stok sudah sama atau di bawah angka ini. */
  lowThreshold: numeric("low_threshold", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  /** Isi per kemasan beli terakhir (mis. 1 renceng = 10 sachet), diingat untuk belanja berikutnya. */
  packSize: numeric("pack_size", { precision: 12, scale: 2, mode: "number" }).notNull().default(1),
  packLabel: text("pack_label").notNull().default("kemasan"),
  /** Untuk bahan "manual": hasil cek terakhir. */
  checkStatus: checkStatusEnum("check_status"),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  checkedBy: integer("checked_by").references(() => users.id),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

/* ---------- Menu ---------- */

/** minuman dihitung sebagai "cup", makanan sebagai "porsi", topping ditambahkan ke minuman. */
export const menuKindEnum = pgEnum("menu_kind", ["minuman", "makanan", "topping"]);

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  kind: menuKindEnum("kind").notNull(),
  price: integer("price").notNull(),
  /** Modal per cup/porsi (HPP), diisi pemilik. */
  hpp: integer("hpp").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Resep: bahan apa saja dan berapa banyak yang terpakai untuk 1 cup/porsi. */
export const recipeItems = pgTable(
  "recipe_items",
  {
    id: serial("id").primaryKey(),
    menuItemId: integer("menu_item_id")
      .notNull()
      .references(() => menuItems.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    qty: numeric("qty", { precision: 12, scale: 2, mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("recipe_menu_ingredient").on(t.menuItemId, t.ingredientId)],
);

/* ---------- Shift kas ---------- */

export const shifts = pgTable(
  "shifts",
  {
    id: serial("id").primaryKey(),
    openedBy: integer("opened_by")
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    businessDate: date("business_date").notNull(),
    openingCash: integer("opening_cash").notNull(),
    closedBy: integer("closed_by").references(() => users.id),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** Uang yang seharusnya ada di laci saat tutup: kas awal + penjualan tunai. */
    expectedCash: integer("expected_cash"),
    countedCash: integer("counted_cash"),
    note: text("note").notNull().default(""),
  },
  // Kios hanya punya satu laci, jadi hanya boleh ada satu shift yang terbuka.
  (t) => [uniqueIndex("one_open_shift").on(sql`(1)`).where(sql`${t.closedAt} is null`)],
);

/** Hasil cek bahan manual saat tutup kas. */
export const stockChecks = pgTable("stock_checks", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id")
    .notNull()
    .references(() => shifts.id),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id),
  status: checkStatusEnum("status").notNull(),
});

/* ---------- Penjualan ---------- */

export const paymentEnum = pgEnum("payment_method", ["tunai", "qris"]);
export const saleStatusEnum = pgEnum("sale_status", ["lunas", "batal"]);

export const sales = pgTable(
  "sales",
  {
    id: serial("id").primaryKey(),
    shiftId: integer("shift_id")
      .notNull()
      .references(() => shifts.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    businessDate: date("business_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paymentMethod: paymentEnum("payment_method").notNull(),
    total: integer("total").notNull(),
    hppTotal: integer("hpp_total").notNull(),
    cashReceived: integer("cash_received"),
    change: integer("change"),
    status: saleStatusEnum("status").notNull().default("lunas"),
    voidReason: text("void_reason"),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: integer("voided_by").references(() => users.id),
  },
  (t) => [index("sales_business_date").on(t.businessDate), index("sales_shift").on(t.shiftId)],
);

/**
 * Baris penjualan. Nama, harga, dan HPP disalin saat transaksi supaya rekap lama
 * tidak berubah ketika harga menu diubah. Topping disimpan sebagai baris anak (parentId).
 */
export const saleItems = pgTable(
  "sale_items",
  {
    id: serial("id").primaryKey(),
    saleId: integer("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => saleItems.id, { onDelete: "cascade" }),
    menuItemId: integer("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    kind: menuKindEnum("kind").notNull(),
    qty: integer("qty").notNull(),
    unitPrice: integer("unit_price").notNull(),
    unitHpp: integer("unit_hpp").notNull(),
  },
  (t) => [index("sale_items_sale").on(t.saleId)],
);

/* ---------- Kas masuk / keluar (di luar penjualan) ---------- */

export const cashTypeEnum = pgEnum("cash_type", ["masuk", "keluar"]);

/** Uang yang masuk/keluar laci selain dari penjualan, mis. beli es batu, tambah uang kembalian. */
export const cashMovements = pgTable(
  "cash_movements",
  {
    id: serial("id").primaryKey(),
    shiftId: integer("shift_id")
      .notNull()
      .references(() => shifts.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    businessDate: date("business_date").notNull(),
    type: cashTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    note: text("note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("cash_movements_shift").on(t.shiftId), index("cash_movements_date").on(t.businessDate)],
);

/* ---------- Riwayat pergerakan stok ---------- */

export const movementReasonEnum = pgEnum("movement_reason", ["jual", "batal", "belanja", "koreksi"]);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    change: numeric("change", { precision: 12, scale: 2, mode: "number" }).notNull(),
    stockAfter: numeric("stock_after", { precision: 12, scale: 2, mode: "number" }).notNull(),
    reason: movementReasonEnum("reason").notNull(),
    saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
    userId: integer("user_id").references(() => users.id),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stock_movements_ingredient").on(t.ingredientId)],
);

/* ---------- Pengaturan usaha (satu baris) ---------- */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("Kios Poci"),
  rentMonthly: integer("rent_monthly").notNull().default(666_667),
  electricityMonthly: integer("electricity_monthly").notNull().default(200_000),
  securityMonthly: integer("security_monthly").notNull().default(50_000),
  otherMonthly: integer("other_monthly").notNull().default(0),
  initialCapital: integer("initial_capital").notNull().default(5_280_680),
  /** Tanggal mulai usaha, untuk menghitung progres balik modal. */
  startDate: date("start_date"),
  targetDrinks: integer("target_drinks").notNull().default(7),
  targetFood: integer("target_food").notNull().default(5),
});

export type User = typeof users.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type CashMovement = typeof cashMovements.$inferSelect;
export type CheckStatus = (typeof checkStatusEnum.enumValues)[number];
export type MenuKind = (typeof menuKindEnum.enumValues)[number];
