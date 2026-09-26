import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { RaceFiche } from "./RaceFiche";
import type { ResultRow } from "@/components/ResultsTable";

function publicName(p: { firstName: string | null; lastName: string | null; bibNumber: string | null }) {
  if (p.firstName || p.lastName) {
    return [p.firstName, p.lastName].filter(Boolean).join(" ");
  }
  return p.bibNumber ? `Dossard ${p.bibNumber}` : "Concurrent";
}

export default async function RaceFichePage({
  params,
}: {
  params: { raceId: string };
}) {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) notFound();

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
    <RaceFiche
      raceId={race.id}
      name={race.name}
      location={race.location}
      distanceKm={race.distanceKm}
      elevationGainM={race.elevationGainM}
      gpxData={race.gpxData}
      results={results}
    />
  );
}
