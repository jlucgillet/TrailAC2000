import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipantSession } from "@/lib/session";
import { isRateLimited, hashIp } from "@/lib/rateLimit";

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

  // Pas encore identifié (ou identifié pour une autre course) : on renvoie
  // vers la page de saisie du téléphone, qui complétera automatiquement
  // ce scan juste après identification.
  if (!session || session.raceId !== race.id) {
    const redirectTo = `/course/${race.id}?pendingCheckpoint=${checkpoint}&pendingToken=${token}`;
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // Une session valide existe déjà pour cette course. Plutôt que de
  // l'utiliser silencieusement, on demande confirmation : sur un téléphone
  // partagé entre plusieurs concurrents, la session active pourrait être
  // celle d'une autre personne que celle qui scanne actuellement.
  const confirmUrl = `/course/${race.id}/confirm?checkpoint=${checkpoint}&token=${token}`;
  return NextResponse.redirect(`${origin}${confirmUrl}`);
}
