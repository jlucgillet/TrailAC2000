import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

const bodySchema = z.object({ sourceRaceId: z.string().uuid() });

/**
 * Copie la liste des concurrents (identité + dossard/catégorie/équipe)
 * d'une autre course de l'organisateur vers celle-ci. Ne copie jamais les
 * données de chronométrage (départ/arrivée) : chaque course garde son
 * propre suivi, même pour un concurrent déjà connu ailleurs.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (parsed.data.sourceRaceId === race.id) {
    return NextResponse.json(
      { error: "Impossible de copier une course vers elle-même." },
      { status: 400 }
    );
  }

  const sourceRace = await prisma.race.findFirst({
    where: { id: parsed.data.sourceRaceId, adminId: session.adminId },
  });
  if (!sourceRace) {
    return NextResponse.json({ error: "Course source introuvable." }, { status: 404 });
  }

  const sourceParticipants = await prisma.participant.findMany({
    where: { raceId: sourceRace.id },
  });

  let copied = 0;
  for (const p of sourceParticipants) {
    const result = await prisma.participant.upsert({
      where: {
        raceId_phoneNormalized: { raceId: race.id, phoneNormalized: p.phoneNormalized },
      },
      // Un concurrent déjà présent (ex. déjà scanné) n'est pas écrasé.
      update: {},
      create: {
        raceId: race.id,
        phoneNormalized: p.phoneNormalized,
        firstName: p.firstName,
        lastName: p.lastName,
        bibNumber: p.bibNumber,
        category: p.category,
        team: p.team,
        email: p.email,
      },
    });
    if (result) copied++;
  }

  return NextResponse.json({ copied, total: sourceParticipants.length });
}
