"use client";

import { useRouter } from "next/navigation";

export function AthleteLogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/athlete/logout", { method: "POST" });
        router.push("/mon-espace/login");
        router.refresh();
      }}
      className="text-sm text-muted underline hover:text-ink"
    >
      Déconnexion
    </button>
  );
}
