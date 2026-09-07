import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Résultats publics : jamais de numéro de téléphone, uniquement
 * prénom/nom (si activé), dossard, catégorie et temps — cf. §12 RGPD.
 */
export async function GET(
  _request: Request,
  { params }: { params: { raceId: string } }
) {
  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race || !race.publicResultsEnabled) {
    return NextResponse.json({ error: "Résultats indisponibles." }, { status: 404 });
  }

  const participants = await prisma.participant.findMany({
    where: { raceId: race.id },
    include: {
      runs: { orderBy: { attemptNumber: "desc" }, take: 1 },
    },
  });

  const finished = participants
    .filter((p) => p.runs[0]?.status === "finished")
    .map((p) => ({
      displayName: publicName(p),
      bibNumber: p.bibNumber,
      category: p.category,
      durationMs: p.runs[0].durationMs ? Number(p.runs[0].durationMs) : null,
      status: "finished" as const,
    }))
    .sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))
    .map((row, i) => ({ position: i + 1, ...row }));

  return NextResponse.json({
    race: { id: race.id, name: race.name, date: race.date },
    results: finished,
  });
}

function publicName(p: { firstName: string | null; lastName: string | null; bibNumber: string | null }) {
  if (p.firstName || p.lastName) {
    return [p.firstName, p.lastName].filter(Boolean).join(" ");
  }
  return p.bibNumber ? `Dossard ${p.bibNumber}` : "Concurrent";
}
