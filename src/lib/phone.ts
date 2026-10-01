export type NormalizePhoneResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normalise un numéro de téléphone français vers la forme canonique
 * international "+33XXXXXXXXX" (sans espace) — c'est le format déjà
 * utilisé par TOUTES les fiches concurrent existantes en base, quelle que
 * soit la façon dont le numéro a été saisi (0X, +33, 0033, avec
 * espaces/points/tirets...).
 *
 * Important pour l'intégrité des données : la même personne doit TOUJOURS
 * normaliser vers exactement la même valeur, sinon deux saisies
 * différentes du même numéro créeraient deux fiches concurrent distinctes
 * pour la même personne (elle n'apparaîtrait pas dans tous ses résultats,
 * ou apparaîtrait deux fois dans un classement).
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

  // 06 12 34 56 78  →  +33612345678
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "+33" + cleaned.slice(1);
  } else if (/^33\d{9}$/.test(cleaned)) {
    // 33612345678 (sans le +, 11 chiffres) → +33612345678
    cleaned = "+" + cleaned;
  }

  if (!/^\+33[1-9]\d{8}$/.test(cleaned)) {
    return {
      ok: false,
      error: "Numéro de téléphone invalide (format français attendu, ex. 06 12 34 56 78).",
    };
  }

  return { ok: true, value: cleaned };
}
