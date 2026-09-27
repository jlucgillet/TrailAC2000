import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizePhone } from "@/lib/phone";

const patchSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  bibNumber: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  phone: z.string().min(4).optional(),
});

export async function PATCH(
  request: NextRequest,
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

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const data = parsed.data;

  let phoneNormalized: string | undefined;
  if (data.phone !== undefined) {
    const normalized = normalizePhone(data.phone);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    phoneNormalized = normalized.value;
  }

  try {
    const updated = await prisma.participant.update({
      where: { id: participant.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        bibNumber: data.bibNumber,
        category: data.category,
        phoneNormalized,
      },
    });
    return NextResponse.json({ participant: updated });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Ce numéro est déjà utilisé par un autre concurrent de cette course." },
        { status: 409 }
      );
    }
    throw err;
  }
}

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
