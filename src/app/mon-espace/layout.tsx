import Link from "next/link";
import { getAthleteSession } from "@/lib/session";
import { AthleteLogoutButton } from "./AthleteLogoutButton";

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAthleteSession();

  return (
    <div className="min-h-screen">
      {session && (
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
            <Link href="/mon-espace" className="font-display text-xl font-semibold">
              Mon espace concurrent
            </Link>
            <AthleteLogoutButton />
          </div>
        </header>
      )}
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
