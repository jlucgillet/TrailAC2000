import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { RaceResultsHistory } from "./RaceResultsHistory";

export default async function AthleteRaceResultsPage({
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

  return <RaceResultsHistory raceId={race.id} raceName={race.name} raceStatus={race.status} />;
}
