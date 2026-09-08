import { NextResponse } from "next/server";
import { clearAthleteSession, clearParticipantSession } from "@/lib/session";

export async function POST() {
  clearAthleteSession();
  clearParticipantSession();
  return NextResponse.json({ ok: true });
}
