import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/phone";
import { createAthleteSession, clearParticipantSession } from "@/lib/session";
import { isRateLimited, hashIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  phone: z.string().min(4),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`athlete_login_${hashIp(ip)}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives, réessayez dans une minute." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const normalized = normalizePhone(parsed.data.phone);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  let firstName = parsed.data.firstName;
  let lastName = parsed.data.lastName;

  if (!firstName && !lastName) {
    const known = await prisma.participant.findFirst({
      where: {
        phoneNormalized: normalized.value,
        OR: [{ firstName: { not: null } }, { lastName: { not: null } }],
      },
      orderBy: { createdAt: "desc" },
    });
    if (known) {
      firstName = known.firstName ?? undefined;
      lastName = known.lastName ?? undefined;
    }
  }

  // Se connecter à Mon Espace repart d'une identité propre : toute session
  // "scan classique" laissée par une autre personne sur cet appareil est
  // effacée, pour ne jamais mélanger les deux identités.
  clearParticipantSession();

  await createAthleteSession({ phoneNormalized: normalized.value, firstName, lastName });
  return NextResponse.json({ ok: true });
}
