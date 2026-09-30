import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getParticipantSession } from "@/lib/session";
import { ClassicScanner } from "./ClassicScanner";

export default async function CourseScannerPage({
  params,
}: {
  params: { raceId: string };
}) {
  const session = await getParticipantSession();
  if (!session || session.raceId !== params.raceId) {
    redirect(`/course/${params.raceId}`);
  }

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) redirect(`/course/${params.raceId}`);

  return <ClassicScanner raceId={params.raceId} raceName={race.name} />;
}
