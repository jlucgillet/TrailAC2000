import Link from "next/link";

export default function GuideIndexPage({
  searchParams,
}: {
  searchParams?: { espace?: string };
}) {
  const espace = searchParams?.espace;
  const showConcurrent = espace !== "organisateur";
  const showOrganisateur = espace !== "concurrent";
  const back =
    espace === "organisateur"
      ? { href: "/admin/dashboard", label: "Retour à l\u2019administration", icon: "⚙️" }
      : espace === "concurrent"
        ? { href: "/mon-espace", label: "Retour à mon espace", icon: "🏁" }
        : { href: "/", label: "Retour à l\u2019accueil", icon: "🏠" };

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6">
        <Link
          href={back.href}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <span aria-hidden>{back.icon}</span> {back.label}
        </Link>
      </div>
      <h1 className="mb-2 font-display text-4xl font-semibold">
        {espace === "organisateur" ? "Guide gestionnaire" : espace === "concurrent" ? "Guide concurrent" : "Guides"}
      </h1>
      <p className="mb-10 text-muted">Tout ce qu&rsquo;il faut savoir pour utiliser Trail AC2000.</p>

      <div className="flex flex-col gap-4">
        {showConcurrent && (
          <>
        <Link
          href="/guide/concurrent"
          className="rounded-2xl border border-accent bg-accent/10 px-6 py-5 transition-colors hover:bg-accent/15"
        >
          <span className="block font-display text-xl font-semibold">Comment utiliser l&rsquo;app</span>
          <span className="block text-sm text-muted">Scanner sans connexion, ou via Mon Espace</span>
        </Link>

        <Link
          href="/guide/installation"
          className="rounded-2xl border border-border bg-surface px-6 py-5 transition-colors hover:border-muted"
        >
          <span className="block font-display text-xl font-semibold">Installer l&rsquo;app sur ton téléphone</span>
          <span className="block text-sm text-muted">Icône sur l&rsquo;écran d&rsquo;accueil, Android et iPhone</span>
        </Link>

          </>
        )}

        {showOrganisateur && (
        <Link
          href="/guide/organisateur"
          className="rounded-2xl border border-border bg-surface px-6 py-5 transition-colors hover:border-muted"
        >
          <span className="block font-display text-xl font-semibold">Guide gestionnaire</span>
          <span className="block text-sm text-muted">Courses, parcours, résultats, photos et statistiques</span>
        </Link>
        )}
      </div>
    </div>
  );
}
