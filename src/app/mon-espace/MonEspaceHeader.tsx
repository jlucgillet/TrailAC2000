"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AthleteLogoutButton } from "./AthleteLogoutButton";

const NAV_LINKS = [
  { href: "/mon-espace", label: "Courses", icon: "🏁" },
  { href: "/mon-espace/parcours", label: "Parcours", icon: "🗺️" },
  { href: "/mon-espace/profil", label: "Profil", icon: "👤" },
  { href: "/guide?espace=concurrent", label: "Guide", icon: "📖" },
];

export function MonEspaceHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <Link
          href="/mon-espace"
          onClick={() => setOpen(false)}
          className="truncate font-display text-xl font-semibold"
        >
          Mon espace concurrent
        </Link>

        {/* Navigation complète, écrans larges */}
        <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href.split("?")[0] ? "font-semibold text-ink" : "hover:text-ink"}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-border px-3 py-1.5 text-ink hover:border-accent"
          >
            Espace organisateur
          </Link>
          <AthleteLogoutButton />
        </nav>

        {/* Bouton hamburger, mobile uniquement */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="flex h-10 shrink-0 items-center gap-2 rounded-lg border-2 border-accent bg-accent/10 px-3 text-sm font-semibold text-ink sm:hidden"
        >
          <span className="relative block h-3.5 w-4">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-4 bg-ink transition-transform ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[6px] block h-0.5 w-4 bg-ink transition-opacity ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-3 block h-0.5 w-4 bg-ink transition-transform ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      {/* Panneau mobile */}
      {open && (
        <div className="border-t border-border px-4 py-4 sm:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href.split("?")[0];
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-base font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-ink"
                      : "border-border bg-surface text-ink hover:border-muted"
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-muted px-4 py-3 text-base font-medium text-ink hover:border-accent"
            >
              <span className="text-xl">🔁</span>
              Passer à l&rsquo;espace organisateur
            </Link>
            <AthleteLogoutButton />
          </div>
        </div>
      )}
    </header>
  );
}
