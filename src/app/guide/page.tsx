import Link from "next/link";

export default function GuideIndexPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-2 font-display text-4xl font-semibold">Guides</h1>
      <p className="mb-10 text-muted">Tout ce qu&rsquo;il faut savoir pour utiliser Trail AC2000.</p>

      <div className="flex flex-col gap-4">
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
      </div>
    </div>
  );
}
