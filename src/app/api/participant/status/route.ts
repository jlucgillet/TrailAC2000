import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getParticipantSession } from "@/lib/session";

/**
 * Interrogé en polling par l'écran du concurrent pour connaître son état
 * (en course / terminé) et resynchroniser le chronomètre visuel sur
 * l'heure serveur — jamais sur l'horloge locale du téléphone.
 */
export async function GET() {
  const session = await getParticipantSession();
  if (!session) {
    return NextResponse.json({ error: "Non identifié." }, { status: 401 });
  }

  const race = await prisma.race.findUnique({ where: { id: session.raceId } });
  if (!race) {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }

  const participant = await prisma.participant.findUnique({
    where: { id: session.participantId },
  });

  const currentRun = await prisma.run.findFirst({
    where: {
      participantId: session.participantId,
      status: { in: ["running", "finished"] },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    serverNow: new Date().toISOString(),
    race: { id: race.id, name: race.name, timezone: race.timezone, status: race.status },
    participant: participant
      ? { firstName: participant.firstName, lastName: participant.lastName }
      : null,
    run: currentRun
      ? {
          status: currentRun.status,
          startTimestamp: currentRun.startTimestamp,
          finishTimestamp: currentRun.finishTimestamp,
          durationMs: currentRun.durationMs ? Number(currentRun.durationMs) : null,
        }
      : null,
  });
}
