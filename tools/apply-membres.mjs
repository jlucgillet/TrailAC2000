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
  return s.replace(/(import \{ z \} from "zod";\n)/, `$1import { prisma } from "@/lib/db";\n`);
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
