"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/admin/dashboard#actives", label: "Courses actives" },
  { href: "/admin/dashboard#brouillons", label: "Brouillons" },
  { href: "/admin/dashboard#cloturees", label: "Clôturées" },
];

export function AdminMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-ink hover:border-accent"
      >
        Courses
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-ink hover:bg-bg"
            >
              {link.label}
            </Link>
          ))}
          <div className="my-1.5 border-t border-border" />
          <Link
            href="/admin/dashboard#nouvelle-course"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-accent/10"
          >
            + Nouvelle course
          </Link>
        </div>
      )}
    </div>
  );
}
