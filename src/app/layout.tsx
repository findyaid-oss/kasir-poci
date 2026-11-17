import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kasir Poci", template: "%s · Kasir Poci" },
  description: "Kasir sederhana kios es teh Poci & gorengan frozen.",
  appleWebApp: { capable: true, title: "Kasir Poci", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#9a3b12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
