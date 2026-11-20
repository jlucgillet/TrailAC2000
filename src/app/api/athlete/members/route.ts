import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Trombinoscope : prénom, nom et photo de chaque membre. Un membre qui a
 * décoché « partager ma photo » apparaît sans photo. Les numéros de téléphone
 * ne sont jamais renvoyés.
 */
export async function GET() {
  const session = await getAthleteSession(); // refuse aussi les non-membres
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const members = await prisma.member.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, phoneNormalized: true },
  });
  const photos = await prisma.athletePhoto.findMany({
    where: { shared: true, phoneNormalized: { in: members.map((m) => m.phoneNormalized) } },
    select: { id: true, phoneNormalized: true },
  });
  const photoBy = new Map(photos.map((p) => [p.phoneNormalized, p.id]));

  return NextResponse.json(
    {
      me: session.phoneNormalized,
      members: members.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        photoId: photoBy.get(m.phoneNormalized) ?? null,
        isMe: m.phoneNormalized === session.phoneNormalized,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
