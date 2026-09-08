import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAthleteSession, createAthleteSession } from "@/lib/session";

const bodySchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  await createAthleteSession({
    phoneNormalized: session.phoneNormalized,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
  });

  return NextResponse.json({ ok: true });
}
