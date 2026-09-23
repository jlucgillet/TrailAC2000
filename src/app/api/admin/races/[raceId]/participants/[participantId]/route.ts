import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string; participantId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const participant = await prisma.participant.findFirst({
    where: { id: params.participantId, raceId: race.id },
  });
  if (!participant) {
    return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });
  }

  // La suppression du concurrent entraîne celle de ses runs (onDelete:
  // Cascade sur la relation Run → Participant) : son historique de
  // chronométrage pour cette course disparaît avec lui.
  await prisma.participant.delete({ where: { id: participant.id } });

  return NextResponse.json({ ok: true });
}
