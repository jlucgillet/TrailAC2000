import { normalizePhone } from "@/lib/phone";

/** Découpe un CSV (séparateur « ; », « , » ou tabulation détecté automatiquement, guillemets gérés). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts: [string, number][] = [
    [";", (firstLine.match(/;/g) ?? []).length],
    [",", (firstLine.match(/,/g) ?? []).length],
    ["\t", (firstLine.match(/\t/g) ?? []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  const delim = counts[0][1] > 0 ? counts[0][0] : ";";

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') {
      quoted = true;
    } else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

const clean = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export type MemberRow = { line: number; firstName: string; lastName: string; phone: string };

/**
 * Repère les colonnes prénom / nom / téléphone grâce à la ligne d'en-tête si elle existe ;
 * sinon, ordre attendu : prénom ; nom ; téléphone.
 */
export function extractMemberRows(rows: string[][]): MemberRow[] {
  if (rows.length === 0) return [];
  const looksLikePhone = (v: string) => v.replace(/\D/g, "").length >= 6;
  const hasHeader = !rows[0].some(looksLikePhone);

  let iFirst = 0;
  let iLast = 1;
  let iPhone = 2;
  if (hasHeader) {
    const h = rows[0].map(clean);
    const find = (pred: (s: string) => boolean) => h.findIndex(pred);
    const f = find((s) => s.includes("prenom") || s.startsWith("first") || s === "given name");
    const p = find((s) => /tel|phone|mobile|portable|gsm/.test(s));
    const l = find((s, ) => (s === "nom" || s.includes("nom de famille") || s.startsWith("last") || s === "name" || s === "family name") && !s.includes("prenom"));
    if (f >= 0) iFirst = f;
    if (l >= 0) iLast = l;
    if (p >= 0) iPhone = p;
  }
  return rows.slice(hasHeader ? 1 : 0).map((r, idx) => ({
    line: idx + 1 + (hasHeader ? 1 : 0),
    firstName: (r[iFirst] ?? "").trim(),
    lastName: (r[iLast] ?? "").trim(),
    phone: (r[iPhone] ?? "").trim(),
  }));
}

export function validateMemberRow(r: MemberRow):
  | { ok: true; firstName: string; lastName: string; phoneNormalized: string }
  | { ok: false; error: string } {
  const phone = normalizePhone(r.phone);
  if (!phone.ok) return { ok: false, error: phone.error };
  if (!r.firstName && !r.lastName) return { ok: false, error: "Prénom et nom manquants." };
  return { ok: true, firstName: r.firstName, lastName: r.lastName, phoneNormalized: phone.value };
}

/** Échappe une valeur pour un CSV à séparateur « ; ». */
export function csvCell(v: string): string {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
