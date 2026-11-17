import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Loading, Notice } from "@/components/ui";
import { db } from "@/db";
import { getSettings } from "@/services/reports";
import { listUsers } from "@/services/users";
import { PinLogin } from "./pin-login";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col px-5 pt-10 pb-safe">
      <Suspense fallback={<Loading />}>
        <LoginContent />
      </Suspense>
    </main>
  );
}

async function LoginContent() {
  await connection();
  const [people, settings] = await Promise.all([listUsers(db, { onlyActive: true }), getSettings(db)]);
  return (
    <>
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-wide text-teh uppercase">Kasir</p>
        <h1 className="font-display text-3xl font-semibold">{settings.businessName}</h1>
      </div>
      {people.length === 0 ? (
        <Notice tone="warn">
          Belum ada pengguna. Jalankan <code>npm run db:seed</code> untuk membuat akun pemilik pertama.
        </Notice>
      ) : (
        <PinLogin users={people.map((p) => ({ id: p.id, name: p.name, role: p.role }))} />
      )}
    </>
  );
}
