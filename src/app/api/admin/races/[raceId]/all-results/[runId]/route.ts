import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string; runId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const run = await prisma.run.findFirst({
    where: { id: params.runId, participant: { raceId: race.id } },
  });
  if (!run) {
    return NextResponse.json({ error: "Essai introuvable." }, { status: 404 });
  }

  await prisma.run.delete({ where: { id: run.id } });

  return NextResponse.json({ ok: true });
}
