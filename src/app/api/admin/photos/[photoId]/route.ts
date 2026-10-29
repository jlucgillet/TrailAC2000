import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE(_req: Request, { params }: { params: { photoId: string } }) {
  const { session, response } = await requireAdmin();
  if (!session) return response;
  await prisma.athletePhoto.deleteMany({ where: { id: params.photoId } });
  return NextResponse.json({ ok: true });
}
