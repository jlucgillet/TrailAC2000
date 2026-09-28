export type RunLike = {
  id: string;
  attemptNumber: number;
  status: string;
  durationMs: bigint | null;
  startTimestamp: Date | null;
  finishTimestamp: Date | null;
};

/**
 * Choisit le run à afficher pour un concurrent dans un classement :
 *  - son MEILLEUR essai terminé (temps le plus court), s'il en a au moins un ;
 *  - sinon, son dernier essai (en course, inscrit, abandonné...) pour
 *    pouvoir afficher son statut.
 *
 * Une course pouvant être courue plusieurs fois, ce n'est pas le dernier
 * essai qui compte dans les résultats, mais le meilleur.
 */
export function pickDisplayRun<T extends RunLike>(runs: T[]): T | null {
  if (runs.length === 0) return null;

  const finished = runs.filter((r) => r.status === "finished" && r.durationMs !== null);
  if (finished.length > 0) {
    return finished.reduce((best, r) => (r.durationMs! < best.durationMs! ? r : best));
  }

  return runs.reduce((latest, r) => (r.attemptNumber > latest.attemptNumber ? r : latest));
}
