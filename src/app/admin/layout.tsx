import { Suspense } from "react";
import { TopBar } from "@/components/top-bar";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="h-[92px] border-b border-garis bg-white" />}>
        <TopBar area="admin" />
      </Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-16">{children}</main>
    </div>
  );
}
