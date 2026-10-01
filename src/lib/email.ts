/**
 * Envoi d'email via l'API REST Resend (pas de SDK, un simple fetch).
 * Nécessite RESEND_API_KEY et RESEND_FROM_EMAIL (voir
 * SCHEMA-A-AJOUTER.txt) — et un domaine vérifié dans Resend pour pouvoir
 * notifier des adresses autres que celle du compte Resend lui-même.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Configuration email manquante : RESEND_API_KEY ou RESEND_FROM_EMAIL non définis.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Échec de l'envoi email (HTTP ${res.status}) : ${body.slice(0, 300)}`);
  }
}
