import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

const patchSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  password: z.string().min(8, "8 caractères minimum.").optional().or(z.literal("")),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { adminId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const target = await prisma.admin.findUnique({ where: { id: params.adminId } });
  if (!target) {
    return NextResponse.json({ error: "Administrateur introuvable." }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const passwordHash = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 12)
    : undefined;

  const updated = await prisma.admin.update({
    where: { id: target.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
  });
}

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
