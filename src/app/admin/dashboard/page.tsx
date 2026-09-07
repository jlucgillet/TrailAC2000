import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { NewRaceForm } from "./NewRaceForm";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  active: "Active",
  closed: "Clôturée",
  archived: "Archivée",
};

export default async function DashboardPage() {
  const session = await getAdminSession();
  const races = session
    ? await prisma.race.findMany({
        where: { adminId: session.adminId, status: { not: "archived" } },
        orderBy: { date: "desc" },
        include: { _count: { select: { participants: true } } },
      })
    : [];

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-6 font-display text-3xl font-semibold">Vos courses</h1>
        {races.length === 0 ? (
          <p className="text-muted">Aucune course pour le moment. Créez-en une ci-dessous.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {races.map((race) => (
              <Link
                key={race.id}
                href={`/admin/races/${race.id}`}
                className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">{race.name}</h2>
                  <span className="rounded-full bg-bg px-3 py-1 text-xs text-muted">
                    {STATUS_LABEL[race.status]}
                  </span>
                </div>
                <p className="text-sm text-muted">
                  {new Date(race.date).toLocaleDateString("fr-FR")}
                  {race.location ? ` · ${race.location}` : ""}
                </p>
                <p className="mt-2 text-sm text-muted">{race._count.participants} participant(s)</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">Nouvelle course</h2>
        <NewRaceForm />
      </section>
    </div>
  );
}
