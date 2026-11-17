import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Simpan satu pool saja selama development, supaya hot reload tidak membuka koneksi baru terus-menerus.
const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum diisi. Salin .env.example menjadi .env lalu isi koneksi database Anda.");
  }
  return new Pool({ connectionString, max: 5 });
}

const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
