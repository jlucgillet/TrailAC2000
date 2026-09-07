import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizePhone } from "@/lib/phone";

export async function GET(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const search = request.nextUrl.searchParams.get("q")?.trim();

  const participants = await prisma.participant.findMany({
    where: {
      raceId: race.id,
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { bibNumber: { contains: search, mode: "insensitive" } },
              { phoneNormalized: { contains: search } },
            ],
          }
        : {}),
    },
    include: { runs: { orderBy: { attemptNumber: "desc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  // BigInt (durationMs) n'est pas sérialisable nativement en JSON.
  const serializable = participants.map((p) => ({
    ...p,
    runs: p.runs.map((r) => ({
      ...r,
      durationMs: r.durationMs !== null ? Number(r.durationMs) : null,
    })),
  }));

  return NextResponse.json({ participants: serializable });
}

const addSchema = z.object({
  phone: z.string().min(4),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bibNumber: z.string().optional(),
  category: z.string().optional(),
  team: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  const data = parsed.data;

  const normalized = normalizePhone(data.phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  try {
    const participant = await prisma.participant.create({
      data: {
        raceId: race.id,
        phoneNormalized: normalized.value,
        firstName: data.firstName,
        lastName: data.lastName,
        bibNumber: data.bibNumber,
        category: data.category,
        team: data.team,
        email: data.email || undefined,
      },
    });
    return NextResponse.json({ participant }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
      return NextResponse.json(
        { error: "Ce numéro est déjà inscrit sur cette course." },
        { status: 409 }
      );
    }
    throw err;
  }
}
