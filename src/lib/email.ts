import nodemailer from "nodemailer";

/**
 * Envoi d'email via SMTP direct (boîte mail o2switch existante) — pas de
 * service tiers, pas de vérification de domaine nécessaire. Nécessite
 * SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL et
 * SMTP_FROM_NAME (voir SCHEMA-A-AJOUTER.txt).
 *
 * Le transporteur est mis en cache entre les appels (évite de rouvrir une
 * connexion SMTP à chaque email), mais reconstruit si besoin.
 */
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USERNAME;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error(
      "Configuration SMTP manquante : SMTP_HOST, SMTP_PORT, SMTP_USERNAME ou SMTP_PASSWORD non définis."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    // 465 = TLS implicite dès la connexion ; 587 (le cas courant, dont
    // o2switch) = connexion en clair puis bascule STARTTLS.
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || "Trail AC2000";

  if (!fromEmail) {
    throw new Error("Configuration SMTP manquante : SMTP_FROM_EMAIL non défini.");
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: { name: fromName, address: fromEmail },
    to,
    subject,
    text,
  });
}
