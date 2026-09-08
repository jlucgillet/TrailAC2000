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
      // Tous les essais (pas seulement le dernier) : un concurrent peut
      // courir plusieurs fois la même course (§23 du cahier des charges),
      // et doit pouvoir consulter chacun de ses résultats.
      runs: { orderBy: { attemptNumber: "asc" } },
    },
  });

  type RaceHistoryEntry = {
    raceId: string;
    raceName: string;
    raceDate: Date;
    raceStartTime: Date | null;
    raceStatus: string;
    runStatus: string;
    durationMs: number | null;
    position: number | null;
    category: string | null;
    bibNumber: string | null;
    attemptNumber: number | null;
    startTimestamp: Date | null;
    finishTimestamp: Date | null;
  };

  // Une ligne par essai. Un participant sans aucun essai (inscrit mais
  // jamais parti) obtient une unique ligne "registered".
  const entries: RaceHistoryEntry[] = [];

  for (const p of myParticipations) {
    if (p.runs.length === 0) {
      entries.push({
        raceId: p.race.id,
        raceName: p.race.name,
        raceDate: p.race.date,
        raceStartTime: p.race.startTime,
        raceStatus: p.race.status,
        runStatus: "registered",
        durationMs: null,
        position: null,
        category: p.category,
        bibNumber: p.bibNumber,
        attemptNumber: null,
        startTimestamp: null,
        finishTimestamp: null,
      });
      continue;
    }

    for (const run of p.runs) {
      let position: number | null = null;

      if (run.status === "finished" && run.durationMs !== null) {
        const betterCount = await prisma.run.count({
          where: {
            status: "finished",
            durationMs: { lt: run.durationMs },
            participant: { raceId: p.raceId },
          },
        });
        position = betterCount + 1;
      }

      entries.push({
        raceId: p.race.id,
        raceName: p.race.name,
        raceDate: p.race.date,
        raceStartTime: p.race.startTime,
        raceStatus: p.race.status,
        runStatus: run.status,
        durationMs: run.durationMs !== null ? Number(run.durationMs) : null,
        position,
        category: p.category,
        bibNumber: p.bibNumber,
        attemptNumber: p.runs.length > 1 ? run.attemptNumber : null,
        startTimestamp: run.startTimestamp,
        finishTimestamp: run.finishTimestamp,
      });
    }
  }

  // Tri par date ET heure RÉELLES du résultat (arrivée, ou départ si pas
  // encore arrivé, sinon la date programmée de la course pour une simple
  // inscription) — pas la date programmée de la course, qui ne reflète pas
  // le moment où le concurrent a réellement couru.
  entries.sort((a, b) => {
    const timeA = (a.finishTimestamp ?? a.startTimestamp ?? a.raceStartTime ?? a.raceDate).getTime();
    const timeB = (b.finishTimestamp ?? b.startTimestamp ?? b.raceStartTime ?? b.raceDate).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return (a.attemptNumber ?? 0) - (b.attemptNumber ?? 0);
  });

  const joinedRaceIds = myParticipations.map((p) => p.raceId);

  const joinableRaces = await prisma.race.findMany({
    where: {
      status: "active",
      id: { notIn: joinedRaceIds.length > 0 ? joinedRaceIds : undefined },
    },
    orderBy: { date: "desc" },
    take: 20,
  });

  return NextResponse.json({
    phoneNormalized: session.phoneNormalized,
    firstName,
    lastName,
    myRaces: entries,
    joinableRaces: joinableRaces.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      location: r.location,
    })),
  });
}
