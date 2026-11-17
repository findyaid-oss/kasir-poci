import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ingredients, menuItems } from "@/db/schema";
import type { Db } from "@/db/types";
import { seedCatalog } from "@/services/catalog";
import { capitalProgress, dailyTotals, getSettings, itemSummary } from "@/services/reports";
import { createSale, voidSale } from "@/services/sales";
import { addCashMovement, deleteCashMovement } from "@/services/cash";
import { deleteSales, resetAllSales } from "@/services/maintenance";
import { closeShift, getOpenShift, openShift, shiftTotals } from "@/services/shifts";
import { addPurchase, listLowStock, setStock } from "@/services/stock";
import { createUser, verifyPin } from "@/services/users";
import { createTestDb } from "./test-db";

let db: Db;
let close: () => Promise<void>;
let ownerId: number;
let staffId: number;

const NOW = new Date("2026-11-20T10:00:00+08:00");

async function menuId(name: string) {
  const [m] = await db.select().from(menuItems).where(eq(menuItems.name, name));
  return m.id;
}
async function stockOf(name: string) {
  const [i] = await db.select().from(ingredients).where(eq(ingredients.name, name));
  return i.stock;
}
async function setAllStock(value: number) {
  await db.update(ingredients).set({ stock: value });
}

beforeEach(async () => {
  ({ db, close } = await createTestDb());
  await seedCatalog(db);
  ownerId = (await createUser(db, { name: "Pemilik", pin: "123456", role: "owner" })).id;
  staffId = (await createUser(db, { name: "Karyawan", pin: "1234", role: "staff" })).id;
  await setAllStock(1000);
});

afterEach(async () => close());

describe("penjualan", () => {
  it("menolak penjualan kalau kas belum dibuka", async () => {
    await expect(
      createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: await menuId("Milo"), qty: 1, toppingIds: [] }] }),
    ).rejects.toThrow("Kas belum dibuka");
  });

  it("menghitung total, kembalian, dan memotong stok sesuai resep + topping", async () => {
    await openShift(db, { userId: staffId, openingCash: 100_000 }, NOW);
    const sale = await createSale(
      db,
      {
        userId: staffId,
        paymentMethod: "tunai",
        cashReceived: 20_000,
        lines: [{ menuItemId: await menuId("Es Teh Susu"), qty: 2, toppingIds: [await menuId("Boba")] }],
      },
      NOW,
    );
    expect(sale.total).toBe(14_000); // 2 × (5.000 + 2.000)
    expect(sale.hppTotal).toBe(2 * (3339 + 750));
    expect(sale.change).toBe(6_000);
    expect(sale.businessDate).toBe("2026-11-20");

    // Teh celup & gula dicek manual, tidak dipotong angkanya
    expect(await stockOf("Teh celup Poci")).toBe(1000);
    expect(await stockOf("Gula pasir")).toBe(1000);
    expect(await stockOf("Susu kental manis")).toBe(998);
    expect(await stockOf("Cup 16 oz")).toBe(998);
    expect(await stockOf("Sedotan")).toBe(998);
    expect(await stockOf("Boba mentah")).toBe(940); // 2 × 30 g
  });

  it("menolak uang kurang dan topping untuk makanan", async () => {
    await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
    await expect(
      createSale(db, {
        userId: staffId,
        paymentMethod: "tunai",
        cashReceived: 5_000,
        lines: [{ menuItemId: await menuId("Kentang Goreng"), qty: 1, toppingIds: [] }],
      }),
    ).rejects.toThrow("kurang");
    await expect(
      createSale(db, {
        userId: staffId,
        paymentMethod: "qris",
        lines: [{ menuItemId: await menuId("Kentang Goreng"), qty: 1, toppingIds: [await menuId("Oreo Crumb")] }],
      }),
    ).rejects.toThrow("Topping hanya untuk minuman");
  });

  it("stok tetap benar saat banyak penjualan bersamaan", async () => {
    await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
    const milo = await menuId("Milo");
    await Promise.all(
      Array.from({ length: 8 }, () =>
        createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: milo, qty: 1, toppingIds: [] }] }, NOW),
      ),
    );
    expect(await stockOf("Milo")).toBe(992);
    expect(await stockOf("Cup 16 oz")).toBe(992);
  });

  it("pembatalan mengembalikan stok; karyawan tidak bisa membatalkan setelah tutup kas", async () => {
    const shift = await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
    const sale = await createSale(
      db,
      { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: await menuId("Mix Platter"), qty: 1, toppingIds: [] }] },
      NOW,
    );
    expect(await stockOf("Lunch box L")).toBe(999);
    await voidSale(db, { saleId: sale.id, userId: staffId, role: "staff", reason: "salah input" });
    expect(await stockOf("Lunch box L")).toBe(1000);
    await expect(voidSale(db, { saleId: sale.id, userId: staffId, role: "staff", reason: "lagi" })).rejects.toThrow("sudah dibatalkan");

    const sale2 = await createSale(
      db,
      { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: await menuId("Milo"), qty: 1, toppingIds: [] }] },
      NOW,
    );
    await closeShift(db, { shiftId: shift.id, userId: staffId, countedCash: 0, checks: [] });
    await expect(voidSale(db, { saleId: sale2.id, userId: staffId, role: "staff", reason: "salah" })).rejects.toThrow("sudah ditutup");
    await voidSale(db, { saleId: sale2.id, userId: ownerId, role: "owner", reason: "dibatalkan pemilik" });
    expect(await stockOf("Milo")).toBe(1000);
  });
});

