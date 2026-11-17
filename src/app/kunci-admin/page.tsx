import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { ADMIN_MINUTES } from "@/lib/auth/token";
import { UnlockForm } from "./unlock-form";

export const metadata: Metadata = { title: "Buka admin" };

export default function UnlockPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 pt-10 pb-safe">
      <Suspense fallback={<Loading />}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const user = await requireUser();
  if (user.role !== "owner") redirect("/kasir");
  return (
    <>
      <div className="text-center">
        <p className="text-4xl" aria-hidden>
          🔒
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold">Buka Admin</h1>
        <p className="mt-1 text-kopi-muted">
          Masukkan PIN {user.name} sekali lagi. Admin terkunci otomatis setelah {ADMIN_MINUTES} menit.
        </p>
      </div>
      <UnlockForm />
      <Link href="/kasir" className="mt-4 text-center text-sm text-teh underline underline-offset-4">
        ← Kembali ke kasir
      </Link>
    </>
  );
}
