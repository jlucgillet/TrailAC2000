import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { parseCsv, extractMemberRows, validateMemberRow } from "@/lib/membersCsv";

export const maxDuration = 60;

/**
 * Import CSV : prénom ; nom ; téléphone (une ligne d'en-tête est reconnue).
 * Les membres déjà présents (même téléphone) sont mis à jour, les nouveaux sont
 * créés. Personne n'est supprimé.
 */
export async function POST(request: NextRequest) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const body = await request.json().catch(() => null);
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) return NextResponse.json({ error: "Fichier vide." }, { status: 400 });
  if (csv.length > 2_000_000) return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 413 });

  const rows = extractMemberRows(parseCsv(csv));
  if (rows.length === 0) return NextResponse.json({ error: "Aucune ligne trouvée." }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: "Maximum 5000 lignes." }, { status: 400 });

  const errors: { line: number; message: string }[] = [];
  const byPhone = new Map<string, { firstName: string; lastName: string }>();
  for (const r of rows) {
    const v = validateMemberRow(r);
    if (!v.ok) {
      errors.push({ line: r.line, message: v.error });
      continue;
    }
    byPhone.set(v.phoneNormalized, { firstName: v.firstName, lastName: v.lastName }); // la dernière ligne l'emporte
  }

  const existing = await prisma.member.findMany({
    where: { phoneNormalized: { in: Array.from(byPhone.keys()) } },
  });
  const existingBy = new Map(existing.map((m) => [m.phoneNormalized, m]));

  const toCreate: { phoneNormalized: string; firstName: string; lastName: string }[] = [];
  const toUpdate: { id: string; firstName: string; lastName: string }[] = [];
  let unchanged = 0;
  byPhone.forEach((v, phone) => {
    const cur = existingBy.get(phone);
    if (!cur) toCreate.push({ phoneNormalized: phone, ...v });
    else if (cur.firstName !== v.firstName || cur.lastName !== v.lastName) toUpdate.push({ id: cur.id, ...v });
    else unchanged++;
  });

  if (toCreate.length) await prisma.member.createMany({ data: toCreate, skipDuplicates: true });
  for (const u of toUpdate) {
    await prisma.member.update({ where: { id: u.id }, data: { firstName: u.firstName, lastName: u.lastName } });
  }

  return NextResponse.json({
    created: toCreate.length,
    updated: toUpdate.length,
    unchanged,
    errors: errors.slice(0, 50),
    errorCount: errors.length,
  });
}
