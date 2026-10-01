import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAthleteSession, createParticipantSession } from "@/lib/session";
import { performScan } from "@/lib/scan";
import { isRateLimited, hashIp } from "@/lib/rateLimit";
import { canRegisterForRace } from "@/lib/registration";

const bodySchema = z.object({
  raceId: z.string().uuid(),
  decodedText: z.string().min(1),
});

/**
 * Traite un scan effectué via la caméra intégrée à l'espace concurrent,
 * pour une course choisie à l'avance (contrairement à /api/athlete/scan-any,
 * qui accepte n'importe quelle course). Vérifie que le QR scanné correspond
 * bien à la course choisie.
 */
export async function POST(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`athlete_scan_${hashIp(ip)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Trop de scans, patiente un instant." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  let token: string;
  let checkpoint: "start" | "finish";
  try {
    const url = new URL(parsed.data.decodedText);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 3 || parts[0] !== "scan") throw new Error("format");
    token = parts[1];
    const cp = parts[2];
    if (cp !== "start" && cp !== "finish") throw new Error("checkpoint");
    checkpoint = cp;
  } catch {
    return NextResponse.json(
      { error: "Ce QR code n'est pas un QR code de chronométrage valide." },
      { status: 400 }
    );
  }

  const race = await prisma.race.findFirst({
    where: checkpoint === "start" ? { qrStartToken: token } : { qrFinishToken: token },
  });

  if (!race) {
    return NextResponse.json({ error: "Ce QR code n'est reconnu par aucune course." }, { status: 404 });
  }
  if (race.id !== parsed.data.raceId) {
    return NextResponse.json({ error: "Ce QR code correspond à une autre course." }, { status: 400 });
  }
  if (race.status !== "active") {
    return NextResponse.json(
      { error: "Cette course n'est pas (ou plus) ouverte au chronométrage." },
      { status: 400 }
    );
  }

  const eligibility = await canRegisterForRace(race.id, session.phoneNormalized, race.openRegistration);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.error }, { status: 403 });
  }

  const existingParticipant = await prisma.participant.findUnique({
    where: { raceId_phoneNormalized: { raceId: race.id, phoneNormalized: session.phoneNormalized } },
  });

  if (!existingParticipant && (!session.firstName || !session.lastName)) {
    return NextResponse.json(
      {
        error:
          "Renseigne ton prénom et ton nom dans Mon Espace avant de scanner une nouvelle course.",
      },
      { status: 400 }
    );
  }

  const participant = await prisma.participant.upsert({
    where: {
      raceId_phoneNormalized: { raceId: race.id, phoneNormalized: session.phoneNormalized },
    },
    update: {},
    create: {
      raceId: race.id,
      phoneNormalized: session.phoneNormalized,
      firstName: session.firstName,
      lastName: session.lastName,
    },
  });

  // Le composant Chrono (affiché juste après un scan réussi) s'appuie sur
  // la session participant "classique" pour savoir qui regarder — on
  // l'ouvre ici aussi, même si cette requête vient de Mon Espace, sinon
  // Chrono ne retrouverait personne et renverrait vers l'identification.
  await createParticipantSession({
    participantId: participant.id,
    raceId: race.id,
    phoneNormalized: session.phoneNormalized,
  });

  const outcome = await performScan(participant.id, race.id, checkpoint);

  await prisma.scanLog.create({
    data: {
      raceId: race.id,
      participantId: participant.id,
      checkpoint,
      result:
        outcome.kind === "started" || outcome.kind === "finished"
          ? "success"
          : outcome.kind === "already_started" || outcome.kind === "already_finished"
          ? "duplicate"
          : "rejected",
      ipHash: hashIp(ip),
      userAgent: request.headers.get("user-agent") ?? undefined,
    },
  });

  return NextResponse.json({ outcome, checkpoint });
}
