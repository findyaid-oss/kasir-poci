import type { CheckStatus } from "@/db/schema";

/** Kata yang tampil untuk hasil cek bahan manual. Nilai di database tetap aman/menipis/habis. */
export const CHECK_LABEL: Record<CheckStatus, string> = {
  aman: "Masih banyak",
  menipis: "Setengah",
  habis: "Habis",
};
