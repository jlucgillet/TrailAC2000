/** Signale (sans bloquer) le démarrage d'un suivi GPS, pour les statistiques admin. */
export type FollowKind = "athlete" | "shared" | "race";

function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem("ac2000_visitor");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("ac2000_visitor", id);
    }
    return id;
  } catch {
    return null;
  }
}

export function reportFollowStart(kind: FollowKind, id: string) {
  try {
    fetch("/api/track-follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, visitorId: getVisitorId() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* non bloquant */
  }
}
