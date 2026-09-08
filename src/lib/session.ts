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
const ATHLETE_COOKIE = "trail_athlete_session";

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

// --- Session "espace concurrent" (persistante, multi-courses) ---------
// Contrairement à la session participant ci-dessus (liée à UNE course, posée
// après un scan), cette session sert à un espace où le concurrent consulte
// l'historique de toutes ses courses et peut en rejoindre de nouvelles.
// Identification par téléphone seul, sans code de vérification (même niveau
// de sécurité que le reste de l'application : voir la note du cahier des
// charges sur ce compromis).

export type AthleteSessionPayload = {
  phoneNormalized: string;
  firstName?: string;
  lastName?: string;
};

export async function createAthleteSession(payload: AthleteSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey());

  cookies().set(ATHLETE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getAthleteSession(): Promise<AthleteSessionPayload | null> {
  const token = cookies().get(ATHLETE_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as AthleteSessionPayload;
  } catch {
    return null;
  }
}

export function clearAthleteSession() {
  cookies().delete(ATHLETE_COOKIE);
}
