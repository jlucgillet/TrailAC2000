import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { formatDurationMs } from "@/lib/time";

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

  const rows = participants
    .map((p) => {
      const run = p.runs[0];
      return {
        bib: p.bibNumber ?? "",
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        category: p.category ?? "",
        start: run?.startTimestamp?.toISOString() ?? "",
        finish: run?.finishTimestamp?.toISOString() ?? "",
        durationMs: run?.durationMs ? Number(run.durationMs) : null,
        status: run?.status ?? "registered",
      };
    })
    .sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity));

  const header = ["Position", "Dossard", "Prenom", "Nom", "Categorie", "Depart", "Arrivee", "Temps", "Statut"];
  let position = 0;
  const lines = rows.map((r) => {
    if (r.status === "finished") position += 1;
    return [
      r.status === "finished" ? position : "",
      r.bib,
      r.firstName,
      r.lastName,
      r.category,
      r.start,
      r.finish,
      r.durationMs !== null ? formatDurationMs(r.durationMs) : "",
      r.status,
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultats-${race.id}.csv"`,
    },
  });
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
