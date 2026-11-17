import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrasi memakai koneksi langsung (unpooled) kalau ada, seperti yang disediakan integrasi Neon di Vercel.
    url: (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL)!,
  },
});