describe("shift kas", () => {
  it("hanya satu kas yang boleh terbuka, dan tutup kas menghitung selisih", async () => {
    const shift = await openShift(db, { userId: staffId, openingCash: 100_000 }, NOW);
    await expect(openShift(db, { userId: ownerId, openingCash: 0 })).rejects.toThrow("sudah dibuka");

    await createSale(
      db,
      { userId: staffId, paymentMethod: "tunai", cashReceived: 10_000, lines: [{ menuItemId: await menuId("Es Teh Poci Original"), qty: 2, toppingIds: [] }] },
      NOW,
    );
    await createSale(
      db,
      { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: await menuId("Kentang Goreng"), qty: 1, toppingIds: [] }] },
      NOW,
    );

    const [kentang] = await db.select().from(ingredients).where(eq(ingredients.name, "Kentang"));
    const result = await closeShift(db, {
      shiftId: shift.id,
      userId: staffId,
      countedCash: 105_000,
      checks: [{ ingredientId: kentang.id, status: "menipis" }],
    });
    expect(result.expectedCash).toBe(106_000); // 100.000 + 6.000 tunai (QRIS tidak masuk laci)
    expect(result.difference).toBe(-1_000);
    expect(result.totals.qrisSales).toBe(8_000);

    const low = await listLowStock(db);
    expect(low.map((l) => l.name)).toContain("Kentang");
  });
});

describe("stok", () => {
  it("belanja = jumlah kemasan × isi, isi diingat; hitung ulang mencatat koreksi", async () => {
    await setStock(db, { ingredientId: (await db.select().from(ingredients).where(eq(ingredients.name, "Milo")))[0].id, stock: 2, userId: ownerId });
    expect((await listLowStock(db)).map((l) => l.name)).toContain("Milo");

    const [milo] = await db.select().from(ingredients).where(eq(ingredients.name, "Milo"));
    const res = await addPurchase(db, { ingredientId: milo.id, packs: 3, packSize: 10, userId: ownerId });
    expect(res.stock).toBe(32);
    const [after] = await db.select().from(ingredients).where(eq(ingredients.id, milo.id));
    expect(after.stock).toBe(32);
    expect(after.packSize).toBe(10);
    expect((await listLowStock(db)).map((l) => l.name)).not.toContain("Milo");
  });
});

describe("rekap", () => {
  it("menghitung cup, porsi, omzet, laba kotor per hari dan per menu, tanpa transaksi batal", async () => {
    await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
    const esTeh = await menuId("Es Teh Poci Original");
    const boba = await menuId("Boba");
    await createSale(db, { userId: staffId, paymentMethod: "tunai", lines: [{ menuItemId: esTeh, qty: 3, toppingIds: [boba] }] }, NOW);
    await createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: await menuId("Nugget (6 pcs)"), qty: 1, toppingIds: [] }] }, NOW);
    const batal = await createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: esTeh, qty: 5, toppingIds: [] }] }, NOW);
    await voidSale(db, { saleId: batal.id, userId: staffId, role: "staff", reason: "salah input" });

    const [day] = await dailyTotals(db, "2026-11-20", "2026-11-20");
    expect(day.cups).toBe(3);
    expect(day.porsi).toBe(1);
    expect(day.omzet).toBe(3 * 5000 + 8000);
    expect(day.tunai).toBe(15_000);
    expect(day.qris).toBe(8_000);
    expect(day.labaKotor).toBe(23_000 - (3 * (2017 + 750) + 6422));

    const items = await itemSummary(db, "2026-11-20");
    expect(items.find((i) => i.name === "Es Teh Poci Original")?.qty).toBe(3);
    expect(items.find((i) => i.name === "Boba")?.qty).toBe(3);

    const s = await getSettings(db);
    const cap = await capitalProgress(db, s, "2026-11-21");
    expect(cap.days).toBe(2);
    expect(cap.labaKotor).toBe(day.labaKotor);
  });
});

