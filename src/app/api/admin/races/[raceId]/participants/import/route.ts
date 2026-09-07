import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { normalizePhone } from "@/lib/phone";

/**
 * Import CSV. Colonnes attendues (en-tête requis) :
 * telephone,prenom,nom,dossard,categorie
 * (email et club/équipe optionnels : "email", "club")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { raceId: string } }
) {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const race = await prisma.race.findFirst({
    where: { id: params.raceId, adminId: session.adminId },
  });
  if (!race) return NextResponse.json({ error: "Course introuvable." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier CSV manquant." }, { status: 400 });
  }

  const text = await file.text();
  const parsedCsv = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsedCsv.errors.length > 0) {
    return NextResponse.json(
      { error: "Erreur de lecture du CSV.", details: parsedCsv.errors },
      { status: 400 }
    );
  }

  const results: { line: number; status: "ok" | "error"; message?: string }[] = [];

  for (let i = 0; i < parsedCsv.data.length; i++) {
    const row = parsedCsv.data[i];
    const rawPhone = row.telephone ?? row.phone ?? "";
    const normalized = normalizePhone(rawPhone);

    if (!normalized.ok) {
      results.push({ line: i + 2, status: "error", message: normalized.error });
      continue;
    }

    try {
      await prisma.participant.upsert({
        where: {
          raceId_phoneNormalized: { raceId: race.id, phoneNormalized: normalized.value },
        },
        update: {
          firstName: row.prenom || row.firstName || undefined,
          lastName: row.nom || row.lastName || undefined,
          bibNumber: row.dossard || row.bibNumber || undefined,
          category: row.categorie || row.category || undefined,
          team: row.club || row.team || undefined,
        },
        create: {
          raceId: race.id,
          phoneNormalized: normalized.value,
          firstName: row.prenom || row.firstName || undefined,
          lastName: row.nom || row.lastName || undefined,
          bibNumber: row.dossard || row.bibNumber || undefined,
          category: row.categorie || row.category || undefined,
          team: row.club || row.team || undefined,
        },
      });
      results.push({ line: i + 2, status: "ok" });
    } catch (err) {
      results.push({ line: i + 2, status: "error", message: "Erreur d'enregistrement." });
    }
  }

  const okCount = results.filter((r) => r.status === "ok").length;
  return NextResponse.json({
    imported: okCount,
    total: parsedCsv.data.length,
    results: results.filter((r) => r.status === "error"),
  });
}
