import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { TrackDetail } from "./TrackDetail";

export default async function TrackDetailPage({
  params,
}: {
  params: { trackId: string };
}) {
  const session = await getAdminSession();
  if (!session) notFound();

  const track = await prisma.track.findFirst({
    where: { id: params.trackId, adminId: session.adminId },
  });
  if (!track) notFound();

  return (
    <TrackDetail
      trackId={track.id}
      initialName={track.name}
      distanceKm={track.distanceKm}
      elevationGainM={track.elevationGainM}
    />
  );
}
