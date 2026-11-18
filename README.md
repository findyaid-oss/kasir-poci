# Kasir Poci

Kasir sederhana untuk kios es teh Poci, minuman sachet, dan gorengan frozen. Dibuat untuk dipakai di HP sambil melayani pembeli: tombol menu besar per kategori, bayar tunai dengan kembalian otomatis atau QRIS, stok terpotong sendiri, dan rekap harian lengkap untuk pemilik.

| Jualan | Bayar | Tutup kas | Rekap pemilik |
|---|---|---|---|
| ![Kasir](docs/screenshots/kasir.png) | ![Bayar](docs/screenshots/bayar.png) | ![Tutup kas](docs/screenshots/tutup-kas.png) | ![Rekap](docs/screenshots/rekap.png) |

## Cara pakai sehari-hari

**Karyawan**
1. **Masuk** dengan memilih nama lalu mengetik PIN.
2. **Buka kas**: isi jumlah uang yang ada di laci.
3. **Jualan**: ketuk menu, atur jumlah, ketuk topping (Boba / Oreo) bila perlu, lalu **Tambah**. Ketuk **Bayar**, pilih **Tunai** (ketuk uang yang diterima, kembalian muncul) atau **QRIS**, lalu **Simpan**.
4. **Kas masuk / keluar**: uang yang keluar/masuk laci selain jualan (beli es batu, tambah uang kembalian) dicatat di menu **Kas**, dan otomatis ikut dihitung saat tutup kas.
5. **Salah input?** Buka **Transaksi**, tekan **Batalkan**, dan tulis alasannya. Stok otomatis dikembalikan. Karyawan hanya bisa membatalkan selama kas shift-nya masih terbuka.
6. **Tutup kas** sebelum pulang:
   - Hitung uang di laci. Sistem menunjukkan berapa yang seharusnya ada dan selisihnya.
   - Cek teh celup, gula, kentang, sosis, nugget, saus, tusuk, tisu, dan film seal: pilih **Masih banyak / Setengah / Habis**.

**Pemilik** (menu **Admin**, selalu minta PIN lagi dan terkunci otomatis setelah 30 menit)
- **Rekap**:
  - omzet (tunai dan QRIS)
  - laba kotor
  - cup dan porsi per menu
  - apakah biaya tetap hari itu sudah tertutup
  - target harian dan progres balik modal

  Pilih tanggal untuk melihat hari sebelumnya.
- **Riwayat**: rekap per hari untuk rentang tanggal, plus **Ekspor Excel**.
- **Stok**:
  - **Belanja**: isi jumlah kemasan × isi per kemasan. Isi per kemasan diingat untuk belanja berikutnya.
  - **Hitung ulang**: samakan stok dengan hitungan di kios.
  - **Atur**: ubah batas peringatan, atau **Jadikan cek manual** kalau bahan itu repot dihitung. Bahan cek manual bisa dikembalikan lewat tombol **hitung angka**.
- **Menu**: ubah harga jual, HPP, dan resep, atau tambah menu baru. Rekap hari-hari lalu tidak ikut berubah karena harga disalin saat transaksi.
- **Shift kas**: setiap buka–tutup kas, kas masuk/keluar, selisih uang, dan hasil cek bahan.
- **Transaksi**: centang lalu **Hapus terpilih**, atau **Reset semua penjualan** (ketik `RESET`) untuk membersihkan data uji coba. Stok yang terpakai dikembalikan; menu, stok, pengguna, dan pengaturan tidak berubah.
- **Pengaturan**: tambah karyawan dan ganti PIN, atur biaya tetap, modal awal, tanggal mulai usaha, dan target harian.

### Dua jenis stok
- **Otomatis.** Berkurang setiap penjualan sesuai resep. Termasuk:
  - sachet minuman dan SKM
  - boba (30 g), oreo (10 g)
  - sedotan

  Peringatan muncul kalau stok ≤ batas: sachet 3, kemasan 10.
- **Cek manual.** Untuk teh celup, gula, cup 16 oz, cup 18 oz, cup plastik kecil, lunch box L, film seal, kentang, sosis, nugget, saus, tusuk, dan tisu. Angkanya tidak dihitung, cukup dicek karyawan saat tutup kas: **Masih banyak / Setengah / Habis**.

