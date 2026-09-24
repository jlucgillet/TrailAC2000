"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminMenu } from "./AdminMenu";
import { LogoutButton } from "./LogoutButton";

const NAV_LINKS = [
  { href: "/admin/dashboard#actives", label: "Courses actives" },
  { href: "/admin/dashboard#brouillons", label: "Brouillons" },
  { href: "/admin/dashboard#cloturees", label: "Clôturées" },
  { href: "/admin/dashboard#nouvelle-course", label: "+ Nouvelle course" },
  { href: "/admin/tracks", label: "Parcours" },
  { href: "/admin/users", label: "Utilisateurs" },
];

export function AdminHeader({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/admin/dashboard"
          onClick={() => setOpen(false)}
          className="truncate font-display text-lg font-semibold sm:text-xl"
        >
          Trail AC2000
        </Link>

        {/* Navigation complète, écrans larges */}
        <div className="hidden items-center gap-4 sm:flex">
          <AdminMenu />
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="max-w-[200px] truncate">{email}</span>
            <LogoutButton />
          </div>
        </div>

        {/* Bouton hamburger, mobile uniquement */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border sm:hidden"
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
        </button>
      </div>

      {/* Panneau mobile */}
      {open && (
        <div className="border-t border-border px-4 py-3 sm:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-surface"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-muted">
            <span className="truncate">{email}</span>
            <LogoutButton />
          </div>
        </div>
      )}
    </header>
  );
}
