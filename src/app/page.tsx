import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <Logo size={80} />
        </div>

        <h1 className="mb-2 font-display text-4xl font-semibold">Trail AC2000</h1>
        <p className="mb-12 text-muted">Chronométrage de course par QR code</p>

        <div className="flex flex-col gap-4">
          <Link
            href="/mon-espace/login"
            className="group flex items-center justify-between rounded-2xl border border-accent bg-accent/10 px-6 py-5 text-left transition-colors hover:bg-accent/15"
          >
            <span>
              <span className="block font-display text-xl font-semibold text-ink">
                Espace concurrent
              </span>
              <span className="block text-sm text-muted">
                Vos courses, vos temps, rejoindre une course active
              </span>
            </span>
            <span className="text-2xl text-accent transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>

          <Link
            href="/admin/login"
            className="group flex items-center justify-between rounded-2xl border border-border bg-surface px-6 py-5 text-left transition-colors hover:border-muted"
          >
            <span>
              <span className="block font-display text-xl font-semibold text-ink">
                Espace organisateur
              </span>
              <span className="block text-sm text-muted">
                Créer une course, QR codes, résultats
              </span>
            </span>
            <span className="text-2xl text-muted transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        <p className="mt-12 text-xs text-muted">
          Concurrent le jour d&rsquo;une course ? Scannez simplement le QR code DÉPART affiché sur place.
        </p>
      </div>
    </div>
  );
}
