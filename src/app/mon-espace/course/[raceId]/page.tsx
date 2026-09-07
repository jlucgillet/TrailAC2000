import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { AthleteScanner } from "./AthleteScanner";

export default async function AthleteScanPage({
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

  return <AthleteScanner raceId={race.id} raceName={race.name} raceStatus={race.status} />;
}
