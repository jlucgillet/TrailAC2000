import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";
import { canRegisterForRace } from "@/lib/registration";

const bodySchema = z.object({ raceId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const race = await prisma.race.findUnique({ where: { id: parsed.data.raceId } });
  if (!race || race.status !== "active") {
    return NextResponse.json(
      { error: "Cette course n'est pas ouverte au chronométrage." },
      { status: 400 }
    );
  }

  const eligibility = await canRegisterForRace(race.id, session.phoneNormalized, race.openRegistration);
  if (!eligibility.allowed) {
    return NextResponse.json({ error: eligibility.error }, { status: 403 });
  }

  const participant = await prisma.participant.upsert({
    where: {
      raceId_phoneNormalized: {
        raceId: race.id,
        phoneNormalized: session.phoneNormalized,
      },
    },
    update: {},
    create: {
      raceId: race.id,
      phoneNormalized: session.phoneNormalized,
    },
  });

  return NextResponse.json({ participantId: participant.id, raceId: race.id });
}
