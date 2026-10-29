import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession, getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { photoId: string } }) {
  const [athlete, admin] = await Promise.all([getAthleteSession(), getAdminSession()]);
  if (!athlete && !admin) return new NextResponse("Non authentifié.", { status: 401 });

  const photo = await prisma.athletePhoto.findUnique({ where: { id: params.photoId } });
  if (!photo) return new NextResponse("Introuvable.", { status: 404 });

  const isOwner = athlete?.phoneNormalized === photo.phoneNormalized;
  if (!photo.shared && !isOwner && !admin) return new NextResponse("Introuvable.", { status: 404 });

  return new NextResponse(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
