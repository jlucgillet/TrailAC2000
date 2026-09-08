import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

async function ownedParticipant(raceId: string, participantId: string, adminId: string) {
  const race = await prisma.race.findFirst({ where: { id: raceId, adminId } });
  if (!race) return null;
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, raceId },
  });
  if (!participant) return null;
  return { race, participant };
}

/**
 * Arrête immédiatement la course d'un concurrent actuellement "en course"
 * (ex. il a oublié de scanner l'arrivée). Utilise l'heure serveur, comme
 * un scan normal — pas de dérogation nécessaire ici puisque le run n'est
 * pas encore "finished" au moment de l'appel.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string; participantId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const owned = await ownedParticipant(params.raceId, params.participantId, session.adminId);
  if (!owned) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const runningRun = await prisma.run.findFirst({
    where: { participantId: params.participantId, status: "running" },
  });
  if (!runningRun) {
    return NextResponse.json(
      { error: "Ce concurrent n'est pas actuellement en course." },
      { status: 400 }
    );
  }

  const rows = await prisma.$queryRaw<{ duration_ms: bigint }[]>`
    UPDATE runs
    SET finish_timestamp = NOW(),
        status = 'finished'::"RunStatus",
        duration_ms = FLOOR(EXTRACT(EPOCH FROM (NOW() - start_timestamp)) * 1000),
        updated_at = NOW()
    WHERE id = ${runningRun.id} AND status = 'running'::"RunStatus"
    RETURNING duration_ms
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Ce concurrent vient déjà de terminer." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, durationMs: Number(rows[0].duration_ms) });
}

/**
 * Supprime le run le plus récent d'un concurrent (remet à "aucun résultat").
 * La fiche du concurrent (inscription) n'est pas supprimée : il redevient
 * simplement "Inscrit", prêt à rescanner DÉPART si besoin.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string; participantId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const owned = await ownedParticipant(params.raceId, params.participantId, session.adminId);
  if (!owned) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const run = await prisma.run.findFirst({
    where: { participantId: params.participantId },
    orderBy: { attemptNumber: "desc" },
  });

  if (!run) {
    return NextResponse.json({ error: "Aucun résultat à supprimer." }, { status: 404 });
  }

  await prisma.run.delete({ where: { id: run.id } });

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  startTimestamp: z.string().nullable(),
  finishTimestamp: z.string().nullable(),
});

/**
 * Corrige manuellement l'heure de départ et/ou d'arrivée d'un concurrent.
 * Contourne explicitement la protection anti-modification (réservée aux
 * corrections légitimes de l'organisateur) via le flag de session SQL
 * app.bypass_immutability, positionné uniquement dans cette route.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { raceId: string; participantId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const owned = await ownedParticipant(params.raceId, params.participantId, session.adminId);
  if (!owned) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const startTimestamp = parsed.data.startTimestamp ? new Date(parsed.data.startTimestamp) : null;
  const finishTimestamp = parsed.data.finishTimestamp ? new Date(parsed.data.finishTimestamp) : null;

  if (finishTimestamp && !startTimestamp) {
    return NextResponse.json(
      { error: "Impossible de définir une heure d'arrivée sans heure de départ." },
      { status: 400 }
    );
  }
  if (startTimestamp && finishTimestamp && finishTimestamp <= startTimestamp) {
    return NextResponse.json(
      { error: "L'heure d'arrivée doit être postérieure à l'heure de départ." },
      { status: 400 }
    );
  }

  const status = finishTimestamp ? "finished" : startTimestamp ? "running" : "registered";
  const durationMs =
    startTimestamp && finishTimestamp ? finishTimestamp.getTime() - startTimestamp.getTime() : null;

  const existingRun = await prisma.run.findFirst({
    where: { participantId: params.participantId },
    orderBy: { attemptNumber: "desc" },
  });

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.bypass_immutability = 'true'`);

    if (existingRun) {
      await tx.$executeRaw`
        UPDATE runs
        SET start_timestamp = ${startTimestamp},
            finish_timestamp = ${finishTimestamp},
            status = ${status}::"RunStatus",
            duration_ms = ${durationMs},
            updated_at = NOW()
        WHERE id = ${existingRun.id}
      `;
    } else if (startTimestamp) {
      const id = randomUUID();
      await tx.$executeRaw`
        INSERT INTO runs (id, participant_id, attempt_number, start_timestamp, finish_timestamp, status, duration_ms, created_at, updated_at)
        VALUES (${id}, ${params.participantId}, 1, ${startTimestamp}, ${finishTimestamp}, ${status}::"RunStatus", ${durationMs}, NOW(), NOW())
      `;
    }
  });

  return NextResponse.json({ ok: true, status, durationMs });
}
