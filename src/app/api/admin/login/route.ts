import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAdminSession } from "@/lib/session";
import { isRateLimited, hashIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(`admin_login_${hashIp(ip)}`, 10, 5 * 60_000)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez dans quelques minutes." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const admin = await prisma.admin.findUnique({ where: { email } });

  // Comparaison toujours exécutée (même sans admin trouvé) pour éviter
  // de révéler par le timing de réponse si l'email existe.
  const passwordHash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinva";
  const valid = await bcrypt.compare(password, passwordHash);

  if (!admin || !valid) {
    return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
  }

  await createAdminSession({ adminId: admin.id, email: admin.email });
  return NextResponse.json({ ok: true });
}
