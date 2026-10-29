import { redirect } from "next/navigation";
import { getAthleteSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProfilePhoto } from "./ProfilePhoto";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const session = await getAthleteSession();
  if (!session) redirect("/mon-espace/login");

  const photo = await prisma.athletePhoto.findUnique({
    where: { phoneNormalized: session.phoneNormalized },
    select: { id: true, shared: true },
  });
  const name = [session.firstName, session.lastName].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Mon profil</h1>
      <ProfilePhoto name={name} initialPhoto={photo} />
    </div>
  );
}
