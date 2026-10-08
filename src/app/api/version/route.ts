import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Identifiant de la version déployée (commit Vercel), pour détecter une mise à jour. */
export async function GET() {
  return NextResponse.json(
    { version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
