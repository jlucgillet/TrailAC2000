import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { TrombinoscopeView } from "./TrombinoscopeView";

export const dynamic = "force-dynamic";

export default async function TrombinoscopePage() {
  const session = await getAthleteSession();
  if (!session) redirect("/mon-espace/login");
  return <TrombinoscopeView />;
}
