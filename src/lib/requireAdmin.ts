import { NextResponse } from "next/server";
import { getAdminSession } from "./session";

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    return { session: null, response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }) };
  }
  return { session, response: null };
}
