import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge, buttonClass, Card, Loading, PageHeading } from "@/components/ui";
import { db } from "@/db";
import { requireOwner } from "@/lib/auth/session";
import { getSettings } from "@/services/reports";
import { listUsers } from "@/services/users";
import { toggleUserAction } from "../actions";
import { NewUserForm, ResetPinForm, SettingsForm } from "./forms";

export const metadata: Metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const me = await requireOwner();
  const [settings, people] = await Promise.all([getSettings(db), listUsers(db, { onlyActive: false })]);

  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeading title="Pengaturan" />

      <Card>
        <h2 className="mb-1 font-semibold">Pengguna</h2>
        <p className="mb-3 text-sm text-kopi-muted">
          Karyawan hanya bisa berjualan, melihat transaksi shift-nya, dan tutup kas. Rekap lengkap, stok, menu, dan harga hanya untuk pemilik.
        </p>
        <ul className="mb-4 divide-y divide-garis">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className={p.isActive ? "font-medium" : "text-kopi-muted line-through"}>
                {p.name} <Badge tone={p.role === "owner" ? "ok" : "muted"}>{p.role === "owner" ? "Pemilik" : "Karyawan"}</Badge>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <ResetPinForm userId={p.id} />
                {p.id !== me.userId ? (
                  <form action={toggleUserAction}>
                    <input type="hidden" name="userId" value={p.id} />
                    <button className={p.isActive ? buttonClass.danger : buttonClass.small}>{p.isActive ? "Nonaktifkan" : "Aktifkan"}</button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <NewUserForm />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Usaha, biaya tetap & target</h2>
        <SettingsForm
          initial={{
            businessName: settings.businessName,
            rentMonthly: settings.rentMonthly,
            electricityMonthly: settings.electricityMonthly,
            securityMonthly: settings.securityMonthly,
            otherMonthly: settings.otherMonthly,
            initialCapital: settings.initialCapital,
            startDate: settings.startDate ?? "",
            targetDrinks: settings.targetDrinks,
            targetFood: settings.targetFood,
          }}
        />
      </Card>
    </div>
  );
}
