import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * Tous les essais de la course, un par ligne (contrairement à
 * /api/admin/races/[raceId]/results, qui ne garde que le meilleur essai de
 * chaque concurrent) — pour pouvoir consulter et nettoyer l'historique
 * complet (essais de test, doublons, erreurs de scan...).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const runs = await prisma.run.findMany({
    where: { participant: { raceId: race.id } },
    include: { participant: true },
    orderBy: [{ participant: { bibNumber: "asc" } }, { attemptNumber: "asc" }],
  });

  return NextResponse.json({
    runs: runs.map((r) => ({
      runId: r.id,
      participantId: r.participantId,
      displayName: [r.participant.firstName, r.participant.lastName].filter(Boolean).join(" ") || "—",
      bibNumber: r.participant.bibNumber,
      category: r.participant.category,
      phone: r.participant.phoneNormalized,
      attemptNumber: r.attemptNumber,
      status: r.status,
      startTimestamp: r.startTimestamp,
      finishTimestamp: r.finishTimestamp,
      durationMs: r.durationMs !== null ? Number(r.durationMs) : null,
    })),
  });
}
