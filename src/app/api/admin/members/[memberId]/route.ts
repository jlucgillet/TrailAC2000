import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizePhone } from "@/lib/phone";

const patchSchema = z.object({
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phone: z.string().min(4).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: { memberId: string } }) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: params.memberId } });
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  const data: { firstName?: string; lastName?: string; phoneNormalized?: string } = {};
  if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName;

  let newPhone: string | null = null;
  if (parsed.data.phone !== undefined) {
    const phone = normalizePhone(parsed.data.phone);
    if (!phone.ok) return NextResponse.json({ error: phone.error }, { status: 400 });
    if (phone.value !== member.phoneNormalized) {
      const clash = await prisma.member.findUnique({ where: { phoneNormalized: phone.value } });
      if (clash) {
        return NextResponse.json({ error: "Ce numéro appartient déjà à un autre membre." }, { status: 409 });
      }
      newPhone = phone.value;
      data.phoneNormalized = phone.value;
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.member.update({ where: { id: member.id }, data });
      if (newPhone) {
        // Le numéro est le lien avec les courses et la photo : on les suit.
        await tx.athletePhoto.updateMany({
          where: { phoneNormalized: member.phoneNormalized },
          data: { phoneNormalized: newPhone },
        });
        await tx.participant.updateMany({
          where: { phoneNormalized: member.phoneNormalized },
          data: { phoneNormalized: newPhone },
        });
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Changement impossible : ce numéro est déjà inscrit dans l'une des courses de ce membre." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: { memberId: string } }) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const member = await prisma.member.findUnique({ where: { id: params.memberId } });
  if (!member) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });

  // Le membre perd l'accès à l'espace membre ; sa photo est supprimée.
  // Ses inscriptions et résultats dans les courses sont conservés.
  await prisma.$transaction([
    prisma.athletePhoto.deleteMany({ where: { phoneNormalized: member.phoneNormalized } }),
    prisma.member.delete({ where: { id: member.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
