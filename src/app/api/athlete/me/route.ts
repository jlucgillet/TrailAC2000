import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export async function GET() {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  // Le prénom/nom affiché vient de la fiche concurrent (table participants),
  // pas seulement de ce qui a été saisi lors de la connexion à Mon Espace —
  // ça reflète toujours la donnée la plus à jour, y compris si elle a été
  // renseignée via le formulaire de scan classique ou un import CSV.
  const knownName = await prisma.participant.findFirst({
    where: {
      phoneNormalized: session.phoneNormalized,
      OR: [{ firstName: { not: null } }, { lastName: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    select: { firstName: true, lastName: true },
  });

  const firstName = knownName?.firstName ?? session.firstName ?? null;
  const lastName = knownName?.lastName ?? session.lastName ?? null;

  const myParticipations = await prisma.participant.findMany({
    where: {
      phoneNormalized: session.phoneNormalized,
      race: { status: { not: "draft" } },
    },
    include: {
      race: true,
      // Tous les essais : une course est un segment que l'on peut courir
      // librement plusieurs fois tant qu'elle est active, pour mesurer sa
      // progression. On calcule ici le meilleur temps et le nombre d'essais ;
      // le détail de chaque essai est consultable via /api/athlete/races/[raceId]/results.
      runs: true,
    },
  });

  const myRaces = myParticipations.map((p) => {
    const finishedRuns = p.runs.filter((r) => r.status === "finished" && r.durationMs !== null);
    const bestDurationMs =
      finishedRuns.length > 0
        ? Math.min(...finishedRuns.map((r) => Number(r.durationMs)))
        : null;

    const runningRun = p.runs.find((r) => r.status === "running");
    const lastRunStatus = runningRun ? "running" : finishedRuns.length > 0 ? "finished" : "registered";

    // Date/heure du dernier événement réel (dernière arrivée, ou départ en
    // cours), pour trier la liste par activité récente plutôt que par date
    // programmée de la course.
    const latestActivity = p.runs.reduce<Date | null>((latest, r) => {
      const t = r.finishTimestamp ?? r.startTimestamp;
      if (!t) return latest;
      if (!latest || t > latest) return t;
      return latest;
    }, null);

    return {
      raceId: p.race.id,
      raceName: p.race.name,
      raceDate: p.race.date,
      raceStartTime: p.race.startTime,
      raceStatus: p.race.status,
      category: p.category,
      bibNumber: p.bibNumber,
      attemptsCount: p.runs.length,
      bestDurationMs,
      lastRunStatus,
      sortTime: (latestActivity ?? p.race.startTime ?? p.race.date).getTime(),
    };
  });

  myRaces.sort((a, b) => b.sortTime - a.sortTime);

  const joinedRaceIds = myParticipations.map((p) => p.raceId);

  const joinableRaces = await prisma.race.findMany({
    where: {
      status: "active",
      openRegistration: true,
      id: { notIn: joinedRaceIds.length > 0 ? joinedRaceIds : undefined },
    },
    orderBy: { date: "desc" },
    take: 20,
  });

  return NextResponse.json({
    phoneNormalized: session.phoneNormalized,
    firstName,
    lastName,
    myRaces: myRaces.map(({ sortTime, ...r }) => r),
    joinableRaces: joinableRaces.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      location: r.location,
    })),
  });
}
