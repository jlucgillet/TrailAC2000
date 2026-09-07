import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import { RaceWorkspace } from "./RaceWorkspace";

export default async function RaceDetailPage({
  params,
}: {
  params: { raceId: string };
}) {
  const session = await getAdminSession();
  if (!session) notFound();

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) notFound();

  return <RaceWorkspace race={JSON.parse(JSON.stringify(race))} />;
}
