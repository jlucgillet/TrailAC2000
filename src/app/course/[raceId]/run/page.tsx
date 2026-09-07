import { redirect } from "next/navigation";
import { getParticipantSession } from "@/lib/session";
import { Chrono } from "@/components/Chrono";

export default async function RunPage({
  params,
}: {
  params: { raceId: string };
}) {
  const session = await getParticipantSession();
  if (!session || session.raceId !== params.raceId) {
    redirect(`/course/${params.raceId}`);
  }

  return <Chrono raceId={params.raceId} />;
}
