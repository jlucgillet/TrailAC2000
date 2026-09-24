import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicTrackView } from "@/app/parcours/[shareToken]/PublicTrackView";
import type { ResultRow } from "@/components/ResultsTable";

function publicName(p: { firstName: string | null; lastName: string | null; bibNumber: string | null }) {
  if (p.firstName || p.lastName) {
    return [p.firstName, p.lastName].filter(Boolean).join(" ");
  }
  return p.bibNumber ? `Dossard ${p.bibNumber}` : "Concurrent";
}

export default async function PublicRaceTrackPage({
  params,
}: {
  params: { shareToken: string };
}) {
  const race = await prisma.race.findUnique({ where: { gpxShareToken: params.shareToken } });
  if (!race || !race.gpxShareEnabled || !race.gpxData || race.distanceKm === null) {
    notFound();
  }

  // Classement des concurrents ayant terminé, trié par temps croissant —
  // même logique de confidentialité que la page résultats publique
  // (jamais de numéro de téléphone).
  const participants = await prisma.participant.findMany({
    where: { raceId: race.id },
    include: { runs: { orderBy: { attemptNumber: "desc" }, take: 1 } },
  });

  const results: ResultRow[] = participants
    .filter((p) => p.runs[0]?.status === "finished")
    .map((p) => ({
      position: null,
      displayName: publicName(p),
      bibNumber: p.bibNumber,
      category: p.category,
      status: "finished",
      durationMs: p.runs[0].durationMs !== null ? Number(p.runs[0].durationMs) : null,
    }))
    .sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))
    .map((row, i) => ({ ...row, position: i + 1 }));

  return (
    <PublicTrackView
      name={race.name}
      distanceKm={race.distanceKm}
      elevationGainM={race.elevationGainM ?? 0}
      gpxData={race.gpxData}
      shareToken={race.gpxShareToken}
      downloadPath={`/api/public/race-tracks/${race.gpxShareToken}/download`}
      label="Parcours chronométré"
      results={results}
    />
  );
}
