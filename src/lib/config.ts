/** Pengaturan tetap aplikasi. Nama kios, biaya tetap, dan target bisa diubah dari halaman Pengaturan admin. */
export const APP = {
  /** Zona waktu Bali (WITA). Semua tanggal & jam di aplikasi memakai zona ini. */
  utcOffset: "+08:00",
  timeZone: "Asia/Makassar",
  /** Berapa kali PIN boleh salah sebelum akun dikunci sementara, dan berapa lama kuncinya. */
  maxPinAttempts: 5,
  lockMinutes: 5,
} as const;
