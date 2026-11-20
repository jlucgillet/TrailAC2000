#!/usr/bin/env node
// Titre « Trail AC2000 » (onglet + aperçu des liens partagés). Idempotent, compatible CRLF.
// Usage (racine du projet) : node tools/apply-titre.mjs
import fs from "node:fs";
const f = "src/app/layout.tsx";
if (!fs.existsSync(f)) { console.log("❌ " + f + " introuvable"); process.exit(1); }
const raw = fs.readFileSync(f, "utf8");
const crlf = raw.includes("\r\n");
let s = raw.replace(/\r\n/g, "\n");

const titleRe = /(\n\s*)title:\s*(["'`])Trail AC2000\s*[—–-]\s*Chronométrage\2,/;
const hasOg = /openGraph\s*:/.test(s);
const m = s.match(/\n(\s*)title:\s*(["'`])([^"'`\n]*)\2,/);
if (!m) { console.log("❌ ancre « title: … » introuvable dans metadata"); process.exit(1); }

let changed = false;
if (titleRe.test(s)) { s = s.replace(titleRe, '$1title: "Trail AC2000",'); changed = true; }
const desc = (s.match(/description:\s*(["'`])([^"'`\n]*)\1/) ?? [])[2] ?? "Trail AC2000 - Parcours trail et chronométrage";
if (!hasOg) {
  const ind = m[1];
  s = s.replace(/(\n\s*title:\s*["'`][^"'`\n]*["'`],)/, `$1${"\n" + ind}openGraph: {${"\n" + ind}  title: "Trail AC2000",${"\n" + ind}  description: ${JSON.stringify(desc)},${"\n" + ind}  siteName: "Trail AC2000",${"\n" + ind}  type: "website",${"\n" + ind}  locale: "fr_FR",${"\n" + ind}},`);
  changed = true;
}
if (!changed) { console.log("✓ déjà appliqué"); process.exit(0); }
fs.writeFileSync(f, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log("✅ titre « Trail AC2000 » + openGraph dans " + f + "\nLance : npx tsc --noEmit");
