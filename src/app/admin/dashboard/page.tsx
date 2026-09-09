import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { NewRaceForm } from "./NewRaceForm";

type RaceWithCount = Prisma.RaceGetPayload<{
  include: { _count: { select: { participants: true } } };
}>;

export default async function DashboardPage() {
  const session = await getAdminSession();
  const races = session
    ? await prisma.race.findMany({
        where: { adminId: session.adminId, status: { not: "archived" } },
        include: { _count: { select: { participants: true } } },
      })
    : [];

  const active = races
    .filter((r) => r.status === "active")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const drafts = races
    .filter((r) => r.status === "draft")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const closed = races
    .filter((r) => r.status === "closed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-6 font-display text-3xl font-semibold">Vos courses</h1>

        {races.length === 0 ? (
          <p className="text-muted">Aucune course pour le moment. Créez-en une ci-dessous.</p>
        ) : (
          <div className="flex flex-col gap-8">
            <RaceGroup id="actives" title="Actives" races={active} accent />
            <RaceGroup id="brouillons" title="Brouillons" races={drafts} />
            <RaceGroup id="cloturees" title="Clôturées" races={closed} />
          </div>
        )}
      </section>

      <section id="nouvelle-course" className="scroll-mt-24">
        <h2 className="mb-4 font-display text-2xl font-semibold">Nouvelle course</h2>
        <NewRaceForm />
      </section>
    </div>
  );
}

function RaceGroup({
  id,
  title,
  races,
  accent = false,
}: {
  id: string;
  title: string;
  races: RaceWithCount[];
  accent?: boolean;
}) {
  if (races.length === 0) return null;

  return (
    <div id={id} className="scroll-mt-24">
      <h3
        className={`mb-3 flex items-center gap-2 font-display text-lg font-semibold ${
          accent ? "text-accent" : "text-muted"
        }`}
      >
        {title}
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-muted">
          {races.length}
        </span>
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {races.map((race) => (
          <Link
            key={race.id}
            href={`/admin/races/${race.id}`}
            className={`rounded-xl border bg-surface p-5 transition-colors hover:border-accent ${
              accent ? "border-accent/40" : "border-border"
            }`}
          >
            <h4 className="mb-2 font-display text-xl font-semibold">{race.name}</h4>
            <p className="text-sm text-muted">
              {new Date(race.date).toLocaleDateString("fr-FR")}
              {race.location ? ` · ${race.location}` : ""}
            </p>
            <p className="mt-2 text-sm text-muted">{race._count.participants} participant(s)</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
