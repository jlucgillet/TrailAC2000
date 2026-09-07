import { randomUUID } from "crypto";
import { prisma } from "./db";

export type ScanOutcome =
  | { kind: "started"; startTimestamp: Date }
  | { kind: "finished"; startTimestamp: Date; finishTimestamp: Date; durationMs: number }
  | { kind: "already_started" }
  | { kind: "already_finished"; durationMs: number }
  | { kind: "no_start" }
  | { kind: "race_not_active" };

/**
 * Traite un scan DÉPART ou ARRIVÉE de façon atomique.
 *
 * Principe de fiabilité (voir §28 du cahier des charges) :
 *  - Tous les timestamps sont générés par NOW() PostgreSQL, jamais par
 *    l'horloge du process Node ni par le client.
 *  - Les contraintes d'unicité posées en base (voir manual_constraints.sql)
 *    garantissent qu'en cas de double requête simultanée, une seule est
 *    acceptée — même si la logique applicative ci-dessous était, par
 *    hypothèse, contournée ou rejouée en parallèle.
 */
export async function performScan(
  participantId: string,
  raceId: string,
  checkpoint: "start" | "finish"
): Promise<ScanOutcome> {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race || race.status !== "active") {
    return { kind: "race_not_active" };
  }

  if (checkpoint === "start") {
    return startRun(participantId);
  }
  return finishRun(participantId);
}

async function startRun(participantId: string): Promise<ScanOutcome> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existingRunning = await tx.run.findFirst({
        where: { participantId, status: "running" },
      });
      if (existingRunning) {
        return { kind: "already_started" } as const;
      }

      const previousAttempts = await tx.run.count({ where: { participantId } });
      const id = randomUUID();

      const rows = await tx.$queryRaw<{ start_timestamp: Date }[]>`
        INSERT INTO runs (id, participant_id, attempt_number, status, start_timestamp, created_at, updated_at)
        VALUES (${id}, ${participantId}, ${previousAttempts + 1}, 'running'::"RunStatus", NOW(), NOW(), NOW())
        RETURNING start_timestamp
      `;

      return { kind: "started", startTimestamp: rows[0].start_timestamp } as const;
    });
  } catch (err: unknown) {
    // Violation de la contrainte d'unicité partielle (départ concurrent) :
    // on retombe proprement sur "déjà démarré" plutôt que de faire planter la requête.
    if (isUniqueViolation(err)) {
      return { kind: "already_started" };
    }
    throw err;
  }
}

async function finishRun(participantId: string): Promise<ScanOutcome> {
  return prisma.$transaction(async (tx) => {
    const runningRun = await tx.run.findFirst({
      where: { participantId, status: "running" },
    });

    if (!runningRun) {
      // Soit aucun départ n'a jamais été scanné, soit il est déjà terminé.
      const lastFinished = await tx.run.findFirst({
        where: { participantId, status: "finished" },
        orderBy: { finishTimestamp: "desc" },
      });
      if (lastFinished && lastFinished.durationMs !== null) {
        return { kind: "already_finished", durationMs: Number(lastFinished.durationMs) };
      }
      return { kind: "no_start" };
    }

    const rows = await tx.$queryRaw<
      { start_timestamp: Date; finish_timestamp: Date; duration_ms: bigint }[]
    >`
      UPDATE runs
      SET finish_timestamp = NOW(),
          status = 'finished'::"RunStatus",
          duration_ms = FLOOR(EXTRACT(EPOCH FROM (NOW() - start_timestamp)) * 1000),
          updated_at = NOW()
      WHERE id = ${runningRun.id} AND status = 'running'::"RunStatus"
      RETURNING start_timestamp, finish_timestamp, duration_ms
    `;

    if (rows.length === 0) {
      // Une autre requête a terminé ce run entre-temps.
      return { kind: "already_finished", durationMs: 0 };
    }

    const row = rows[0];
    return {
      kind: "finished",
      startTimestamp: row.start_timestamp,
      finishTimestamp: row.finish_timestamp,
      durationMs: Number(row.duration_ms),
    };
  });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  ) || (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}
