import Link from "next/link";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <h2 className="mb-3 font-display text-2xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 text-muted [&_b]:text-ink [&_li]:mb-1 [&_ol]:ml-5 [&_ol]:list-decimal [&_ul]:ml-5 [&_ul]:list-disc">
        {children}
      </div>
    </section>
  );
}

export default function OrganisateurGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/guide" className="text-sm text-muted underline">
          ← Tous les guides
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          <span aria-hidden>🏠</span> Retour à l&rsquo;accueil
        </Link>
      </div>

      <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-accent">
        Guide gestionnaire
      </p>
      <h1 className="mb-3 font-display text-4xl font-semibold">Gérer les courses et les parcours</h1>
      <p className="mb-8 text-muted">
        Mémo rapide pour les administrateurs : préparer une course, la chronométrer, publier les
        résultats et suivre l&rsquo;usage des parcours.
      </p>

      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {[
          ["course", "Préparer une course"],
          ["jour-j", "Le jour de la course"],
          ["resultats", "Résultats"],
          ["parcours", "Parcours"],
          ["photos", "Photos"],
          ["stats", "Statistiques"],
          ["utilisateurs", "Utilisateurs"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-border bg-surface px-3 py-1 text-ink hover:border-accent"
          >
            {label}
          </a>
        ))}
      </nav>

      <Section id="course" title="1. Préparer une course">
        <ol>
          <li>
            Menu <b>Courses → + Nouvelle course</b>. La course est créée en{" "}
            <b>Brouillon</b> : elle n&rsquo;est pas visible et les scans sont refusés.
          </li>
          <li>
            Onglet <b>Réglages</b> : nom, date, lieu. Choisis si les résultats sont publics et si la
            course apparaît dans l&rsquo;espace concurrent.
          </li>
          <li>
            Onglet <b>Parcours</b> : importe le fichier GPX de la course (distance et dénivelé sont
            calculés automatiquement) ou reprends un parcours de la bibliothèque.
          </li>
          <li>
            Onglet <b>Concurrents</b> : ajoute les inscrits à la main, importe un CSV
            (<code>telephone,prenom,nom,dossard,categorie</code>) ou copie ceux d&rsquo;une autre
            course. Un concurrent est identifié par son numéro de téléphone.
          </li>
          <li>
            Onglet <b>QR codes</b> : imprime les QR codes <b>DÉPART</b> et <b>ARRIVÉE</b> et
            affiche-les sur place.
          </li>
        </ol>
      </Section>

      <Section id="jour-j" title="2. Le jour de la course">
        <ul>
          <li>
            Passe la course en <b>Active</b> (Réglages → Statut). Les scans sont alors acceptés.
          </li>
          <li>
            Les concurrents scannent DÉPART puis ARRIVÉE avec l&rsquo;appareil photo de leur
            téléphone. L&rsquo;heure du serveur fait foi.
          </li>
          <li>
            Onglet <b>Tableau de bord</b> : inscrits, partis, arrivés, en course en direct.
          </li>
          <li>
            Onglet <b>Tous les essais</b> : historique complet des scans, y compris les essais
            multiples d&rsquo;un même concurrent.
          </li>
          <li>
            Après la course, passe en <b>Clôturée</b> : les scans sont refusés et les résultats
            restent consultables.
          </li>
        </ul>
      </Section>

      <Section id="resultats" title="3. Résultats et corrections">
        <ul>
          <li>
            Onglet <b>Résultats</b> : classement sur le <b>meilleur essai terminé</b> de chaque
            concurrent, avec recherche, filtre par statut et export <b>CSV</b>.
          </li>
          <li>
            Bouton <b>Modifier</b> sur une ligne : corrige l&rsquo;heure de départ ou d&rsquo;arrivée,
            le statut (abandon, disqualification…) ou le nom.
          </li>
          <li>
            Un concurrent qui s&rsquo;est trompé de scan : corrige l&rsquo;essai plutôt que de
            supprimer le concurrent (supprimer efface aussi son historique pour la course).
          </li>
        </ul>
      </Section>

      <Section id="parcours" title="4. Bibliothèque de parcours">
        <p>
          Menu <b>Parcours</b> : des tracés réutilisables sur plusieurs courses.
        </p>
        <ul>
          <li>
            <b>+ Nouveau parcours (GPX)</b> importe un tracé ; le nom est généré
            (<code>AC2000-distance-D+</code>) et modifiable.
          </li>
          <li>
            Dans la fiche d&rsquo;un parcours : <b>Remplacer le fichier GPX</b>, <b>⇄ Inverser le
            sens</b> (départ et arrivée échangés, D+ recalculé) ou supprimer.
          </li>
          <li>
            <b>Espace concurrent</b> : coche pour que le parcours soit visible des concurrents
            connectés (carte, téléchargement GPX, suivi GPS).
          </li>
          <li>
            <b>Partage</b> : active le lien public pour envoyer le parcours à quelqu&rsquo;un sans
            compte. Il pourra l&rsquo;afficher en plein écran et le suivre avec son GPS. Tu peux
            régénérer le lien pour invalider l&rsquo;ancien.
          </li>
        </ul>
      </Section>

      <Section id="photos" title="5. Photos de profil">
        <p>
          Les concurrents peuvent ajouter une photo depuis <b>Mon espace → Profil</b>. Elle apparaît
          dans les listes (résultats, concurrents) pour les concurrents connectés et pour toi, jamais
          sur les pages publiques. Tu vois aussi les photos que leur propriétaire a choisi de ne pas
          partager.
        </p>
        <p>
          Pour une photo inappropriée : bouton <b>Retirer la photo</b> dans l&rsquo;onglet{" "}
          <b>Concurrents</b> ou <b>Résultats</b> d&rsquo;une course, ou dans{" "}
          <b>Utilisateurs → Concurrents</b>. Le concurrent peut en remettre une autre.
        </p>
      </Section>

      <Section id="stats" title="6. Statistiques de suivi">
        <p>
          Menu <b>Statistiques</b> : nombre de fois où un concurrent ou un visiteur a lancé le suivi
          GPS d&rsquo;un parcours.
        </p>
        <ul>
          <li>Compteurs : total, personnes distinctes, 7 et 30 derniers jours.</li>
          <li>Courbe des 30 derniers jours et tableau par parcours (espace concurrent / lien partagé).</li>
          <li>
            Un redémarrage dans les 10 minutes par la même personne n&rsquo;est pas recompté. Rien
            de personnel n&rsquo;est enregistré (ni nom, ni téléphone, ni position).
          </li>
        </ul>
      </Section>

      <Section id="utilisateurs" title="7. Utilisateurs">
        <ul>
          <li>
            <b>Administrateurs</b> : gère qui a accès à l&rsquo;administration.
          </li>
          <li>
            <b>Concurrents</b> : vue de tous les concurrents de toutes les courses, avec recherche et
            filtre par course. Le dossard et la catégorie se modifient dans l&rsquo;onglet
            Concurrents de la course.
          </li>
        </ul>
      </Section>

      <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <b className="text-ink">Astuce :</b> l&rsquo;appli se met à jour toute seule. Si un bandeau
        « nouvelle version » apparaît, appuie sur le bouton pour recharger.
      </p>
    </div>
  );
}
