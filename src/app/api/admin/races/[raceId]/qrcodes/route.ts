import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { generateQrCodePngDataUrl, buildScanUrl } from "@/lib/qrcode";

export async function GET(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const startUrl = buildScanUrl(baseUrl, race.qrStartToken, "start");
  const finishUrl = buildScanUrl(baseUrl, race.qrFinishToken, "finish");

  const [startPng, finishPng] = await Promise.all([
    generateQrCodePngDataUrl(startUrl),
    generateQrCodePngDataUrl(finishUrl),
  ]);

  return NextResponse.json({
    start: { url: startUrl, png: startPng },
    finish: { url: finishUrl, png: finishPng },
  });
}

/** Régénère un ou les deux tokens (invalide les QR codes déjà imprimés). */
export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const target: "start" | "finish" | "both" = body.target ?? "both";

  const updated = await prisma.race.update({
    where: { id: race.id },
    data: {
      qrStartToken: target === "start" || target === "both" ? randomUUID() : undefined,
      qrFinishToken: target === "finish" || target === "both" ? randomUUID() : undefined,
    },
  });

  return NextResponse.json({ race: updated });
}
