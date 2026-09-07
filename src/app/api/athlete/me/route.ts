import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export async function GET() {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

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
    myRaces,
    joinableRaces: joinableRaces.map((r) => ({
      id: r.id,
      name: r.name,
      date: r.date,
      location: r.location,
    })),
  });
}