describe("login PIN", () => {
  it("mengunci akun setelah 5 kali salah", async () => {
    for (let i = 0; i < 4; i++) await expect(verifyPin(db, staffId, "0000", NOW)).rejects.toThrow("PIN salah");
    await expect(verifyPin(db, staffId, "0000", NOW)).rejects.toThrow("dikunci");
    await expect(verifyPin(db, staffId, "1234", NOW)).rejects.toThrow("Coba lagi");
    const later = new Date(NOW.getTime() + 6 * 60_000);
    expect((await verifyPin(db, staffId, "1234", later)).id).toBe(staffId);
  });
});

describe("kas masuk / keluar", () => {
  it("ikut dihitung di uang yang seharusnya ada di laci", async () => {
    const shift = await openShift(db, { userId: staffId, openingCash: 50_000 }, NOW);
    await expect(addCashMovement(db, { userId: staffId, type: "keluar", amount: 10_000, note: "" })).rejects.toThrow("keterangan");
    await addCashMovement(db, { userId: staffId, type: "keluar", amount: 12_000, note: "beli es batu" }, NOW);
    const masuk = await addCashMovement(db, { userId: ownerId, type: "masuk", amount: 20_000, note: "tambah uang kembalian" }, NOW);
    await createSale(
      db,
      { userId: staffId, paymentMethod: "tunai", lines: [{ menuItemId: await menuId("Milo"), qty: 1, toppingIds: [] }] },
      NOW,
    );
    const totals = await shiftTotals(db, shift.id);
    expect(totals.cashIn).toBe(20_000);
    expect(totals.cashOut).toBe(12_000);

    const res = await closeShift(db, { shiftId: shift.id, userId: staffId, countedCash: 64_000, checks: [] });
    expect(res.expectedCash).toBe(50_000 + 6_000 + 20_000 - 12_000);
    expect(res.difference).toBe(0);

    await expect(deleteCashMovement(db, { id: masuk.id, role: "staff" })).rejects.toThrow("sudah ditutup");
    await deleteCashMovement(db, { id: masuk.id, role: "owner" });
  });

  it("menolak kas masuk/keluar kalau kas belum dibuka", async () => {
    await expect(addCashMovement(db, { userId: staffId, type: "masuk", amount: 1000, note: "modal" })).rejects.toThrow("belum dibuka");
  });
});

describe("hapus & reset transaksi (untuk uji coba)", () => {
  it("hapus terpilih mengembalikan stok; transaksi yang sudah dibatalkan tidak dobel", async () => {
    await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
    const milo = await menuId("Milo");
    const a = await createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: milo, qty: 2, toppingIds: [] }] }, NOW);
    const b = await createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: milo, qty: 1, toppingIds: [] }] }, NOW);
    const c = await createSale(db, { userId: staffId, paymentMethod: "qris", lines: [{ menuItemId: milo, qty: 3, toppingIds: [] }] }, NOW);
    await voidSale(db, { saleId: b.id, userId: staffId, role: "staff", reason: "salah input" });
    expect(await stockOf("Milo")).toBe(995);

    expect(await deleteSales(db, [a.id, b.id])).toBe(2);
    expect(await stockOf("Milo")).toBe(997); // hanya transaksi c yang tersisa
    expect(await stockOf("Cup 16 oz")).toBe(997);
    const [day] = await dailyTotals(db, "2026-11-20", "2026-11-20");
    expect(day.cups).toBe(3);
    expect(c.id).toBeGreaterThan(0);
  });

  it("reset semua menghapus transaksi, shift, dan kas; stok kembali; menu tetap", async () => {
    await openShift(db, { userId: staffId, openingCash: 10_000 }, NOW);
    await createSale(
      db,
      { userId: staffId, paymentMethod: "tunai", lines: [{ menuItemId: await menuId("Es Teh Susu"), qty: 2, toppingIds: [await menuId("Boba")] }] },
      NOW,
    );
    await addCashMovement(db, { userId: staffId, type: "keluar", amount: 5_000, note: "beli es batu" }, NOW);
    expect(await stockOf("Boba mentah")).toBe(940);

    expect(await resetAllSales(db)).toBe(1);
    expect(await stockOf("Boba mentah")).toBe(1000);
    expect(await stockOf("Susu kental manis")).toBe(1000);
    expect(await getOpenShift(db)).toBeNull();
    expect(await dailyTotals(db, "2026-11-20", "2026-11-20")).toEqual([]);
    expect(await menuId("Es Teh Susu")).toBeGreaterThan(0);

    // Bisa langsung buka kas lagi
    await openShift(db, { userId: staffId, openingCash: 0 }, NOW);
  });
});
