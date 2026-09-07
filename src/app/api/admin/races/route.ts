import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const races = await prisma.race.findMany({
    where: { adminId: session.adminId },
    orderBy: { date: "desc" },
    include: { _count: { select: { participants: true } } },
  });

  return NextResponse.json({ races });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  date: z.string(), // ISO date
  startTime: z.string().optional(),
  location: z.string().optional(),
  distanceKm: z.number().optional(),
  timezone: z.string().default("Europe/Paris"),
});

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides.", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const race = await prisma.race.create({
    data: {
      name: data.name,
      description: data.description,
      date: new Date(data.date),
      startTime: data.startTime ? new Date(data.startTime) : null,
      location: data.location,
      distanceKm: data.distanceKm,
      timezone: data.timezone,
      adminId: session.adminId,
      status: "draft",
    },
  });

  return NextResponse.json({ race }, { status: 201 });
}
