import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const admins = await prisma.admin.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { races: true } } },
  });

  return NextResponse.json({
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      createdAt: a.createdAt,
      racesCount: a._count.races,
      isSelf: a.id === session.adminId,
    })),
  });
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum."),
});

export async function POST(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  const existing = await prisma.admin.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Cet email est déjà utilisé." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const admin = await prisma.admin.create({
    data: { email: parsed.data.email, passwordHash },
  });

  return NextResponse.json({ id: admin.id, email: admin.email }, { status: 201 });
}
