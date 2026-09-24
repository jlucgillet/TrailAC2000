import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicTrackView } from "./PublicTrackView";

export default async function PublicTrackPage({
  params,
}: {
  params: { shareToken: string };
}) {
  const track = await prisma.track.findUnique({ where: { shareToken: params.shareToken } });
  if (!track || !track.shareEnabled) notFound();

  return (
    <PublicTrackView
      name={track.name}
      distanceKm={track.distanceKm}
      elevationGainM={track.elevationGainM}
      gpxData={track.gpxData}
      shareToken={track.shareToken}
    />
  );
}
