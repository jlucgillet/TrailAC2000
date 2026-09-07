import Link from "next/link";
import { getAdminSession } from "@/lib/session";
import { LogoutButton } from "./LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen">
      {session && (
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/admin/dashboard" className="font-display text-xl font-semibold">
              Trail AC2000 — Organisateur
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>{session.email}</span>
              <LogoutButton />
            </div>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
