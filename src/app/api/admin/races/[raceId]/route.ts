import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

async function ownedRace(raceId: string, adminId: string) {
  return prisma.race.findFirst({ where: { id: raceId, adminId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  return NextResponse.json({ race });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().nullable().optional(),
  location: z.string().optional(),
  distanceKm: z.number().optional(),
  timezone: z.string().optional(),
  status: z.enum(["draft", "active", "closed", "archived"]).optional(),
  publicResultsEnabled: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const data = parsed.data;

  const updated = await prisma.race.update({
    where: { id: race.id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
      startTime: data.startTime ? new Date(data.startTime) : data.startTime === null ? null : undefined,
    },
  });

  return NextResponse.json({ race: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await ownedRace(params.raceId, session.adminId);
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  // Archivage plutôt que suppression physique par défaut (traçabilité RGPD-compatible).
  await prisma.race.update({ where: { id: race.id }, data: { status: "archived" } });

  return NextResponse.json({ ok: true });
}
