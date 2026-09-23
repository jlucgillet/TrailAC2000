import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  if (params.adminId === session.adminId) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte." },
      { status: 400 }
    );
  }

  const target = await prisma.admin.findUnique({
    where: { id: params.adminId },
    include: { _count: { select: { races: true } } },
  });
  if (!target) {
    return NextResponse.json({ error: "Administrateur introuvable." }, { status: 404 });
  }

  if (target._count.races > 0) {
    return NextResponse.json(
      {
        error:
          "Impossible de supprimer cet administrateur : il possède encore des courses (supprimer un administrateur supprimerait aussi toutes ses courses). Archivez ou transférez d'abord ses courses.",
      },
      { status: 409 }
    );
  }

  const totalAdmins = await prisma.admin.count();
  if (totalAdmins <= 1) {
    return NextResponse.json(
      { error: "Impossible de supprimer le dernier compte administrateur." },
      { status: 400 }
    );
  }

  await prisma.admin.delete({ where: { id: params.adminId } });
  return NextResponse.json({ ok: true });
}
