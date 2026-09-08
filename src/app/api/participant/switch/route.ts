import { NextResponse } from "next/server";
import { clearParticipantSession, clearAthleteSession } from "@/lib/session";

/**
 * "Ce n'est pas moi" : efface la session participant en cours, ET la
 * session Mon Espace si elle existe — sinon un scan suivant réactiverait
 * silencieusement l'identité précédente via cette seconde session (voir
 * la logique de repli dans /scan/[token]/[checkpoint]/route.ts).
 */
export async function POST() {
  clearParticipantSession();
  clearAthleteSession();
  return NextResponse.json({ ok: true });
}
