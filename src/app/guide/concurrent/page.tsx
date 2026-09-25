import Link from "next/link";
import { GuideStep } from "@/components/PhoneMockup";

export default function ConcurrentGuidePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/guide" className="text-sm text-muted underline">
        ← Tous les guides
      </Link>

      <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-accent">Guide concurrent</p>
      <h1 className="mb-3 font-display text-4xl font-semibold">Comment utiliser Trail AC2000</h1>
      <p className="mb-14 max-w-xl text-muted">
        Deux façons de chronométrer ta course : en scannant simplement les QR codes sur place
        (aucune connexion nécessaire), ou via ton espace personnel &laquo;&nbsp;Mon Espace&nbsp;&raquo;
        pour retrouver l&rsquo;historique de toutes tes courses.
      </p>

      {/* Méthode 1 */}
      <section className="mb-16">
        <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Méthode 1 — la plus simple
        </span>
        <h2 className="mb-1 font-display text-2xl font-semibold">Scanner directement, sans connexion</h2>
        <p className="mb-8 text-muted">Idéal le jour de la course : pas besoin de créer de compte.</p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <GuideStep
            number={1}
            caption={
              <>
                Sur place, ouvre l&rsquo;<b className="text-ink">appareil photo</b> de ton téléphone et
                vise le QR code <b className="text-ink">DÉPART</b> affiché sur le panneau.
              </>
            }
          >
            <p className="mb-3 text-center text-[10px] text-muted">Scannez le QR code DÉPART</p>
            <div className="mx-auto h-24 w-24 rounded-md border-4 border-ink bg-[repeating-conic-gradient(#F5F7F3_0%_25%,#0B1410_0%_50%)] bg-[length:14px_14px]" />
            <p className="mt-3 text-center text-[10px] text-muted">
              Utilise l&rsquo;appareil photo natif, comme pour n&rsquo;importe quel QR code.
            </p>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Le navigateur s&rsquo;ouvre automatiquement. Saisis <b className="text-ink">ton numéro
                de téléphone</b> (nom facultatif), puis &laquo;&nbsp;Continuer&nbsp;&raquo;.
              </>
            }
          >
            <p className="mb-3 text-center font-display text-sm font-semibold">Montée de Tallenay</p>
            <p className="mb-1 text-[10px] text-muted">Ton numéro de téléphone</p>
            <div className="mb-3 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] text-muted">
              06 12 34 56 78
            </div>
            <div className="mt-auto rounded-lg bg-accent px-2 py-2 text-center text-[11px] font-bold text-bg">
              Continuer
            </div>
          </GuideStep>

          <GuideStep
            number={3}
            caption={
              <>
                Le <b className="text-ink">chronomètre démarre automatiquement</b>. Cours ! Le temps
                est calculé par le serveur, pas par ton téléphone.
              </>
            }
          >
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="mb-3 rounded-full bg-amber/15 px-2 py-1 text-[10px] font-bold text-amber">
                COURSE EN COURS
              </span>
              <p className="chrono-digits text-3xl font-bold text-accent">00:24:18</p>
              <p className="mt-3 text-center text-[10px] text-muted">
                À l&rsquo;arrivée, scanne le QR code ARRIVÉE.
              </p>
            </div>
          </GuideStep>

          <GuideStep
            number={4}
            caption={
              <>
                Scanne le QR code <b className="text-ink">ARRIVÉE</b> en franchissant la ligne : ton
                temps s&rsquo;affiche instantanément.
              </>
            }
          >
            <div className="flex flex-1 flex-col items-center justify-center">
              <span className="mb-3 rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent">
                COURSE TERMINÉE
              </span>
              <p className="text-[10px] text-muted">Ton temps</p>
              <p className="chrono-digits text-3xl font-bold">00:47:32</p>
              <p className="mt-2 font-display text-base text-accent">Bravo !</p>
            </div>
          </GuideStep>
        </div>
      </section>

      {/* Méthode 2 */}
      <section>
        <span className="mb-2 inline-block rounded-full bg-amber/15 px-3 py-1 text-xs font-semibold text-amber">
          Méthode 2 — avec un compte
        </span>
        <h2 className="mb-1 font-display text-2xl font-semibold">Via &laquo;&nbsp;Mon Espace&nbsp;&raquo;</h2>
        <p className="mb-8 text-muted">
          Pratique si tu participes à plusieurs courses, ou veux suivre ta progression dans le temps.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <GuideStep
            number={1}
            caption={
              <>
                Va sur la page d&rsquo;accueil du site → <b className="text-ink">« Espace concurrent »</b>{" "}
                → saisis ton téléphone.
              </>
            }
          >
            <p className="mb-3 text-center font-display text-sm font-semibold">Mes courses</p>
            <p className="mb-1 text-[10px] text-muted">Ton numéro de téléphone</p>
            <div className="mb-3 rounded-lg border border-border bg-surface px-2 py-1.5 text-[10px] text-muted">
              06 12 34 56 78
            </div>
            <div className="mt-auto rounded-lg bg-accent px-2 py-2 text-center text-[10px] font-bold text-bg">
              Accéder à mes courses
            </div>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Tu vois <b className="text-ink">toutes tes courses</b>, tes meilleurs temps, et peux
                rejoindre une nouvelle course active.
              </>
            }
          >
            <p className="mb-2 text-left text-sm font-medium">Bonjour, Camille</p>
            <div className="mb-3 rounded-lg bg-accent px-2 py-1.5 text-center text-[10px] font-bold text-bg">
              Scanner
            </div>
            <div className="mb-2 rounded-lg border border-border bg-surface p-2">
              <p className="text-[10px] font-semibold">Montée de Tallenay</p>
              <p className="text-[9px] text-muted">20/09 · Meilleur temps 00:47:32</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <p className="text-[10px] font-semibold">Rejoindre une course active</p>
              <p className="text-[9px] text-muted">Trail de Nuit — disponible</p>
            </div>
          </GuideStep>

          <GuideStep
            number={3}
            caption={
              <>
                Le bouton <b className="text-ink">« Scanner »</b> ouvre la caméra directement dans
                l&rsquo;app — reconnaît automatiquement la course et le point de contrôle.
              </>
            }
          >
            <p className="mb-2 text-center text-[10px] text-muted">Scanner</p>
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border p-3 text-center text-[10px] text-muted">
              Caméra active — vise un QR code DÉPART ou ARRIVÉE
            </div>
          </GuideStep>

          <GuideStep
            number={4}
            caption={
              <>
                Sur une course rejouable, retrouve <b className="text-ink">tous tes essais</b> avec
                date, heure et temps — comme un segment Strava.
              </>
            }
          >
            <p className="mb-3 text-center text-sm font-semibold">Montée de Tallenay</p>
            <div className="mb-2 rounded-lg border border-border bg-surface p-2">
              <p className="text-[10px] font-semibold">Essai 2 — 20/09 à 09:12</p>
              <p className="text-[9px] text-accent">00:44:02 · record</p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <p className="text-[10px] font-semibold">Essai 1 — 13/09 à 08:57</p>
              <p className="text-[9px] text-muted">00:47:32</p>
            </div>
          </GuideStep>
        </div>
      </section>

      {/* Astuces */}
      <section className="mt-16">
        <h2 className="mb-5 font-display text-2xl font-semibold">Bon à savoir</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">📷 Autoriser la caméra</p>
            <p className="text-sm text-muted">
              Au premier scan, ton navigateur demande l&rsquo;autorisation d&rsquo;utiliser la caméra —
              accepte pour que le chronométrage fonctionne.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">📱 Téléphone partagé</p>
            <p className="text-sm text-muted">
              Si plusieurs personnes utilisent le même téléphone, clique sur &laquo;&nbsp;Ce n&rsquo;est
              pas vous ? Changer de concurrent&nbsp;&raquo; avant le scan suivant.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🔌 Pas de réseau ?</p>
            <p className="text-sm text-muted">
              Le temps officiel vient du serveur : une connexion internet est nécessaire au moment du
              scan. Vérifie ton réseau si le scan ne répond pas.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🔁 Courses rejouables</p>
            <p className="text-sm text-muted">
              Tant qu&rsquo;une course est active, tu peux la recourir autant de fois que tu veux pour
              progresser — chaque essai est enregistré séparément.
            </p>
          </div>
        </div>
      </section>

      <p className="mt-10 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <b className="text-ink">Confidentialité :</b> ton numéro de téléphone n&rsquo;est jamais
        affiché publiquement. Les classements visibles par les autres n&rsquo;indiquent que ton
        prénom/nom (si renseigné) ou ton numéro de dossard.
      </p>
    </div>
  );
}
