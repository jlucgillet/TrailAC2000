import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const search = request.nextUrl.searchParams.get("q")?.trim();

  const participants = await prisma.participant.findMany({
    where: {
      race: { adminId: session.adminId },
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
    include: { race: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return NextResponse.json({
    participants: participants.map((p) => ({
      id: p.id,
      raceId: p.race.id,
      raceName: p.race.name,
      raceStatus: p.race.status,
      phoneNormalized: p.phoneNormalized,
      firstName: p.firstName,
      lastName: p.lastName,
      bibNumber: p.bibNumber,
      category: p.category,
      team: p.team,
    })),
  });
}
