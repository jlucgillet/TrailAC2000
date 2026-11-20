import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { csvCell } from "@/lib/membersCsv";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, response } = await requireAdmin();
  if (!session) return response;

  const members = await prisma.member.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  const lines = ["Prénom;Nom;Téléphone"].concat(
    members.map((m) => [m.firstName, m.lastName, m.phoneNormalized].map(csvCell).join(";"))
  );
  // BOM pour qu'Excel ouvre correctement les accents.
  const csv = "﻿" + lines.join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="membres.csv"',
      "Cache-Control": "no-store",
    },
  });
}
