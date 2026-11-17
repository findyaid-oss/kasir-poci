import { z } from "zod";
import { parseRupiah } from "./money";

/** Uang dalam rupiah dari input teks (boleh pakai titik: 100.000). */
export const rupiah = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : (parseRupiah(v) ?? Number.NaN)),
    z.number({ error: `Isi ${label}.` }).int({ error: `${label} harus angka bulat.` }).min(0, { error: `${label} tidak boleh minus.` }).max(1_000_000_000),
  );

/** Angka desimal dari input teks, koma atau titik sebagai pemisah desimal (0,5 atau 0.5). */
export const decimal = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(String(v).replace(",", "."))),
    z.number({ error: `Isi ${label}.` }).min(0, { error: `${label} tidak boleh minus.` }).max(1_000_000),
  );

export const saleSchema = z.object({
  paymentMethod: z.enum(["tunai", "qris"]),
  cashReceived: z.number().int().min(0).nullable().optional(),
  lines: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        qty: z.number().int().min(1).max(99),
        toppingIds: z.array(z.number().int().positive()).max(5),
      }),
    )
    .min(1, { error: "Pesanan masih kosong." })
    .max(50),
});

export const menuSchema = z.object({
  name: z.string().trim().min(2, { error: "Nama menu minimal 2 huruf." }).max(60),
  category: z.string().trim().min(2, { error: "Isi kategori, misalnya Es Teh atau Makanan." }).max(30),
  kind: z.enum(["minuman", "makanan", "topping"], { error: "Pilih jenis menu." }),
  price: rupiah("harga jual").refine((v) => v > 0, { error: "Harga jual harus lebih dari 0." }),
  hpp: rupiah("HPP"),
  isActive: z.boolean(),
  recipe: z.array(z.object({ ingredientId: z.number().int().positive(), qty: z.number().positive().max(100_000) })).max(20),
});

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, { error: "Nama bahan minimal 2 huruf." }).max(60),
  group: z.string().trim().min(2, { error: "Isi kelompok, misalnya Sachet minuman." }).max(40),
  unit: z.string().trim().min(1, { error: "Isi satuan, misalnya sachet, g, pcs." }).max(15),
  tracking: z.enum(["auto", "manual"]),
  lowThreshold: decimal("batas peringatan"),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(2, { error: "Isi nama kios." }).max(40),
  rentMonthly: rupiah("sewa per bulan"),
  electricityMonthly: rupiah("listrik per bulan"),
  securityMonthly: rupiah("keamanan per bulan"),
  otherMonthly: rupiah("biaya lain per bulan"),
  initialCapital: rupiah("modal awal"),
  startDate: z.union([z.literal(""), z.iso.date({ error: "Tanggal tidak valid." })]),
  targetDrinks: z.coerce.number().int().min(0).max(1000),
  targetFood: z.coerce.number().int().min(0).max(1000),
});

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
