import { NextResponse } from "next/server";
import { clearAthleteSession } from "@/lib/session";

export async function POST() {
  clearAthleteSession();
  return NextResponse.json({ ok: true });
}
