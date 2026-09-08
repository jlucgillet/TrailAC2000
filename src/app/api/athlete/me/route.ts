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
      runs: { orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });

  // Tri par date ET heure effectives de la course (heure de départ si
  // renseignée, sinon simplement la date), du plus récent au plus ancien —
  // un tri sur la seule date ne distingue pas deux courses le même jour.
  myParticipations.sort((a, b) => {
    const timeA = (a.race.startTime ?? a.race.date).getTime();
    const timeB = (b.race.startTime ?? b.race.date).getTime();
    return timeB - timeA;
  });

  // Pour chaque course terminée, calcule le classement du concurrent parmi
  // tous les concurrents ayant terminé cette course (même logique que les
  // pages de résultats admin/publique : tri par temps croissant).
  const myRaces = await Promise.all(
    myParticipations.map(async (p) => {
      const run = p.runs[0];
      let position: number | null = null;

      if (run?.status === "finished" && run.durationMs !== null) {
        const betterCount = await prisma.run.count({
          where: {
            status: "finished",
            durationMs: { lt: run.durationMs },
            participant: { raceId: p.raceId },
          },
        });
        position = betterCount + 1;
      }

      return {
        raceId: p.race.id,
        raceName: p.race.name,
        raceDate: p.race.date,
        raceStartTime: p.race.startTime,
        raceStatus: p.race.status,
        runStatus: run?.status ?? "registered",
        durationMs: run?.durationMs ? Number(run.durationMs) : null,
        position,
        category: p.category,
        bibNumber: p.bibNumber,
      };
    })
  );

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
    myRaces,
    joinableRaces: joinableRaces.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      location: r.location,
    })),
  });
}
