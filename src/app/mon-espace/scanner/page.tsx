import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { AnyScanner } from "./AnyScanner";

export default async function AthleteAnyScanPage() {
  const session = await getAthleteSession();
  if (!session) {
    redirect("/mon-espace/login");
  }

  return <AnyScanner />;
}
