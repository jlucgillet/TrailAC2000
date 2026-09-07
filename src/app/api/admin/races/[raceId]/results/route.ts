import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const participants = await prisma.participant.findMany({
    where: { raceId: race.id },
    include: { runs: { orderBy: { attemptNumber: "desc" }, take: 1 } },
  });

  const rows = participants.map((p) => {
    const run = p.runs[0];
    return {
      participantId: p.id,
      displayName: [p.firstName, p.lastName].filter(Boolean).join(" ") || "—",
      phone: p.phoneNormalized,
      bibNumber: p.bibNumber,
      category: p.category,
      team: p.team,
      status: run?.status ?? "registered",
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

  const stats = {
    registered: participants.length,
    started: rows.filter((r) => r.status === "running" || r.status === "finished").length,
    finished: rows.filter((r) => r.status === "finished").length,
    running: rows.filter((r) => r.status === "running").length,
    bestDurationMs: rows.filter((r) => r.durationMs !== null).sort((a, b) => (a.durationMs ?? 0) - (b.durationMs ?? 0))[0]?.durationMs ?? null,
    lastFinishedName:
      [...rows]
        .filter((r) => r.finishTimestamp)
        .sort((a, b) => new Date(b.finishTimestamp!).getTime() - new Date(a.finishTimestamp!).getTime())[0]
        ?.displayName ?? null,
  };

  return NextResponse.json({ race, stats, results: ranked });
}
