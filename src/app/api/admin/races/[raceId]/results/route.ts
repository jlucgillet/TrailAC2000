import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { pickDisplayRun } from "@/lib/results";

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const participants = await prisma.participant.findMany({
    where: { raceId: race.id },
    include: { runs: true },
  });

  const rows = participants.map((p) => {
    // Le classement retient le MEILLEUR essai terminé de chaque concurrent
    // (pas le dernier) ; à défaut, son dernier essai pour afficher le statut.
    const run = pickDisplayRun(p.runs);
    return {
      participantId: p.id,
      runId: run?.id ?? null,
      displayName: [p.firstName, p.lastName].filter(Boolean).join(" ") || "—",
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phoneNormalized,
      bibNumber: p.bibNumber,
      category: p.category,
      team: p.team,
      status: run?.status ?? "registered",
      hasRunningRun: p.runs.some((r) => r.status === "running"),
      attemptsCount: p.runs.length,
      startTimestamp: run?.startTimestamp ?? null,
      finishTimestamp: run?.finishTimestamp ?? null,
      durationMs: run?.durationMs ? Number(run.durationMs) : null,
    };
  });

  rows.sort((a, b) => {
    if (a.status === "finished" && b.status === "finished") {
      return (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity);
    }
    if (a.status === "finished") return -1;
    if (b.status === "finished") return 1;
    return 0;
  });

  let position = 0;
  const ranked = rows.map((r) => {
    if (r.status === "finished") position += 1;
    return { ...r, position: r.status === "finished" ? position : null };
  });

  // Dernier arrivé : l'arrivée la plus récente, tous essais confondus
  // (pas nécessairement celle du meilleur essai affiché).
  let lastFinish: { at: Date; name: string } | null = null;
  for (const p of participants) {
    for (const r of p.runs) {
      if (r.status === "finished" && r.finishTimestamp) {
        if (!lastFinish || r.finishTimestamp > lastFinish.at) {
          lastFinish = {
            at: r.finishTimestamp,
            name: [p.firstName, p.lastName].filter(Boolean).join(" ") || "—",
          };
        }
      }
    }
  }

  const stats = {
    registered: participants.length,
    started: participants.filter((p) =>
      p.runs.some((r) => r.status === "running" || r.status === "finished")
    ).length,
    finished: rows.filter((r) => r.status === "finished").length,
    running: rows.filter((r) => r.hasRunningRun).length,
    bestDurationMs:
      rows
        .filter((r) => r.durationMs !== null)
        .sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0))[0]?.durationMs ?? null,
    lastFinishedName: lastFinish?.name ?? null,
  };

  return NextResponse.json({ race, stats, results: ranked });
}
