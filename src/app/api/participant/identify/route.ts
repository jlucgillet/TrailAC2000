import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { createParticipantSession, createAthleteSession } from "@/lib/session";
import { isRateLimited, hashIp } from "@/lib/rateLimit";
import { canRegisterForRace } from "@/lib/registration";

const bodySchema = z.object({
  raceId: z.string().uuid(),
  phone: z.string().min(4),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

/**
 * Identifie le concurrent (téléphone + nom) et ouvre sa session pour cette
 * course — c'est tout. Ne scanne jamais un point de contrôle à sa place :
 * si la personne est arrivée ici via un scan QR sans être identifiée, on
 * lui demande de scanner à nouveau une fois identifiée (voir l'écran de
 * chrono, qui invite à scanner DÉPART tant qu'aucun run n'existe). Ça
 * évite que le temps de saisie de ce formulaire ne fausse le chronométrage.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`identify_${hashIp(ip)}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessayez dans une minute." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { raceId, phone, firstName, lastName } = parsed.data;

  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race || race.status === "archived") {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }

  const normalized = normalizePhone(phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const eligibility = await canRegisterForRace(raceId, normalized.value, race.openRegistration);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.error }, { status: 403 });
  }

  const existingParticipant = await prisma.participant.findUnique({
    where: { raceId_phoneNormalized: { raceId, phoneNormalized: normalized.value } },
  });

  // Un nouveau concurrent (pas encore sur la liste de cette course) doit
  // obligatoirement indiquer son prénom et son nom. Un concurrent déjà
  // inscrit (ajouté par l'organisateur, ou déjà identifié une première
  // fois) n'a pas besoin de les ressaisir.
  if (!existingParticipant && (!firstName || !lastName)) {
    return NextResponse.json(
      { error: "Merci d'indiquer ton prénom et ton nom pour t'inscrire à cette course." },
      { status: 400 }
    );
  }

  const participant = await prisma.participant.upsert({
    where: {
      raceId_phoneNormalized: {
        raceId,
        phoneNormalized: normalized.value,
      },
    },
    update: {
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    },
    create: {
      raceId,
      phoneNormalized: normalized.value,
      firstName,
      lastName,
    },
  });

  await createParticipantSession({
    participantId: participant.id,
    raceId,
    phoneNormalized: normalized.value,
  });

  // S'identifier via le scan classique ouvre aussi la session "Mon Espace",
  // avec cette identité (celle qui vient d'être saisie/confirmée) — sinon
  // "Retour à mon espace" redemanderait le téléphone. Comme on repart
  // toujours d'une identité fraîchement saisie ici, ça ne mélange jamais
  // deux personnes différentes sur un appareil partagé (contrairement à
  // une session Mon Espace laissée ouverte par quelqu'un d'autre : celle-ci
  // est remplacée, pas complétée).
  await createAthleteSession({
    phoneNormalized: normalized.value,
    firstName: participant.firstName ?? undefined,
    lastName: participant.lastName ?? undefined,
  });

  return NextResponse.json({ identified: true, raceId });
}
