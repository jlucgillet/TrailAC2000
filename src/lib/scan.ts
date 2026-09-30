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
 *  - Tous les timestamps sont générés côté serveur, jamais par l'horloge
 *    du process Node au moment le plus tardif possible ni par le client.
 *  - `timestamp` est TOUJOURS une valeur produite par notre propre
 *    serveur — soit `new Date()` à l'instant de l'appel (comportement par
 *    défaut), soit une valeur capturée plus tôt par le serveur (ex. au
 *    moment exact où le QR code a été scanné, avant même que la personne
 *    ait fini de saisir son téléphone) et transmise de façon infalsifiable
 *    via un ticket signé — jamais une valeur simplement recopiée depuis
 *    une requête client sans garantie d'origine.
 *  - Les contraintes d'unicité posées en base (voir manual_constraints.sql)
 *    garantissent qu'en cas de double requête simultanée, une seule est
 *    acceptée.
 */
export async function performScan(
  participantId: string,
  raceId: string,
  checkpoint: "start" | "finish",
  timestamp: Date = new Date()
): Promise<ScanOutcome> {
  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race || race.status !== "active") {
    return { kind: "race_not_active" };
  }

  if (checkpoint === "start") {
    return startRun(participantId, timestamp);
  }
  return finishRun(participantId, timestamp);
}

async function startRun(participantId: string, timestamp: Date): Promise<ScanOutcome> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existingRunning = await tx.run.findFirst({
        where: { participantId, status: "running" },
      });
      if (existingRunning) {
        return { kind: "already_started" } as const;
      }

      // Numérotation basée sur le numéro d'essai le plus haut déjà utilisé
      // (pas un simple comptage des lignes) : reste correcte même si un
      // essai a été supprimé entre-temps par un administrateur.
      const lastAttempt = await tx.run.findFirst({
        where: { participantId },
        orderBy: { attemptNumber: "desc" },
      });
      const nextAttemptNumber = (lastAttempt?.attemptNumber ?? 0) + 1;
      const id = randomUUID();

      const rows = await tx.$queryRaw<{ start_timestamp: Date }[]>`
        INSERT INTO runs (id, participant_id, attempt_number, status, start_timestamp, created_at, updated_at)
        VALUES (${id}, ${participantId}, ${nextAttemptNumber}, 'running'::"RunStatus", ${timestamp}, NOW(), NOW())
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

async function finishRun(participantId: string, timestamp: Date): Promise<ScanOutcome> {
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
      SET finish_timestamp = ${timestamp},
          status = 'finished'::"RunStatus",
          duration_ms = FLOOR(EXTRACT(EPOCH FROM (${timestamp}::timestamptz - start_timestamp)) * 1000),
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
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002") ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "23505")
  );
}
