#!/bin/sh
# Dijalankan otomatis oleh Vercel setiap deploy (lihat "vercel-build" di package.json):
# 1. buat/ubah tabel database (migrasi)  2. isi data awal kalau belum ada  3. build aplikasi.
# Kalau database belum dihubungkan, langkah 1–2 dilewati supaya deploy pertama tetap berhasil.
set -e
if [ -n "$DATABASE_URL" ]; then
  echo "→ Migrasi database"
  npx drizzle-kit migrate
  echo "→ Data awal (menu, bahan, akun pemilik)"
  npx tsx scripts/seed.ts
else
  echo "⚠ DATABASE_URL belum ada: hubungkan database Neon di Vercel → Storage, lalu Redeploy."
  # Build tidak menghubungi database, jadi nilai sementara cukup supaya build tetap selesai.
  export DATABASE_URL="postgresql://belum-diatur@localhost:5432/belum-diatur"
fi
npx next build
