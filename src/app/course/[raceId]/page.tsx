import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PhoneForm } from "@/components/PhoneForm";

export default async function CourseIdentifyPage({
  params,
  searchParams,
}: {
  params: { raceId: string };
  searchParams: { pendingCheckpoint?: string; pendingToken?: string };
}) {
  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race || race.status === "archived") {
    notFound();
  }

  if (race.status !== "active") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 font-display text-3xl font-semibold">{race.name}</h1>
        <p className="text-muted">
          Cette course n&rsquo;est pas encore ouverte au chronométrage. Revenez le jour de l&rsquo;épreuve.
        </p>
      </div>
    );
  }

  return (
    <PhoneForm
      raceId={race.id}
      raceName={race.name}
      pendingCheckpoint={searchParams.pendingCheckpoint}
      pendingToken={searchParams.pendingToken}
    />
  );
}
