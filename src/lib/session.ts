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

// --- Session concurrent (scan classique) ---------------------------------
// Pas de mot de passe : après saisie + validation du numéro de téléphone,
// on pose un cookie signé, qui relie les scans suivants au bon participant
// sans qu'il ait à ressaisir son numéro.

export type ParticipantSessionPayload = {
  participantId: string;
  raceId: string;
  phoneNormalized: string;
};

export async function createParticipantSession(
  payload: ParticipantSessionPayload
) {
  // Durée volontairement très longue : la session doit rester active tant
  // que la personne ne se déconnecte pas explicitement (lien "Changer de
  // concurrent"), pas seulement le temps d'une journée de course.
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secretKey());

  cookies().set(PARTICIPANT_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
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

export function clearParticipantSession() {
  cookies().delete(PARTICIPANT_COOKIE);
}

// --- Session admin ---------------------------------------------------------

export type AdminSessionPayload = {
  adminId: string;
  email: string;
};

export async function createAdminSession(payload: AdminSessionPayload) {
  // Durée alignée sur les sessions concurrent/Mon Espace : reste active
  // tant que l'organisateur ne se déconnecte pas explicitement, pratique
  // sur plusieurs jours de préparation/course sans avoir à se reconnecter.
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secretKey());

  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
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

// --- Session "espace concurrent" (persistante, multi-courses) -------------
// Contrairement à la session participant ci-dessus (liée à UNE course,
// posée après un scan), cette session sert à un espace où le concurrent
// consulte l'historique de toutes ses courses et peut en rejoindre de
// nouvelles. Identification par téléphone seul, sans code de vérification.

export type AthleteSessionPayload = {
  phoneNormalized: string;
  firstName?: string;
  lastName?: string;
};

export async function createAthleteSession(payload: AthleteSessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("180d")
    .sign(secretKey());

  cookies().set(ATHLETE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
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
