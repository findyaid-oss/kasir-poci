"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none]">
      {links.map((l) => {
        const active = l.href === pathname;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap ${
              active ? "bg-teh text-white" : "text-kopi-muted hover:bg-teh-50 hover:text-teh"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
