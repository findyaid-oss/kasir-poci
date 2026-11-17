import type { ComponentProps, ReactNode } from "react";

export const buttonClass = {
  primary:
    "press inline-flex items-center justify-center gap-2 rounded-2xl bg-teh px-5 py-3 font-semibold text-white hover:bg-teh-700 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "press inline-flex items-center justify-center gap-2 rounded-2xl border border-teh/30 bg-white px-5 py-3 font-semibold text-teh hover:bg-teh-50 disabled:opacity-50",
  small:
    "press inline-flex items-center justify-center gap-1 rounded-xl border border-garis bg-white px-3 py-1.5 text-sm font-medium text-kopi hover:border-teh hover:text-teh disabled:opacity-50",
  danger:
    "press inline-flex items-center justify-center rounded-xl border border-cabai/30 bg-white px-3 py-1.5 text-sm font-medium text-cabai hover:bg-cabai hover:text-white disabled:opacity-50",
};

export const inputClass =
  "w-full rounded-xl border border-garis bg-white px-3.5 py-2.5 text-base text-kopi placeholder:text-kopi-muted/60 focus:border-teh focus:outline-none focus:ring-2 focus:ring-teh/20";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? <p className="text-sm text-cabai">{error}</p> : hint ? <p className="text-sm text-kopi-muted">{hint}</p> : null}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "warn" | "ok"; children: ReactNode }) {
  const style = {
    info: "border-garis bg-white text-kopi",
    ok: "border-daun/20 bg-daun-100 text-daun",
    warn: "border-kunyit/30 bg-kunyit-100 text-kopi",
    error: "border-cabai/30 bg-cabai-100 text-cabai",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-2xl border border-garis bg-white p-4 sm:p-5 ${className}`} {...props} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-daun" : tone === "bad" ? "text-cabai" : "text-kopi";
  return (
    <div className="rounded-2xl border border-garis bg-white p-4">
      <p className="text-sm text-kopi-muted">{label}</p>
      <p className={`num mt-1 font-display text-2xl font-semibold ${color}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-kopi-muted">{sub}</p> : null}
    </div>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  const style = {
    ok: "bg-daun-100 text-daun",
    warn: "bg-kunyit-100 text-kopi",
    bad: "bg-cabai-100 text-cabai",
    muted: "bg-krem text-kopi-muted",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>{children}</span>;
}

export function Progress({ value, tone = "teh" }: { value: number; tone?: "teh" | "daun" }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-krem" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone === "daun" ? "bg-daun" : "bg-teh"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-kopi sm:text-3xl">{title}</h1>
      {children ? <div className="mt-1 text-kopi-muted">{children}</div> : null}
    </div>
  );
}

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return <p className="p-6 text-center text-kopi-muted">{label}</p>;
}
