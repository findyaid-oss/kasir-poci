import type { MetadataRoute } from "next";

/** Supaya kasir bisa "Tambahkan ke layar utama" di HP dan terbuka layar penuh seperti aplikasi. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kasir Poci",
    short_name: "Kasir",
    description: "Kasir sederhana kios es teh Poci & gorengan",
    start_url: "/kasir",
    display: "standalone",
    background_color: "#fbf7f1",
    theme_color: "#9a3b12",
    lang: "id",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
