import { prisma } from "./db";

/**
 * Détermine si un numéro de téléphone peut rejoindre une course :
 *  - toujours autorisé s'il est déjà sur la liste des concurrents
 *    (ajouté manuellement, importé en CSV, copié depuis une autre course...)
 *  - sinon, autorisé uniquement si la course a l'inscription libre activée
 *    (réglage "openRegistration", activé par défaut).
 */
export async function canRegisterForRace(
  raceId: string,
  phoneNormalized: string,
  openRegistration: boolean
): Promise<{ allowed: true } | { allowed: false; error: string }> {
  if (openRegistration) return { allowed: true };

  const existing = await prisma.participant.findUnique({
    where: { raceId_phoneNormalized: { raceId, phoneNormalized } },
  });

  if (existing) return { allowed: true };

  return {
    allowed: false,
    error:
      "Cette course est réservée aux concurrents déjà inscrits. Contactez l'organisateur pour vous inscrire.",
  };
}
