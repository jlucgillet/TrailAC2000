#!/usr/bin/env node
// Applique la gestion des membres sur TES fichiers (patchs ancrés, idempotents).
// Usage (à la racine du projet) :  node tools/apply-membres.mjs [--dry]
import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const root = process.cwd();
const log = [];
let failures = 0;

const P = (...p) => path.join(root, ...p);
const read = (f) => fs.readFileSync(f, "utf8");

function patch(label, file, fn) {
  const f = P(file);
  if (!fs.existsSync(f)) { log.push(`⚠️  ${label}: ${file} introuvable`); failures++; return; }
  const src = read(f);
  const out = fn(src);
  if (out === "SKIP") { log.push(`✓  ${label}: déjà appliqué`); return; }
  if (out == null) { log.push(`❌ ${label}: ancre introuvable dans ${file} → à faire à la main`); failures++; return; }
  if (!DRY) fs.writeFileSync(f, out);
  log.push(`✅ ${label}`);
}

// 1. Prisma
patch("schema.prisma : modèle Member", "prisma/schema.prisma", (s) => {
  if (/model\s+Member\s*\{/.test(s)) return "SKIP";
  return s.replace(/\s*$/, "\n") + `
model Member {
  id              String   @id @default(uuid())
  phoneNormalized String   @unique
  firstName       String   @default("")
  lastName        String   @default("")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @default(now()) @updatedAt

  @@map("members")
}
`;
});

// 2. Session : être membre = condition d'accès
patch("session.ts : getAthleteSession vérifie la liste des membres", "src/lib/session.ts", (s) => {
  if (s.includes("prisma.member")) return "SKIP";
  const re = /export async function getAthleteSession\(\)[^{]*\{[\s\S]*?\n\}\n/;
  if (!re.test(s)) return null;
  s = s.replace(re, `export async function getAthleteSession(): Promise<AthleteSessionPayload | null> {
  const token = cookies().get(ATHLETE_COOKIE)?.value;
  if (!token) return null;
  let payload: AthleteSessionPayload;
  try {
    const verified = await jwtVerify(token, secretKey());
    payload = verified.payload as unknown as AthleteSessionPayload;
  } catch {
    return null;
  }
  // Seuls les membres de la liste du club ont accès (un membre retiré perd
  // l'accès immédiatement). Le nom affiché vient toujours de la fiche membre.
  const member = await prisma.member.findUnique({
    where: { phoneNormalized: payload.phoneNormalized },
  });
  if (!member) return null;
  return {
    ...payload,
    firstName: member.firstName || undefined,
    lastName: member.lastName || undefined,
  };
}
`);
  if (!/from "@\/lib\/db"/.test(s)) {
    s = s.replace(/(import \{ cookies \} from "next\/headers";\n)/, `$1import { prisma } from "@/lib/db";\n`);
  }
  return s.includes('from "@/lib/db"') ? s : null;
});

// 3. Login : le numéro doit être dans la liste
patch("api/athlete/login : numéro de membre obligatoire", "src/app/api/athlete/login/route.ts", (s) => {
  if (s.includes("prisma.member")) return "SKIP";
  const a = s.indexOf("  let firstName = parsed.data.firstName;");
  const bMarker = "await createAthleteSession({ phoneNormalized: normalized.value, firstName, lastName });";
  const b = s.indexOf(bMarker);
  if (a < 0 || b < 0) return null;
  const repl = `  const member = await prisma.member.findUnique({
    where: { phoneNormalized: normalized.value },
  });
  if (!member) {
    return NextResponse.json(
      {
        error:
          "Ce numéro n'est pas dans la liste des membres du club. Contacte un responsable du club pour être ajouté.",
      },
      { status: 403 }
    );
  }

  await createAthleteSession({
    phoneNormalized: member.phoneNormalized,
    firstName: member.firstName || undefined,
    lastName: member.lastName || undefined,
  });`;
  return s.slice(0, a) + repl + s.slice(b + bMarker.length);
});

// 4. Changement de nom depuis le profil → met aussi à jour la fiche membre
patch("api/athlete/name : met à jour la fiche membre", "src/app/api/athlete/name/route.ts", (s) => {
  if (s.includes("prisma.member")) return "SKIP";
  const marker = "  await createAthleteSession({";
  if (!s.includes(marker)) return null;
  s = s.replace(marker, `  await prisma.member.update({
    where: { phoneNormalized: session.phoneNormalized },
    data: {
      firstName: parsed.data.firstName ?? "",
      lastName: parsed.data.lastName ?? "",
    },
  });

${marker}`);
  if (!/import\s*\{[^}]*\bprisma\b[^}]*\}\s*from\s*["']@\/lib\/db["']/.test(s)) {
    s = s.replace(/(import \{ z \} from "zod";\n)/, `$1import { prisma } from "@/lib/db";\n`);
  }
  return s;
});

// 5. Admin : onglet Membres
patch("UsersWorkspace : onglet Membres", "src/app/admin/users/UsersWorkspace.tsx", (s) => {
  if (s.includes("MembersTab")) return "SKIP";
  if (!s.includes('{ id: "admins", label: "Administrateurs" },') || !s.includes('{ id: "participants", label: "Concurrents" },')) return null;
  s = s.replace('{ id: "admins", label: "Administrateurs" },', '{ id: "members", label: "Membres" },\n  { id: "admins", label: "Administrateurs" },');
  s = s.replace('label: "Concurrents"', 'label: "Participants"');
  s = s.replace('import { AdminsTab } from "./AdminsTab";', 'import { AdminsTab } from "./AdminsTab";\nimport { MembersTab } from "./MembersTab";');
  s = s.replace('useState<TabId>("admins")', 'useState<TabId>("members")');
  s = s.replace('{tab === "participants" && <GlobalParticipantsTab />}', '{tab === "members" && <MembersTab />}\n      {tab === "participants" && <GlobalParticipantsTab />}');
  return s.includes("<MembersTab />") && s.includes('"members")') ? s : null;
});

// 6. Menu Mon espace : lien Trombinoscope
patch("MonEspaceHeader : lien Trombinoscope", "src/app/mon-espace/MonEspaceHeader.tsx", (s) => {
  if (s.includes("/mon-espace/trombinoscope")) return "SKIP";
  const a = '  { href: "/mon-espace/profil", label: "Profil", icon: "👤" },';
  if (!s.includes(a)) return null;
  return s.replace(a, '  { href: "/mon-espace/trombinoscope", label: "Trombinoscope", icon: "🧑‍🤝‍🧑" },\n' + a);
});

// 7. Page de connexion : plus de saisie prénom/nom (le nom vient de la liste)
patch("login : suppression des champs prénom/nom", "src/app/mon-espace/login/page.tsx", (s) => {
  const a = s.indexOf('<div className="grid grid-cols-2 gap-3">');
  const b = s.indexOf("{error && (");
  if (a < 0 || b < 0) return s.includes("grid grid-cols-2") ? null : "SKIP";
  if (b < a) return null;
  s = s.slice(0, a) + s.slice(b);
  s = s.replace(/\n\s*firstName: firstName \|\| undefined,/, "").replace(/\n\s*lastName: lastName \|\| undefined,/, "");
  s = s.replace(/\n\s*const \[firstName, setFirstName\] = useState\(""\);/, "").replace(/\n\s*const \[lastName, setLastName\] = useState\(""\);/, "");
  return s;
});

// 7b. Guides : mise à jour (membres, trombinoscope)
patch("guide gestionnaire : section Membres", "src/app/guide/organisateur/page.tsx", (s) => {
  if (s.includes('id="membres"')) return "SKIP";
  const navA = '["utilisateurs", "Utilisateurs"],';
  const secA = '<Section id="utilisateurs" title="7. Utilisateurs">';
  if (!s.includes(navA) || !s.includes(secA)) return null;
  s = s.replace(navA, '["membres", "Membres"],\n          ' + navA);
  const membres = `<Section id="membres" title="7. Membres du club">
        <p>
          Les <b>membres</b> forment la liste des personnes autorisées à entrer dans l&rsquo;espace
          membre. Un membre peut participer ou non à une course chronométrée ; il a accès aux
          parcours, à son profil et au trombinoscope dans tous les cas.
        </p>
        <p>
          Menu <b>Utilisateurs → Membres</b> :
        </p>
        <ul>
          <li>
            <b>+ Ajouter un membre</b> : prénom, nom et téléphone (le téléphone est l&rsquo;identifiant).
          </li>
          <li>
            <b>Importer un CSV</b> : colonnes Prénom;Nom;Téléphone (séparateur ; , ou tabulation). Un
            numéro déjà présent est mis à jour, les nouveaux sont ajoutés, les lignes invalides sont
            listées sans bloquer le reste.
          </li>
          <li>
            <b>Exporter</b> : télécharge la liste en CSV (ouvrable dans Excel).
          </li>
          <li>
            ✏️ modifie un membre (changer le téléphone met aussi à jour sa photo et ses
            participations) ; 🗑️ le retire de la liste : il ne peut plus se connecter, sa photo est
            supprimée, ses résultats sont conservés.
          </li>
        </ul>
        <p>
          Seul un numéro présent dans la liste permet de se connecter. Un membre inconnu voit un
          message lui demandant de contacter un responsable du club. Le chronométrage par simple scan
          (sans connexion) reste ouvert à tous, membre ou non.
        </p>
        <p>
          Le <b>trombinoscope</b> (prénom, nom, photo) est visible par tous les membres connectés.
          Une photo que le membre n&rsquo;a pas choisi de partager est remplacée par ses initiales ;
          les téléphones ne sont jamais affichés.
        </p>
      </Section>

      `;
  s = s.replace(secA, membres + '<Section id="utilisateurs" title="8. Utilisateurs">');
  s = s.replace(/<b>Concurrents<\/b> : vue de tous les concurrents/, "<b>Participants</b> : vue de tous les participants");
  s = s.replace("<b>Utilisateurs → Concurrents</b>", "<b>Utilisateurs → Membres</b>");
  s = s.replace("Les concurrents peuvent ajouter une photo depuis <b>Mon espace → Profil</b>. Elle apparaît", "Les membres peuvent ajouter une photo depuis <b>Mon espace → Profil</b>. Elle apparaît dans le trombinoscope (si le membre la partage) et");
  return s;
});

patch("guide membre : connexion et trombinoscope", "src/app/guide/concurrent/page.tsx", (s) => {
  if (s.includes('id="trombinoscope"')) return "SKIP";
  const capA = "Le menu\n                te donne accès à <b className=\"text-ink\">Courses, Parcours, Guide</b> et Déconnexion.";
  const confA = '<p className="mt-10 rounded-xl border border-border bg-surface p-4 text-sm text-muted">\n        <b className="text-ink">Confidentialité :</b>';
  const introA = 'pour retrouver l&rsquo;historique de toutes tes courses.';
  if (!s.includes(confA) || !s.includes(capA)) return null;
  s = s.replace(capA, "Le menu\n                te donne accès à <b className=\"text-ink\">Courses, Parcours, Trombinoscope, Profil, Guide</b> et Déconnexion.");
  if (s.includes(introA)) s = s.replace(introA, introA + " L&rsquo;espace membre est réservé aux membres du club (ton numéro doit figurer dans la liste tenue par le club) ; tu y retrouves aussi le <a href=\"#trombinoscope\" className=\"text-accent underline\">trombinoscope</a>.");
  const section = `<section id="trombinoscope" className="mt-16 scroll-mt-8">
        <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
          Membres
        </span>
        <h2 className="mb-1 font-display text-2xl font-semibold">Profil et trombinoscope</h2>
        <p className="mb-6 text-muted">
          La liste des membres est tenue à jour par les responsables du club.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">🔐 Connexion</p>
            <p className="text-sm text-muted">
              Saisis ton numéro de téléphone sur la page d&rsquo;accueil → « Espace membre ». Si ton
              numéro n&rsquo;est pas reconnu, contacte un responsable du club pour être ajouté ou
              corriger ton numéro.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-1 font-medium">👤 Ma photo</p>
            <p className="text-sm text-muted">
              Dans <b className="text-ink">Profil</b>, ajoute ta photo. Elle n&rsquo;apparaît dans le
              trombinoscope que si <b className="text-ink">« Partager ma photo »</b> est activé ;
              sinon les autres voient tes initiales.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5 sm:col-span-2">
            <p className="mb-1 font-medium">🧑‍🤝‍🧑 Trombinoscope</p>
            <p className="text-sm text-muted">
              Menu <b className="text-ink">Trombinoscope</b> : tous les membres avec photo, prénom et
              nom. Utilise la recherche pour retrouver quelqu&rsquo;un, touche une photo pour
              l&rsquo;agrandir. Les numéros de téléphone ne sont jamais affichés.
            </p>
          </div>
        </div>
      </section>

      `;
  return s.replace(confA, section + confA);
});

// 7c. Intitulés « Guide concurrent » → « Guide membre » (le paramètre ?espace=concurrent reste inchangé)
for (const [file, pairs] of [
  ["src/app/guide/page.tsx", [['"Guide concurrent"', '"Guide membre"'], ["résultats, photos et statistiques", "résultats, membres, photos et statistiques"]]],
  ["src/app/guide/concurrent/page.tsx", [[">Guide concurrent</p>", ">Guide membre</p>"]]],
  ["src/app/guide/installation/page.tsx", [[">Guide concurrent</p>", ">Guide membre</p>"]]],
]) {
  patch("intitulé guide : " + file.split("/").slice(-2).join("/"), file, (s) => {
    let o = s, changed = false;
    for (const [a, b] of pairs) if (o.includes(a)) { o = o.split(a).join(b); changed = true; }
    return changed ? o : "SKIP";
  });
}

// 8. Renommage « espace concurrent » → « espace membre » (textes uniquement)
const RENAMES = [
  ["Mon espace concurrent", "Mon espace membre"],
  ["Espace concurrent", "Espace membre"],
  ["espace concurrent", "espace membre"],
];
function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p, acc) : /\.(tsx?|md|mdx)$/.test(e.name) && acc.push(p);
  }
  return acc;
}
let renamed = 0;
if (fs.existsSync(P("src"))) {
  for (const f of walk(P("src"))) {
    const s = read(f);
    let o = s;
    for (const [a, b] of RENAMES) o = o.split(a).join(b);
    if (o !== s) {
      renamed++;
      log.push(`   ↳ renommé : ${path.relative(root, f)}`);
      if (!DRY) fs.writeFileSync(f, o);
    }
  }
}
log.push(`✅ Renommage « espace concurrent » → « espace membre » : ${renamed} fichier(s)`);

console.log((DRY ? "[SIMULATION — rien n'est écrit]\n" : "") + log.join("\n"));
if (failures) {
  console.log(`\n${failures} patch(s) à vérifier à la main (voir ❌/⚠️ ci-dessus).`);
  process.exit(1);
}
console.log("\nTerminé. Étapes suivantes : npx prisma generate && npx tsc --noEmit");
