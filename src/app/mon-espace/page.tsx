import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { AthleteDashboard } from "./AthleteDashboard";

export default async function AthleteHomePage() {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  return <AthleteDashboard />;
}
