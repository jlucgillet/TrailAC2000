import Link from "next/link";
import { GuideStep } from "@/components/PhoneMockup";

export default function InstallationGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/guide" className="text-sm text-muted underline">
        ← Tous les guides
      </Link>

      <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-accent">Guide concurrent</p>
      <h1 className="mb-3 font-display text-4xl font-semibold">Installer l&rsquo;app sur ton téléphone</h1>
      <p className="mb-14 max-w-xl text-muted">
        Trail AC2000 s&rsquo;installe directement depuis le site, sans passer par un store
        d&rsquo;applications. Une fois installée, une icône apparaît sur ton écran d&rsquo;accueil et
        l&rsquo;app s&rsquo;ouvre en plein écran, sans barre d&rsquo;adresse.
      </p>

      {/* Android */}
      <section className="mb-16">
        <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Android — Chrome
        </span>
        <h2 className="mb-8 font-display text-2xl font-semibold">Installer depuis Chrome</h2>

        <div className="grid gap-8 sm:grid-cols-3">
          <GuideStep
            number={1}
            caption={
              <>
                Ouvre <b className="text-ink">trail-ac2000.vercel.app</b> dans Chrome, puis touche le
                menu <b className="text-ink">⋮</b> en haut à droite.
              </>
            }
          >
            <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-surface px-2 py-1.5 text-[9px] text-muted">
              <span>🔒 trail-ac2000.vercel.app</span>
              <span className="rounded bg-accent/20 px-1 font-bold text-accent">⋮</span>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-surface p-2 text-[9px] text-muted">
              <p className="mb-1">Nouvel onglet</p>
              <p className="mb-1">Historique</p>
              <p className="mb-1">Favoris</p>
            </div>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Touche <b className="text-ink">« Installer l&rsquo;application »</b> (ou &laquo;&nbsp;Ajouter
                à l&rsquo;écran d&rsquo;accueil&nbsp;&raquo; selon la version de Chrome).
              </>
            }
          >
            <div className="flex-1 rounded-lg border border-border bg-surface p-2 text-[9px] text-muted">
              <p className="mb-1">Nouvel onglet</p>
              <p className="mb-2">Historique</p>
              <p className="rounded bg-accent/15 px-1.5 py-1 font-semibold text-accent">
                📲 Installer l&rsquo;application
              </p>
              <p className="mt-2">Partager…</p>
            </div>
          </GuideStep>

          <GuideStep
            number={3}
            caption={
              <>
                Confirme avec <b className="text-ink">« Installer »</b> dans la fenêtre qui
                s&rsquo;affiche. L&rsquo;icône apparaît sur ton écran d&rsquo;accueil.
              </>
            }
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent bg-bg font-display text-lg font-bold text-accent">
                AC
              </div>
              <p className="text-[10px] text-muted">Trail AC2000</p>
            </div>
          </GuideStep>
        </div>
      </section>

      {/* iPhone */}
      <section>
        <span className="mb-2 inline-block rounded-full bg-amber/15 px-3 py-1 text-xs font-semibold text-amber">
          iPhone — Safari
        </span>
        <h2 className="mb-8 font-display text-2xl font-semibold">Installer depuis Safari</h2>
        <p className="mb-6 max-w-xl text-sm text-muted">
          Sur iPhone, l&rsquo;installation ne fonctionne que depuis <b className="text-ink">Safari</b>{" "}
          (pas Chrome, ni une autre app comme Instagram ou WhatsApp).
        </p>

        <div className="grid gap-8 sm:grid-cols-3">
          <GuideStep
            number={1}
            caption={
              <>
                Ouvre le site dans <b className="text-ink">Safari</b>, puis touche le bouton{" "}
                <b className="text-ink">Partager</b> (carré avec une flèche vers le haut), en bas de
                l&rsquo;écran.
              </>
            }
          >
            <div className="mb-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-[9px] text-muted">
              🔒 trail-ac2000.vercel.app
            </div>
            <div className="mt-auto flex justify-center gap-4 rounded-lg border-t border-border pt-2 text-[14px]">
              <span>‹</span>
              <span>›</span>
              <span className="rounded bg-accent/20 px-1.5 text-accent">⬆︎</span>
              <span>📑</span>
            </div>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Dans la liste qui s&rsquo;affiche, fais défiler et touche{" "}
                <b className="text-ink">« Sur l&rsquo;écran d&rsquo;accueil »</b>.
              </>
            }
          >
            <div className="flex-1 rounded-lg border border-border bg-surface p-2 text-[9px] text-muted">
              <p className="mb-1">Copier</p>
              <p className="mb-1">Ajouter aux favoris</p>
              <p className="rounded bg-accent/15 px-1.5 py-1 font-semibold text-accent">
                🏠 Sur l&rsquo;écran d&rsquo;accueil
              </p>
              <p className="mt-1">Marque-page…</p>
            </div>
          </GuideStep>

          <GuideStep
            number={3}
            caption={
              <>
                Touche <b className="text-ink">« Ajouter »</b> en haut à droite. L&rsquo;icône apparaît
                sur ton écran d&rsquo;accueil.
              </>
            }
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-accent bg-bg font-display text-lg font-bold text-accent">
                AC
              </div>
              <p className="text-[10px] text-muted">Trail AC2000</p>
            </div>
          </GuideStep>
        </div>
      </section>

      <p className="mt-16 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <b className="text-ink">Pas obligatoire :</b> l&rsquo;app fonctionne aussi normalement depuis
        le navigateur, sans installation. L&rsquo;installer est juste plus pratique : icône dédiée,
        ouverture instantanée, plein écran.
      </p>
    </div>
  );
}
