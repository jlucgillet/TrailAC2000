import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET manquant ou trop court (32 caractères minimum). Vérifiez vos variables d'environnement."
    );
  }
  return new TextEncoder().encode(secret);
};

const PARTICIPANT_COOKIE = "trail_participant_session";
const ADMIN_COOKIE = "trail_admin_session";

// --- Session concurrent -----------------------------------------------
// Pas de mot de passe : après saisie + validation du numéro de téléphone,
// on pose un cookie signé, valable pour la durée de la course, qui relie
// les scans suivants au bon participant sans qu'il ait à ressaisir son
// numéro (voir §29 du cahier des charges : simplifier l'UX du jour J).

export type ParticipantSessionPayload = {
  participantId: string;
  raceId: string;
  phoneNormalized: string;
};

export async function createParticipantSession(
  payload: ParticipantSessionPayload
) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("18h") // large marge pour une journée de course
    .sign(secretKey());

  cookies().set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 18,
  });
}

export async function getParticipantSession(): Promise<ParticipantSessionPayload | null> {
  const token = cookies().get(PARTICIPANT_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as ParticipantSessionPayload;
  } catch {
    return null;
  }
}

// --- Session admin ------------------------------------------------------

export type AdminSessionPayload = {
  adminId: string;
  email: string;
};

export async function createAdminSession(payload: AdminSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey());

  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function clearAdminSession() {
  cookies().delete(ADMIN_COOKIE);
}

export function clearParticipantSession() {
  cookies().delete(PARTICIPANT_COOKIE);
}
