import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

/**
 * Historique COMPLET des essais du concurrent connecté pour cette course
 * (contrairement aux classements, qui ne gardent que le meilleur essai de
 * chaque concurrent) — une course pouvant être courue plusieurs fois, la
 * personne doit pouvoir consulter chacun de ses essais, pas seulement le
 * dernier ni seulement le meilleur.
 */
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
    include: { runs: { orderBy: { attemptNumber: "desc" } } },
  });

  if (!participant) {
    return NextResponse.json({
      race: { id: race.id, name: race.name },
      attempts: [],
    });
  }

  const bestDurationMs = participant.runs
    .filter((r) => r.status === "finished" && r.durationMs !== null)
    .reduce<number | null>((min, r) => {
      const d = Number(r.durationMs);
      return min === null || d < min ? d : min;
    }, null);

  return NextResponse.json({
    race: { id: race.id, name: race.name },
    attempts: participant.runs.map((r) => {
      const durationMs = r.durationMs !== null ? Number(r.durationMs) : null;
      return {
        runId: r.id,
        attemptNumber: r.attemptNumber,
        status: r.status,
        startTimestamp: r.startTimestamp,
        finishTimestamp: r.finishTimestamp,
        durationMs,
        isBest: bestDurationMs !== null && durationMs === bestDurationMs,
      };
    }),
  });
}
