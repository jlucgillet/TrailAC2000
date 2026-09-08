import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getParticipantSession } from "@/lib/session";
import { performScan } from "@/lib/scan";
import { isRateLimited, hashIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  token: z.string().min(1),
  checkpoint: z.enum(["start", "finish"]),
});

/**
 * Effectue le scan pour le participant actuellement en session, après que
 * la personne a confirmé "c'est bien moi" sur l'écran de confirmation
 * (voir /course/[raceId]/confirm). Sépare volontairement la confirmation
 * de l'exécution du scan, pour ne jamais attribuer un scan à la mauvaise
 * personne sur un téléphone partagé entre plusieurs concurrents.
 */
export async function POST(request: NextRequest) {
  const session = await getParticipantSession();
  if (!session) {
    return NextResponse.json({ error: "Session expirée, veuillez vous réidentifier." }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`confirm_scan_${hashIp(ip)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Trop de tentatives, réessayez dans une minute." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { token, checkpoint } = parsed.data;

  const race = await prisma.race.findUnique({ where: { id: session.raceId } });
  if (!race || race.status !== "active") {
    return NextResponse.json({ error: "Cette course n'est pas (ou plus) ouverte au chronométrage." }, { status: 400 });
  }

  const expectedToken = checkpoint === "start" ? race.qrStartToken : race.qrFinishToken;
  if (expectedToken !== token) {
    return NextResponse.json({ error: "Ce QR code correspond à une autre course." }, { status: 400 });
  }

  const outcome = await performScan(session.participantId, race.id, checkpoint);

  await prisma.scanLog.create({
    data: {
      raceId: race.id,
      participantId: session.participantId,
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

  return NextResponse.json({ outcome, raceId: race.id });
}
