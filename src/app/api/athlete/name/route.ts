import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAthleteSession, createAthleteSession } from "@/lib/session";

const bodySchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await createAthleteSession({
    phoneNormalized: session.phoneNormalized,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  });

  // Répercute le changement sur la fiche concurrent de TOUTES les courses
  // où ce téléphone est déjà inscrit, pour que l'espace organisateur
  // (Concurrents, Résultats) reflète toujours le nom à jour.
  if (parsed.data.firstName !== undefined || parsed.data.lastName !== undefined) {
    await prisma.participant.updateMany({
      where: { phoneNormalized: session.phoneNormalized },
      data: {
        ...(parsed.data.firstName !== undefined ? { firstName: parsed.data.firstName } : {}),
        ...(parsed.data.lastName !== undefined ? { lastName: parsed.data.lastName } : {}),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
