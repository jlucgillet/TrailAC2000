export type NormalizePhoneResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normalise un numéro de téléphone français vers une forme canonique
 * unique "0X XXXXXXXX" (10 chiffres, sans espace) — quelle que soit la
 * façon dont il a été saisi (+33, 0033, avec espaces/points/tirets...).
 *
 * Important pour l'intégrité des données : la même personne doit TOUJOURS
 * normaliser vers exactement la même valeur, sinon deux saisies
 * différentes du même numéro créeraient deux fiches concurrent distinctes
 * pour la même personne (elle apparaîtrait deux fois dans les classements).
 */
export function normalizePhone(raw: string): NormalizePhoneResult {
  if (!raw || !raw.trim()) {
    return { ok: false, error: "Numéro de téléphone requis." };
  }

  // Supprime tout ce qui n'est pas un chiffre ou un "+" (espaces, points,
  // tirets, parenthèses...).
  let cleaned = raw.trim().replace(/[^\d+]/g, "");

  // Préfixe international "00" → "+"
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  // +33 6 12 34 56 78  →  06 12 34 56 78
  if (cleaned.startsWith("+33")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("33") && cleaned.length === 11) {
    cleaned = "0" + cleaned.slice(2);
  }

  if (!/^0[1-9]\d{8}$/.test(cleaned)) {
    return {
      ok: false,
      error: "Numéro de téléphone invalide (format français attendu, ex. 06 12 34 56 78).",
    };
  }

  return { ok: true, value: cleaned };
}
