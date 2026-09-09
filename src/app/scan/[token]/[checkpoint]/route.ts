import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipantSession, getAthleteSession, createParticipantSession } from "@/lib/session";
import { performScan } from "@/lib/scan";
import { isRateLimited, hashIp } from "@/lib/rateLimit";
import { canRegisterForRace } from "@/lib/registration";

/**
 * Point d'entrée atteint quand un concurrent scanne un QR code
 * (ouverture directe de l'URL via l'appareil photo natif, §15).
 * Ne contient jamais de donnée personnelle : uniquement un token
 * opaque identifiant la course + le point de contrôle.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string; checkpoint: string } }
) {
  const { token, checkpoint } = params;
  const origin = request.nextUrl.origin;

  if (checkpoint !== "start" && checkpoint !== "finish") {
    return NextResponse.redirect(`${origin}/scan/error?reason=invalid`);
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`scan_${hashIp(ip)}`, 20, 60_000)) {
    return NextResponse.redirect(`${origin}/scan/error?reason=rate_limited`);
  }

  const race = await prisma.race.findFirst({
    where:
      checkpoint === "start" ? { qrStartToken: token } : { qrFinishToken: token },
  });

  if (!race) {
    return NextResponse.redirect(`${origin}/scan/error?reason=unknown_race`);
  }

  if (race.status !== "active") {
    return NextResponse.redirect(
      `${origin}/scan/error?reason=race_not_active&race=${race.id}`
    );
  }

  const session = await getParticipantSession();
  let participantId: string;

  if (session && session.raceId === race.id) {
    participantId = session.participantId;
  } else {
    // Pas de session "scan classique" pour cette course : si la personne
    // est connectée à Mon Espace, on réutilise directement cette identité
    // (numéro de téléphone) au lieu de redemander le téléphone.
    const athleteSession = await getAthleteSession();

    if (!athleteSession) {
      const redirectTo = `/course/${race.id}?pendingCheckpoint=${checkpoint}&pendingToken=${token}`;
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    const eligibility = await canRegisterForRace(
      race.id,
      athleteSession.phoneNormalized,
      race.openRegistration
    );
    if (!eligibility.allowed) {
      return NextResponse.redirect(
        `${origin}/scan/error?reason=not_registered&race=${race.id}`
      );
    }

    const participant = await prisma.participant.upsert({
      where: {
        raceId_phoneNormalized: {
          raceId: race.id,
          phoneNormalized: athleteSession.phoneNormalized,
        },
      },
      update: {
        ...(athleteSession.firstName ? { firstName: athleteSession.firstName } : {}),
        ...(athleteSession.lastName ? { lastName: athleteSession.lastName } : {}),
      },
      create: {
        raceId: race.id,
        phoneNormalized: athleteSession.phoneNormalized,
        firstName: athleteSession.firstName,
        lastName: athleteSession.lastName,
      },
    });

    // On établit aussi la session "scan classique" pour que l'écran du
    // chronomètre (qui s'appuie dessus) continue de fonctionner normalement.
    await createParticipantSession({
      participantId: participant.id,
      raceId: race.id,
      phoneNormalized: athleteSession.phoneNormalized,
    });

    participantId = participant.id;
  }

  const outcome = await performScan(participantId, race.id, checkpoint);

  await prisma.scanLog.create({
    data: {
      raceId: race.id,
      participantId,
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

  const outcomeParam = encodeURIComponent(JSON.stringify(outcome));
  return NextResponse.redirect(
    `${origin}/course/${race.id}/run?outcome=${outcomeParam}`
  );
}
