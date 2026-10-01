import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { RaceResultsHistory } from "./RaceResultsHistory";

export default async function RaceResultsPage({
  params,
}: {
  params: { raceId: string };
}) {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  return <RaceResultsHistory raceId={params.raceId} />;
}
