import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAthleteSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_BYTES = 300 * 1024;

function isJpeg(buf: Buffer) {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

export async function GET() {
  const session = await getAthleteSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const photo = await prisma.athletePhoto.findUnique({
    where: { phoneNormalized: session.phoneNormalized },
    select: { id: true, shared: true, updatedAt: true },
  });
  return NextResponse.json({ photo });
}

export async function POST(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image trop lourde." }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (!isJpeg(buf)) {
    return NextResponse.json({ error: "Format JPEG attendu." }, { status: 400 });
  }

  // Nouvel id à chaque envoi pour invalider le cache navigateur.
  const id = crypto.randomUUID();
  const photo = await prisma.athletePhoto.upsert({
    where: { phoneNormalized: session.phoneNormalized },
    create: { id, phoneNormalized: session.phoneNormalized, data: buf, contentType: "image/jpeg" },
    update: { id, data: buf, contentType: "image/jpeg" },
    select: { id: true, shared: true },
  });
  return NextResponse.json({ photo });
}

export async function PATCH(request: NextRequest) {
  const session = await getAthleteSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.shared !== "boolean") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const res = await prisma.athletePhoto.updateMany({
    where: { phoneNormalized: session.phoneNormalized },
    data: { shared: body.shared },
  });
  if (res.count === 0) return NextResponse.json({ error: "Aucune photo." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await getAthleteSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await prisma.athletePhoto.deleteMany({ where: { phoneNormalized: session.phoneNormalized } });
  return NextResponse.json({ ok: true });
}
