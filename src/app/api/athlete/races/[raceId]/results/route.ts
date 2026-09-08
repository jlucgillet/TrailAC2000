import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export async function GET(
  _request: Request,
  { params }: { params: { raceId: string } }
) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }

  const participant = await prisma.participant.findUnique({
    where: {
      raceId_phoneNormalized: { raceId: race.id, phoneNormalized: session.phoneNormalized },
    },
    include: {
      runs: { orderBy: { attemptNumber: "asc" } },
    },
  });

  const attempts = (participant?.runs ?? []).map((r) => ({
    attemptNumber: r.attemptNumber,
    status: r.status,
    startTimestamp: r.startTimestamp,
    finishTimestamp: r.finishTimestamp,
    durationMs: r.durationMs !== null ? Number(r.durationMs) : null,
  }));

  const bestDurationMs = attempts
    .filter((a) => a.status === "finished" && a.durationMs !== null)
    .reduce<number | null>((best, a) => (best === null || a.durationMs! < best ? a.durationMs! : best), null);

  return NextResponse.json({
    race: { id: race.id, name: race.name, status: race.status },
    attempts,
    bestDurationMs,
  });
}
