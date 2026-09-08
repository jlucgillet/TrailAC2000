import { NextResponse } from "next/server";
import { clearParticipantSession } from "@/lib/session";

/**
 * "Ce n'est pas moi" : efface la session participant en cours, pour
 * permettre à une autre personne de s'identifier sur le même appareil
 * sans hériter de la session précédente.
 */
export async function POST() {
  clearParticipantSession();
  return NextResponse.json({ ok: true });
}
