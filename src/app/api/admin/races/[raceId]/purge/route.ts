import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * Suppression définitive d'une course et de toutes ses données
 * (concurrents, chronométrages, journal de scans) — contrairement au
 * DELETE classique de /api/admin/races/[raceId], qui ne fait qu'archiver.
 *
 * Réservée aux courses au statut "closed" (clôturée) : on évite qu'une
 * course active ou en brouillon disparaisse par erreur avant d'avoir
 * livré ses résultats. Les cascades Prisma (Participant → Run,
 * Race → ScanLog) suppriment automatiquement tout le reste.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  if (race.status !== "closed") {
    return NextResponse.json(
      {
        error:
          "Seules les courses clôturées peuvent être supprimées définitivement. Passe-la en statut « Clôturée » d'abord (onglet Réglages).",
      },
      { status: 400 }
    );
  }

  await prisma.race.delete({ where: { id: race.id } });

  return NextResponse.json({ ok: true });
}
