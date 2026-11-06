import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`track-follow:${ip}`, 20, 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const id = typeof body?.id === "string" ? body.id.slice(0, 100) : "";
  const visitorId =
    typeof body?.visitorId === "string" && body.visitorId.length <= 64 ? body.visitorId : null;
  if (!id || !["athlete", "shared", "race"].includes(kind)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  let trackId: string | null = null;
  let raceId: string | null = null;
  if (kind === "athlete") {
    const t = await prisma.track.findUnique({ where: { id }, select: { id: true } });
    trackId = t?.id ?? null;
  } else if (kind === "shared") {
    const t = await prisma.track.findUnique({ where: { shareToken: id }, select: { id: true } });
    trackId = t?.id ?? null;
  } else {
    const r = await prisma.race.findUnique({ where: { gpxShareToken: id }, select: { id: true } });
    raceId = r?.id ?? null;
  }
  if (!trackId && !raceId) return NextResponse.json({ ok: true });

  // Évite de compter plusieurs fois le même visiteur sur le même parcours en 10 min
  // (double appui sur Démarrer, rechargement de page…).
  if (visitorId) {
    const recent = await prisma.trackFollow.findFirst({
      where: {
        visitorId,
        trackId,
        raceId,
        createdAt: { gt: new Date(Date.now() - 10 * 60_000) },
      },
      select: { id: true },
    });
    if (recent) return NextResponse.json({ ok: true });
  }

  await prisma.trackFollow.create({ data: { trackId, raceId, source: kind, visitorId } });
  return NextResponse.json({ ok: true });
}
