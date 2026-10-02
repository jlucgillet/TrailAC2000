import { getAthleteSession } from "@/lib/session";
import { MonEspaceHeader } from "./MonEspaceHeader";

export default async function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAthleteSession();

  return (
    <div className="min-h-screen">
      {session && <MonEspaceHeader />}
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
