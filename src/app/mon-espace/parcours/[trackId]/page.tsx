import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { TrackViewer } from "./TrackViewer";

export default async function AthleteTrackPage({
  params,
}: {
  params: { trackId: string };
}) {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) notFound();

  return (
    <TrackViewer
      trackId={track.id}
      name={track.name}
      distanceKm={track.distanceKm}
      elevationGainM={track.elevationGainM}
      gpxData={track.gpxData}
    />
  );
}
