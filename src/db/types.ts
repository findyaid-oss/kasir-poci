import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/**
 * Tipe database yang dipakai service. Sengaja dibuat umum supaya service yang sama
 * bisa dijalankan dengan PostgreSQL asli (aplikasi) maupun PGlite (unit test).
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
