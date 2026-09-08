import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getParticipantSession } from "@/lib/session";
import { ConfirmScan } from "./ConfirmScan";

function maskPhone(phone: string): string {
  // Affiche uniquement les 4 derniers chiffres, pour que la personne se
  // reconnaisse sans exposer son numéro complet à qui regarderait l'écran.
  const digits = phone.replace(/\D/g, "");
  return `••• ${digits.slice(-4, -2)} ${digits.slice(-2)}`;
}

export default async function ConfirmScanPage({
  params,
  searchParams,
}: {
  params: { raceId: string };
  searchParams: { checkpoint?: string; token?: string };
}) {
  const { checkpoint, token } = searchParams;
  if (checkpoint !== "start" && checkpoint !== "finish") notFound();
  if (!token) notFound();

  const session = await getParticipantSession();
  if (!session || session.raceId !== params.raceId) {
    redirect(`/course/${params.raceId}?pendingCheckpoint=${checkpoint}&pendingToken=${token}`);
  }

  const [race, participant] = await Promise.all([
    prisma.race.findUnique({ where: { id: params.raceId } }),
    prisma.participant.findUnique({ where: { id: session.participantId } }),
  ]);

  if (!race || !participant) notFound();

  const displayName =
    [participant.firstName, participant.lastName].filter(Boolean).join(" ") ||
    maskPhone(participant.phoneNormalized);

  return (
    <ConfirmScan
      raceId={race.id}
      raceName={race.name}
      checkpoint={checkpoint}
      token={token}
      displayName={displayName}
      pendingUrl={`/course/${race.id}?pendingCheckpoint=${checkpoint}&pendingToken=${token}`}
    />
  );
}
