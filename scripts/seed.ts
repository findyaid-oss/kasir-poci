/**
 * Mengisi database dengan data awal: akun pemilik, bahan, menu, harga, HPP, dan resep.
 * Jalankan: npm run db:seed
 * Aman dijalankan berkali-kali (data yang sudah ada tidak digandakan atau diubah).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import type { Db } from "../src/db/types";
import { seedCatalog } from "../src/services/catalog";

async function main() {
  const name = process.env.OWNER_NAME?.trim();
  const pin = process.env.OWNER_PIN?.trim();
  if (!process.env.DATABASE_URL || !name || !pin) {
    throw new Error("Isi DATABASE_URL, OWNER_NAME, dan OWNER_PIN di file .env terlebih dahulu.");
  }
  if (!/^\d{4,6}$/.test(pin)) throw new Error("OWNER_PIN harus 4–6 angka.");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema }) as unknown as Db;

  const [owner] = await db.select().from(schema.users).where(eq(schema.users.role, "owner")).limit(1);
  if (!owner) {
    await db.insert(schema.users).values({ name, role: "owner", pinHash: await bcrypt.hash(pin, 10) });
    console.log(`✓ Akun pemilik "${name}" dibuat.`);
  } else {
    console.log(`• Akun pemilik sudah ada (${owner.name}), tidak diubah.`);
  }

  await seedCatalog(db);
  console.log("✓ Bahan, menu, harga, HPP, dan resep siap.");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
