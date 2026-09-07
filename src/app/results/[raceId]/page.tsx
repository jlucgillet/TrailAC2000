import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PublicResultsLive } from "./PublicResultsLive";

export default async function PublicResultsPage({
  params,
}: {
  params: { raceId: string };
}) {
  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race || !race.publicResultsEnabled) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm text-muted">Résultats</p>
      <h1 className="mb-8 font-display text-4xl font-semibold">{race.name}</h1>
      <PublicResultsLive raceId={race.id} />
    </div>
  );
}
