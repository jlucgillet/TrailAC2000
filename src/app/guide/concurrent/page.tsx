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
        pour retrouver l&rsquo;historique de toutes tes courses. Tu peux aussi consulter les{" "}
        <a href="#parcours" className="text-accent underline">parcours</a> et les suivre en direct
        avec le GPS de ton téléphone.
      </p>

      {/* Méthode 1 */}
      <section className="mb-16">
        <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Méthode 1 — la plus simple
        </span>
        <h2 className="mb-1 font-display text-2xl font-semibold">Scanner directement, sans connexion</h2>
        <p className="mb-8 text-muted">Idéal le jour de la course : pas besoin de créer de compte.</p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
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
                <b className="text-ink">La première fois seulement</b> : le navigateur s&rsquo;ouvre,
                saisis ton numéro (nom obligatoire pour un nouveau concurrent), puis « Continuer ».
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
                Le <b className="text-ink">scanner s&rsquo;ouvre automatiquement</b> dans la page.
                Vise à nouveau le QR code DÉPART — c&rsquo;est <b className="text-ink">ce scan-ci</b>{" "}
                qui compte, pas le premier.
              </>
            }
          >
            <p className="mb-2 text-center text-[10px] text-muted">Vise le QR code DÉPART</p>
            <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-border p-3 text-center text-[10px] text-muted">
              Caméra active
            </div>
          </GuideStep>

          <GuideStep
            number={4}
            caption={
              <>
                Le <b className="text-ink">chronomètre démarre</b>. Cours ! Le temps est calculé par
                le serveur, pas par ton téléphone.
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
            number={5}
            caption={
              <>
                Scanne le QR code <b className="text-ink">ARRIVÉE</b> en franchissant la ligne (caméra
                native ou scanner intégré) : ton temps s&rsquo;affiche instantanément.
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
              Me connecter
            </div>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Tu vois <b className="text-ink">toutes tes courses</b> et tes meilleurs temps. Le menu
                te donne accès à <b className="text-ink">Courses, Parcours, Guide</b> et Déconnexion.
              </>
            }
          >
            <p className="mb-2 text-left text-sm font-medium">Bonjour Camille</p>
            <div className="mb-3 rounded-lg bg-accent px-2 py-1.5 text-center text-[10px] font-bold text-bg">
              Scanner
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <p className="text-[10px] font-semibold">Montée de Tallenay</p>
              <p className="text-[9px] text-muted">20/09 · Meilleur temps 00:47:32</p>
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

      {/* Parcours */}
      <section id="parcours" className="mt-16 scroll-mt-8">
        <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Parcours
        </span>
        <h2 className="mb-1 font-display text-2xl font-semibold">
          Consulter et suivre un parcours avec le GPS
        </h2>
        <p className="mb-8 text-muted">
          La section &laquo;&nbsp;Parcours&nbsp;&raquo; de Mon Espace te permet de repérer un tracé
          avant de partir, puis de te laisser guider en direct par le GPS de ton téléphone.
        </p>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <GuideStep
            number={1}
            caption={
              <>
                Dans Mon Espace, ouvre le menu (☰ sur mobile) puis{" "}
                <b className="text-ink">« Parcours »</b>. Les parcours sont classés du plus court au
                plus long.
              </>
            }
          >
            <p className="mb-2 text-center font-display text-sm font-semibold">Parcours</p>
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
              <div className="h-8 w-8 shrink-0 rounded-md border border-border bg-bg" />
              <div>
                <p className="text-[10px] font-semibold">AC2000-5-120</p>
                <p className="text-[9px] text-muted">5 km · 120 m D+</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-2">
              <div className="h-8 w-8 shrink-0 rounded-md border border-border bg-bg" />
              <div>
                <p className="text-[10px] font-semibold">AC2000-7-167</p>
                <p className="text-[9px] text-muted">7 km · 167 m D+</p>
              </div>
            </div>
          </GuideStep>

          <GuideStep
            number={2}
            caption={
              <>
                Choisis un parcours : carte, distance et dénivelé. Le tracé est{" "}
                <b className="text-ink">rouge en montée, vert en descente</b>, avec des pastilles
                tous les kilomètres. Tu peux changer le fond de carte, passer en plein écran ou
                télécharger le GPX.
              </>
            }
          >
            <div className="mb-2 flex flex-1 items-center justify-center rounded-lg border border-border bg-bg p-2">
              <div className="h-1.5 w-full rounded-full bg-gradient-to-r from-[#DC2626] via-[#9CA3AF] to-[#16A34A]" />
            </div>
            <div className="grid grid-cols-2 gap-1 text-center text-[9px] text-muted">
              <div className="rounded-md border border-border bg-surface py-1">7,1 km</div>
              <div className="rounded-md border border-border bg-surface py-1">167 m D+</div>
            </div>
          </GuideStep>

          <GuideStep
            number={3}
            caption={
              <>
                Sur place, appuie sur <b className="text-ink">« Démarrer »</b> en haut à droite de la
                carte et <b className="text-ink">autorise la localisation</b>. Ta position (flèche
                bleue) apparaît sur le tracé, qui passe en rouge uni, avec tes kilomètres parcourus
                et restants.
              </>
            }
          >
            <div className="mb-3 self-end rounded-full bg-white px-3 py-1 text-[10px] font-bold text-[#15803D] shadow">
              Démarrer
            </div>
            <div className="rounded-lg border border-border bg-surface p-2">
              <div className="flex justify-between text-[9px] text-muted">
                <span>Parcouru</span>
                <span>Restant</span>
              </div>
              <div className="flex justify-between font-display text-sm font-semibold tabular-nums">
                <span>2,40 km</span>
                <span>4,70 km</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-bg">
                <div className="h-full w-1/3 bg-accent" />
              </div>
            </div>
          </GuideStep>

          <GuideStep
            number={4}
            caption={
              <>
                La <b className="text-ink">boussole</b> fait passer la carte du{" "}
                <b className="text-ink">nord en haut</b> à ta <b className="text-ink">direction en
                haut</b>. Si tu déplaces la carte, appuie sur{" "}
                <b className="text-ink">« Recentrer »</b> pour revenir sur toi.
              </>
            }
          >
            <div className="mb-3 flex items-center justify-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow">
                <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden>
                  <path d="M20 5 L27 20 L13 20 Z" fill="#E5484D" />
                  <path d="M20 35 L27 20 L13 20 Z" fill="#9CA3AF" />
                  <circle cx="20" cy="20" r="2.4" fill="#fff" stroke="#6B7280" strokeWidth="1" />
                </svg>
              </div>
            </div>
            <div className="mx-auto rounded-full bg-accent px-3 py-1 text-[10px] font-bold text-bg">
              Recentrer
            </div>
          </GuideStep>

          <GuideStep
            number={5}
            caption={
              <>
                Si tu t&rsquo;éloignes de <b className="text-ink">plus de 30&nbsp;m</b> du tracé, ton
                téléphone <b className="text-ink">bipe, vibre</b> et affiche une notification. Une seule
                alerte par sortie ; un bip grave te confirme que tu es revenu sur le tracé.
              </>
            }
          >
            <div className="flex flex-1 flex-col items-center justify-center gap-2">
              <p className="rounded-lg bg-[#DC2626] px-2 py-1.5 text-center text-[10px] font-semibold text-white">
                ⚠️ Tu es à 42 m du tracé !
              </p>
              <p className="text-center text-[9px] text-muted">🔔 Alerte activée</p>
            </div>
          </GuideStep>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🌤️ Pense à sortir pour avoir du signal</p>
            <p className="text-sm text-muted">
              Au début, le GPS peut être imprécis : le message &laquo;&nbsp;Signal GPS encore
              imprécis&nbsp;&raquo; s&rsquo;affiche. Patiente quelques secondes, en extérieur, le temps
              que la précision s&rsquo;améliore.
            </p>
          </div>
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
            <p className="mb-1 font-medium">📱 Écran allumé, appli ouverte</p>
            <p className="text-sm text-muted">
              Le suivi GPS ne fonctionne que{" "}
              <b className="text-ink">tant que l&rsquo;appli reste ouverte au premier plan</b>. Si tu
              la quittes ou verrouilles ton téléphone, le suivi et les alertes s&rsquo;arrêtent. Pense à
              avoir assez de batterie.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🍎 Sur iPhone</p>
            <p className="text-sm text-muted">
              Safari ne permet pas de faire vibrer le téléphone : tu as les bips et la notification.
              Les notifications demandent d&rsquo;avoir installé l&rsquo;app sur l&rsquo;écran
              d&rsquo;accueil (voir le guide d&rsquo;installation).
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🔕 Couper l&rsquo;alerte</p>
            <p className="text-sm text-muted">
              En groupe, tu peux couper le son et la vibration avec le bouton{" "}
              &laquo;&nbsp;Alerte activée&nbsp;&raquo; du panneau. Le message rouge reste affiché.
            </p>
          </div>
        </div>
      </section>

      {/* Astuces */}
      <section className="mt-16">
        <h2 className="mb-5 font-display text-2xl font-semibold">Bon à savoir</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
            <p className="mb-1 font-medium">🔐 Connexion mémorisée</p>
            <p className="text-sm text-muted">
              Une fois identifié (au premier scan DÉPART, en deux temps), tu n&rsquo;as{" "}
              <b className="text-ink">plus besoin de ressaisir ton numéro</b> ensuite — la connexion
              reste active très longtemps, jusqu&rsquo;à ce que tu te déconnectes toi-même.
            </p>
          </div>
          <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
            <p className="mb-1 font-medium">✈️ Tu peux fermer l&rsquo;app</p>
            <p className="text-sm text-muted">
              Après un scan, ton temps est déjà enregistré sur le serveur. Tu peux{" "}
              <b className="text-ink">quitter l&rsquo;app, éteindre l&rsquo;écran, ou même éteindre ton
              téléphone</b> — ça ne change rien au résultat, tant que tu l&rsquo;as rallumé avant le
              prochain scan.
            </p>
          </div>
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
              pas toi ? Changer de concurrent&nbsp;&raquo; avant le scan suivant.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🔌 Pas de réseau ?</p>
            <p className="text-sm text-muted">
              Le temps officiel vient du serveur : une connexion internet est nécessaire{" "}
              <b className="text-ink">au moment du scan</b>. Vérifie ton réseau si le scan ne répond
              pas.
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
