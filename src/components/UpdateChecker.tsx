import { UpdateBanner } from "./UpdateBanner";

/**
 * Composant serveur : inscrit dans la page l'identifiant de la version qui l'a
 * générée. Si la page vient d'un cache ancien, cet identifiant est périmé, et
 * le bandeau de mise à jour s'affiche.
 */
export function UpdateChecker() {
  return <UpdateBanner currentVersion={process.env.VERCEL_GIT_COMMIT_SHA ?? "dev"} />;
}
