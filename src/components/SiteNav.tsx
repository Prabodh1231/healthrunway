"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldPlus } from "lucide-react";

const LINKS = [
  { href: "/check", label: "Risk check" },
  { href: "/medicines", label: "Medicine savings" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <ShieldPlus size={18} />
          </span>
          <span className="text-lg">HealthRunway</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = path.startsWith(l.href) || (l.href === "/check" && path.startsWith("/dashboard"));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-2.5 py-1.5 font-medium sm:px-3 ${
                  active ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-foreground"
                } ${l.href === "/how-it-works" ? "hidden sm:inline-block" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
