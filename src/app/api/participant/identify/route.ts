import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { createParticipantSession } from "@/lib/session";
import { performScan } from "@/lib/scan";
import { isRateLimited, hashIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  raceId: z.string().uuid(),
  phone: z.string().min(4),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  pendingCheckpoint: z.enum(["start", "finish"]).optional(),
  pendingToken: z.string().optional(),
});

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

  const { raceId, phone, firstName, lastName, pendingCheckpoint, pendingToken } = parsed.data;

  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race || race.status === "archived") {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }

  const normalized = normalizePhone(phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const participant = await prisma.participant.upsert({
    where: {
      raceId_phoneNormalized: {
        raceId,
        phoneNormalized: normalized.value,
      },
    },
    // Si le concurrent retape son prénom/nom lors d'un nouveau scan (ex.
    // départ puis arrivée), on met à jour plutôt que d'écraser par du vide :
    // seules les valeurs non vides envoyées remplacent les précédentes.
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

  // Si l'identification provient d'un scan QR en attente (concurrent pas
  // encore identifié au moment du scan), on complète immédiatement ce scan.
  if (pendingCheckpoint && pendingToken) {
    const tokenField: "qrStartToken" | "qrFinishToken" =
      pendingCheckpoint === "start" ? "qrStartToken" : "qrFinishToken";
    if (race[tokenField] !== pendingToken) {
      return NextResponse.json(
        { error: "Ce QR code correspond à une autre course." },
        { status: 400 }
      );
    }

    const outcome = await performScan(participant.id, raceId, pendingCheckpoint);

    await prisma.scanLog.create({
      data: {
        raceId,
        participantId: participant.id,
        checkpoint: pendingCheckpoint,
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

    return NextResponse.json({ identified: true, outcome, raceId });
  }

  return NextResponse.json({ identified: true, raceId });
}
