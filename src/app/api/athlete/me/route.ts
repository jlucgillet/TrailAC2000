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
    where: { phoneNormalized: session.phoneNormalized },
    include: {
      race: true,
      runs: { orderBy: { attemptNumber: "desc" }, take: 1 },
    },
    orderBy: { race: { date: "desc" } },
  });

  const myRaces = myParticipations.map((p) => {
    const run = p.runs[0];
    return {
      raceId: p.race.id,
      raceName: p.race.name,
      raceDate: p.race.date,
      raceStatus: p.race.status,
      runStatus: run?.status ?? "registered",
      durationMs: run?.durationMs ? Number(run.durationMs) : null,
    };
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
    myRaces,
    joinableRaces: joinableRaces.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      location: r.location,
    })),
  });
}
