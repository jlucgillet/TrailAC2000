import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

/** Liste des membres du club (avec photo éventuelle et nombre de courses). */
export async function GET(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const members = await prisma.member.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phoneNormalized: { contains: q.replace(/\s/g, "") } },
          ],
        }
      : {},
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const phones = members.map((m) => m.phoneNormalized);
  const [photos, counts] = await Promise.all([
    prisma.athletePhoto.findMany({
      where: { phoneNormalized: { in: phones } },
      select: { id: true, phoneNormalized: true, shared: true },
    }),
    prisma.participant.groupBy({
      by: ["phoneNormalized"],
      where: { phoneNormalized: { in: phones } },
      _count: { _all: true },
    }),
  ]);
  const photoBy = new Map(photos.map((p) => [p.phoneNormalized, p]));
  const countBy = new Map(counts.map((c) => [c.phoneNormalized, c._count._all]));

  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      phoneNormalized: m.phoneNormalized,
      photoId: photoBy.get(m.phoneNormalized)?.id ?? null,
      photoShared: photoBy.get(m.phoneNormalized)?.shared ?? false,
      raceCount: countBy.get(m.phoneNormalized) ?? 0,
    })),
  });
}

const createSchema = z.object({
  firstName: z.string().trim().max(100),
  lastName: z.string().trim().max(100),
  phone: z.string().min(4),
});

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  if (!parsed.data.firstName && !parsed.data.lastName) {
    return NextResponse.json({ error: "Prénom ou nom requis." }, { status: 400 });
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone.ok) return NextResponse.json({ error: phone.error }, { status: 400 });

  const existing = await prisma.member.findUnique({ where: { phoneNormalized: phone.value } });
  if (existing) {
    return NextResponse.json(
      { error: `Ce numéro est déjà utilisé par ${existing.firstName} ${existing.lastName}.`.trim() },
      { status: 409 }
    );
  }
  const member = await prisma.member.create({
    data: {
      phoneNormalized: phone.value,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    },
  });
  return NextResponse.json({ id: member.id }, { status: 201 });
}
