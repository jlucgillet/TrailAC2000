import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const now = Date.now();
  const follows = await prisma.trackFollow.findMany({
    select: { trackId: true, raceId: true, source: true, visitorId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 50000,
  });

  type Row = {
    key: string;
    type: "track" | "race";
    refId: string;
    total: number;
    visitors: Set<string>;
    last7: number;
    last30: number;
    last: Date;
    bySource: Record<string, number>;
  };
  const rows = new Map<string, Row>();
  const allVisitors = new Set<string>();
  let last7 = 0;
  let last30 = 0;
  const daily = new Map<string, number>();

  for (const f of follows) {
    const type = f.trackId ? "track" : "race";
    const refId = (f.trackId ?? f.raceId)!;
    const key = `${type}:${refId}`;
    let r = rows.get(key);
    if (!r) {
      r = { key, type, refId, total: 0, visitors: new Set(), last7: 0, last30: 0, last: f.createdAt, bySource: {} };
      rows.set(key, r);
    }
    const age = now - f.createdAt.getTime();
    r.total += 1;
    if (f.visitorId) {
      r.visitors.add(f.visitorId);
      allVisitors.add(f.visitorId);
    }
    if (age < 7 * DAY) {
      r.last7 += 1;
      last7 += 1;
    }
    if (age < 30 * DAY) {
      r.last30 += 1;
      last30 += 1;
      const day = f.createdAt.toISOString().slice(0, 10);
      daily.set(day, (daily.get(day) ?? 0) + 1);
    }
    r.bySource[f.source] = (r.bySource[f.source] ?? 0) + 1;
  }

  const trackIds = Array.from(rows.values()).filter((r) => r.type === "track").map((r) => r.refId);
  const raceIds = Array.from(rows.values()).filter((r) => r.type === "race").map((r) => r.refId);
  const [tracks, races] = await Promise.all([
    prisma.track.findMany({ where: { id: { in: trackIds } }, select: { id: true, name: true } }),
    prisma.race.findMany({ where: { id: { in: raceIds } }, select: { id: true, name: true } }),
  ]);
  const names = new Map<string, string>([
    ...tracks.map((t) => [`track:${t.id}`, t.name] as [string, string]),
    ...races.map((r) => [`race:${r.id}`, r.name] as [string, string]),
  ]);

  const series = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * DAY).toISOString().slice(0, 10);
    series.push({ date: day, count: daily.get(day) ?? 0 });
  }

  return NextResponse.json({
    totals: { total: follows.length, visitors: allVisitors.size, last7, last30 },
    rows: Array.from(rows.values())
      .map((r) => ({
        key: r.key,
        type: r.type,
        name: names.get(r.key) ?? "(supprimé)",
        total: r.total,
        visitors: r.visitors.size,
        last7: r.last7,
        last30: r.last30,
        last: r.last,
        bySource: r.bySource,
      }))
      .sort((a, b) => b.total - a.total),
    daily: series,
  });
}
