// Rend la mention « Leaflet | © OpenStreetMap contributors » des cartes très discrète :
//  - supprime le préfixe « Leaflet » (et le drapeau),
//  - réduit le texte restant (8 px, semi-transparent, fond léger).
// La mention © OpenStreetMap (ou OpenTopoMap / Esri) reste affichée : c'est une
// obligation de licence (ODbL) et des conditions d'usage des fonds de carte.
//
//   node tools/patch-attribution.mjs          (depuis la racine du dépôt)

import fs from "node:fs";

const FILES = ["src/components/GpxMap.tsx", "src/components/TracksMap.tsx"];
const ANCHOR = "const map = L.map(containerRef.current, { zoomControl: !isTouch });";
const REPLACEMENT = `const map = L.map(containerRef.current, { zoomControl: !isTouch, attributionControl: false });
      // Mention de licence discrète : sans « Leaflet », en tout petit.
      L.control.attribution({ prefix: false }).addTo(map);
      if (!document.getElementById("app-attribution-style")) {
        const st = document.createElement("style");
        st.id = "app-attribution-style";
        st.textContent =
          ".leaflet-container .leaflet-control-attribution{font-size:8px;line-height:1.2;padding:0 3px;background:rgba(255,255,255,.55);color:#444;box-shadow:none;opacity:.8}" +
          ".leaflet-container .leaflet-control-attribution a{color:inherit}";
        document.head.appendChild(st);
      }`;

let failed = false;
for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.log(`- ${f} : introuvable (à ignorer si ce fichier n'existe pas chez toi)`);
    continue;
  }
  const text = fs.readFileSync(f, "utf8");
  if (text.includes("app-attribution-style")) {
    console.log(`= ${f} : déjà modifié`);
    continue;
  }
  const n = text.split(ANCHOR).length - 1;
  if (n !== 1) {
    console.log(`! ${f} : la ligne « ${ANCHOR} » est introuvable (${n} occurrence) — à modifier à la main.`);
    failed = true;
    continue;
  }
  fs.writeFileSync(f, text.replace(ANCHOR, REPLACEMENT));
  console.log(`✓ ${f} : modifié`);
}
process.exit(failed ? 1 : 0);
