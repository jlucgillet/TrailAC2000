import { parsePhoneNumberFromString } from "libphonenumber-js";

/**
 * Normalise un numéro de téléphone saisi sous des formats variés
 * ("06 12 34 56 78", "+33 6 12 34 56 78", "0033612345678"...)
 * vers le format E.164 (+33612345678), afin d'éviter les doublons
 * de participants liés à des formats différents du même numéro.
 *
 * Par défaut, les numéros sans indicatif sont considérés français (FR).
 * Adapter defaultCountry si l'événement est international.
 */
export function normalizePhone(
  raw: string,
  defaultCountry: "FR" = "FR"
): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { ok: false, error: "Le numéro de téléphone est requis." };
  }

  const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);

  if (!parsed || !parsed.isValid()) {
    return {
      ok: false,
      error: "Ce numéro de téléphone ne semble pas valide.",
    };
  }

  return { ok: true, value: parsed.number }; // ex: "+33612345678"
}
