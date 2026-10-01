import { prisma } from "./db";
import { sendEmail } from "./email";
import { formatDurationMs } from "./time";

/**
 * Prévient par email chaque administrateur ayant activé l'option, quand un
 * concurrent termine une course. Utilise l'adresse déjà enregistrée pour
 * son compte, pas de coordonnée supplémentaire à saisir. Ne lève jamais
 * d'exception : un échec d'envoi (configuration manquante, service
 * indisponible...) est journalisé mais ne doit jamais faire échouer le
 * scan d'arrivée lui-même.
 */
export async function notifyAdminsOfFinish(
  participantId: string,
  durationMs: number
): Promise<void> {
  try {
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: { race: true },
    });
    if (!participant) return;

    const admins = await prisma.admin.findMany({
      where: { emailNotificationsEnabled: true },
    });
    if (admins.length === 0) return;

    const name =
      [participant.firstName, participant.lastName].filter(Boolean).join(" ") ||
      (participant.bibNumber ? `Dossard ${participant.bibNumber}` : "Un concurrent");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const raceUrl = `${baseUrl}/admin/races/${participant.race.id}`;

    const subject = `Nouveau résultat — ${participant.race.name}`;
    const text = `${name} a terminé "${participant.race.name}" en ${formatDurationMs(
      durationMs
    )}.\n\nVoir la course : ${raceUrl}`;

    await Promise.all(
      admins.map((admin) =>
        sendEmail(admin.email, subject, text).catch((err) => {
          console.error(`[notifyAdminsOfFinish] échec envoi email à ${admin.email} :`, err);
        })
      )
    );
  } catch (err) {
    console.error("[notifyAdminsOfFinish] erreur inattendue :", err);
  }
}
