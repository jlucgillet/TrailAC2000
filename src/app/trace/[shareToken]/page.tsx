import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicTrackView } from "@/app/parcours/[shareToken]/PublicTrackView";

export default async function PublicRaceTrackPage({
  params,
}: {
  params: { shareToken: string };
}) {
  const race = await prisma.race.findUnique({ where: { gpxShareToken: params.shareToken } });
  if (!race || !race.gpxShareEnabled || !race.gpxData || race.distanceKm === null) {
    notFound();
  }

  return (
    <PublicTrackView
      name={race.name}
      distanceKm={race.distanceKm}
      elevationGainM={race.elevationGainM ?? 0}
      gpxData={race.gpxData}
      shareToken={race.gpxShareToken}
      downloadPath={`/api/public/race-tracks/${race.gpxShareToken}/download`}
    />
  );
}
