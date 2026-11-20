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

  const member = await prisma.member.findUnique({
    where: { phoneNormalized: normalized.value },
  });
  if (!member) {
    return NextResponse.json(
      {
        error:
          "Ce numéro n'est pas dans la liste des membres du club. Contacte un responsable du club pour être ajouté.",
      },
      { status: 403 }
    );
  }

  await createAthleteSession({
    phoneNormalized: member.phoneNormalized,
    firstName: member.firstName || undefined,
    lastName: member.lastName || undefined,
  });
  return NextResponse.json({ ok: true });
}
