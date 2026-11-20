#!/usr/bin/env node
// Ajoute « Prendre une photo » à ProfilePhoto.tsx (patch ancré, idempotent).
// Usage (racine du projet) : node tools/apply-photo-camera.mjs
import fs from "node:fs";
const f = "src/app/mon-espace/profil/ProfilePhoto.tsx";
if (!fs.existsSync(f)) { console.log("❌ " + f + " introuvable"); process.exit(1); }
let s = fs.readFileSync(f, "utf8");
if (s.includes("PhotoCapture")) { console.log("✓ déjà appliqué"); process.exit(0); }

const steps = [];
function rep(label, from, to) {
  if (!s.includes(from)) { steps.push("❌ " + label); return; }
  s = s.replace(from, to); steps.push("✅ " + label);
}
rep("import", 'import { useRef, useState } from "react";', 'import { useRef, useState } from "react";\nimport { PhotoCapture } from "./PhotoCapture";');
rep("état caméra", "const inputRef = useRef<HTMLInputElement>(null);", "const inputRef = useRef<HTMLInputElement>(null);\n  const [camera, setCamera] = useState(false);");
rep("traitement commun fichier/caméra",
`    if (!file) return;
    setBusy(true);`,
`    if (!file) return;
    await uploadFile(file);
  }

  async function uploadFile(file: File) {
    setBusy(true);`);
rep("bouton caméra", /\{busy \? "Envoi…" : photo \? "Changer la photo" : "Ajouter une photo"\}\n\s*<\/button>/.exec(s)?.[0] ?? "@@none@@",
  (/\{busy \? "Envoi…" : photo \? "Changer la photo" : "Ajouter une photo"\}\n\s*<\/button>/.exec(s)?.[0] ?? "") +
`
            <button
              type="button"
              disabled={busy}
              onClick={() => setCamera(true)}
              className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-50"
            >
              📷 Prendre une photo
            </button>`);
rep("fenêtre caméra", '{error && <p className="text-sm text-danger">{error}</p>}',
`{camera && (
        <PhotoCapture
          onClose={() => setCamera(false)}
          onCapture={(file) => {
            setCamera(false);
            void uploadFile(file);
          }}
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}`);
console.log(steps.join("\n"));
if (steps.some((x) => x.startsWith("❌"))) { console.log("Rien n'a été écrit : ancre introuvable, ton fichier diffère de ma copie."); process.exit(1); }
fs.writeFileSync(f, s);
console.log("Terminé. Lance : npx tsc --noEmit");
