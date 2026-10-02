import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { ParcoursList } from "./ParcoursList";

export default async function ParcoursPage() {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  return <ParcoursList />;
}