Stok boleh minus. Penjualan tidak pernah ditolak hanya karena catatan stok belum diisi, tetapi menunya diberi tanda "stok kurang" dan muncul di daftar **Perlu belanja**.

### Laba
- **Laba kotor** = harga jual − HPP, keduanya diisi pemilik per menu. Untung dari topping juga dihitung.
- **Biaya tetap per hari** = (sewa + listrik + keamanan + lain-lain per bulan) ÷ 30. Dengan angka awal, hasilnya ≈ Rp30.556 per hari.
- **Balik modal** = laba kotor sejak mulai usaha − biaya tetap selama hari-hari itu, dibandingkan dengan modal awal.

## Teknologi

Sama seperti [kedai-lontar](https://github.com/Ariwira09/kedai-lontar):

| Bagian | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Cache Components) |
| Tampilan | React 19, Tailwind CSS 4, dirancang untuk HP dan bisa "Tambahkan ke layar utama" |
| Database | PostgreSQL + Drizzle ORM |
| Validasi | Zod |
| Login | PIN 4–6 angka (bcrypt), sesi JWT (jose) di cookie httpOnly. Akun dikunci 5 menit setelah 5 kali PIN salah |
| Ekspor | ExcelJS |
| Pengujian | Vitest + PGlite (PostgreSQL di memori) |

Bagian yang perlu dijaga ketat:
- **Penjualan dan potong stok dalam satu transaksi database** ([`src/services/sales.ts`](src/services/sales.ts)). Tidak mungkin penjualan tercatat tanpa stok terpotong, atau sebaliknya. Baris stok dikunci berurutan supaya penjualan bersamaan tidak saling menimpa.
- **Hanya satu kas yang boleh terbuka**, dijamin oleh unique index parsial di database.
- **Harga dan HPP disalin ke setiap baris penjualan**, jadi mengubah harga tidak mengubah rekap lama.

## Menjalankan di komputer

```bash
npm install
cp .env.example .env          # isi SESSION_SECRET, OWNER_NAME, OWNER_PIN

# Pilih salah satu database:
docker compose up -d          # PostgreSQL di Docker, atau
npm run db:local              # PostgreSQL ringan tanpa Docker (PGlite) di port 5544
                              # → DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5544/postgres

npm run db:migrate            # buat tabel
npm run db:seed               # akun pemilik + semua menu, HPP, resep, dan bahan
npm run dev                   # buka http://localhost:3000
```

Tes: `npm test`.

## Online di Vercel + Neon (gratis)

Tidak perlu menjalankan perintah apa pun di komputer. Setiap deploy, Vercel otomatis memperbarui tabel database dan mengisi data awal ([`scripts/vercel-build.sh`](scripts/vercel-build.sh)).

1. Di [vercel.com](https://vercel.com), login dengan GitHub, lalu buka **Add New → Project** dan **Import** repo `kasir-poci`.
2. Sebelum klik Deploy, buka **Environment Variables** dan isi:
   - `SESSION_SECRET`: teks acak minimal 32 karakter
   - `OWNER_NAME`: nama Anda sebagai pemilik
   - `OWNER_PIN`: PIN 4–6 angka untuk login pemilik
3. Klik **Deploy**.
4. Hubungkan database:
   - Buka project di Vercel → tab **Storage** → **Create Database** → **Neon**.
   - Pilih region **Singapore**, lalu **Connect** ke project ini. `DATABASE_URL` akan terisi otomatis.
5. Buka **Deployments**, pilih deploy terakhir, klik **⋯ → Redeploy**. Tabel, menu, dan akun pemilik dibuat otomatis.
6. Buka alamat aplikasinya di HP dan masuk sebagai pemilik. Setelah itu:
   - Tambahkan karyawan di **Admin → Pengaturan**.
   - Isi stok awal di **Admin → Stok → Hitung ulang**.
   - Di browser HP, pilih **Tambahkan ke layar utama** supaya kasir terbuka seperti aplikasi.
