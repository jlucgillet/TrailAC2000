import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function POST(
  _request: NextRequest,
  { params }: { params: { trackId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const track = await prisma.track.findUnique({ where: { id: params.trackId } });
  if (!track) return NextResponse.json({ error: "Parcours introuvable." }, { status: 404 });

  const updated = await prisma.track.update({
    where: { id: track.id },
    data: { shareToken: randomUUID() },
  });

  return NextResponse.json({ shareToken: updated.shareToken });
}
