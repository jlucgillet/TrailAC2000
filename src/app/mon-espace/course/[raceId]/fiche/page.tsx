import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { RaceFiche } from "./RaceFiche";
import type { ResultRow } from "@/components/ResultsTable";
import { pickDisplayRun } from "@/lib/results";

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
    include: { runs: true },
  });

  const phones = participants.map((p) => p.phoneNormalized);
  const photos = await prisma.athletePhoto.findMany({
    where: { phoneNormalized: { in: phones }, shared: true },
    select: { id: true, phoneNormalized: true },
  });
  const photoByPhone = new Map(photos.map((ph) => [ph.phoneNormalized, ph.id]));

  const results: ResultRow[] = participants
    .map((p) => ({ p, run: pickDisplayRun(p.runs) }))
    .filter(({ run }) => run?.status === "finished")
    .map(({ p, run }) => ({
      position: null,
      displayName: publicName(p),
      bibNumber: p.bibNumber,
      category: p.category,
      status: "finished",
      durationMs: run!.durationMs !== null ? Number(run!.durationMs) : null,
      photoUrl: photoByPhone.has(p.phoneNormalized)
        ? `/api/photos/${photoByPhone.get(p.phoneNormalized)}`
        : null,
    }))
    .sort((a, b) => (a.durationMs ?? Infinity) - (b.durationMs ?? Infinity))
    .map((row, i) => ({ ...row, position: i + 1 }));

  const registered = participants
    .map((p) => ({
      id: p.id,
      name: publicName(p),
      photoUrl: photoByPhone.has(p.phoneNormalized)
        ? `/api/photos/${photoByPhone.get(p.phoneNormalized)}`
        : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <RaceFiche
      registered={registered}
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
