import { Suspense } from "react";
import { TopBar } from "@/components/top-bar";

export default function KasirLayout({ children }: LayoutProps<"/kasir">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="h-[92px] border-b border-garis bg-white" />}>
        <TopBar area="kasir" />
      </Suspense>
      {children}
    </div>
  );
}
