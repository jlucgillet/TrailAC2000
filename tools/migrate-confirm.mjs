// Remplace confirm()/alert() du navigateur par confirmDialog()/notify().
//
//   node tools/migrate-confirm.mjs src            (simulation, ne modifie rien)
//   node tools/migrate-confirm.mjs src --write    (applique les changements)
//
// - confirm(x)  ->  await confirmDialog(x)   (+ « async » ajouté à la fonction englobante)
// - alert(x)    ->  notify(x)
// - ajoute l'import depuis "@/components/ConfirmDialog" si besoin.
// Après exécution : `npx tsc --noEmit` pour vérifier, puis relire `git diff`.

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "package.json"));
const ts = require("typescript");

const root = process.argv[2] ?? "src";
const write = process.argv.includes("--write");
const SKIP = [/node_modules/, /[\\/]\.next[\\/]/, /ConfirmDialog\.tsx$/];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.some((r) => r.test(p))) continue;
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

const isFn = (n) =>
  ts.isArrowFunction(n) || ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n);
const isAsync = (n) => (ts.getCombinedModifierFlags?.(n) & ts.ModifierFlags.Async) !== 0 || n.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);

function calleeName(call) {
  const e = call.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === "window") return e.name.text;
  return null;
}

let totalFiles = 0;
const warnings = [];

for (const file of walk(root)) {
  const text = fs.readFileSync(file, "utf8");
  if (!/\b(confirm|alert|prompt)\s*\(/.test(text)) continue;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = []; // { pos, end, text }
  const asyncAt = new Set();
  let usesConfirm = false;
  let usesNotify = false;

  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const name = calleeName(node);
      if (name === "confirm") {
        usesConfirm = true;
        const e = node.expression;
        edits.push({ pos: e.getStart(sf), end: e.getEnd(), text: "await confirmDialog" });
        let p = node.parent;
        while (p && !isFn(p)) p = p.parent;
        if (!p) warnings.push(`${file}: confirm() hors de toute fonction (ligne ${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}) — à adapter à la main.`);
        else {
          if (!isAsync(p)) {
            let pos;
            if (ts.isArrowFunction(p)) pos = p.getStart(sf);
            else if (ts.isMethodDeclaration(p)) pos = p.name.getStart(sf);
            else {
              const m = /\bfunction\b/.exec(text.slice(p.getStart(sf), p.getEnd()));
              pos = p.getStart(sf) + (m ? m.index : 0);
            }
            asyncAt.add(pos);
          }
          const body = text.slice(p.getStart(sf), p.getEnd());
          if (/preventDefault\s*\(/.test(body))
            warnings.push(`${file}: ${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} — la fonction appelle preventDefault() : vérifie qu'il est appelé AVANT le « await ».`);
          const parentCall = p.parent;
          if (parentCall && ts.isCallExpression(parentCall) && /^(useEffect|useLayoutEffect)$/.test(parentCall.expression.getText(sf)))
            warnings.push(`${file}: confirm() directement dans un useEffect — à restructurer.`);
        }
      } else if (name === "alert") {
        usesNotify = true;
        const e = node.expression;
        edits.push({ pos: e.getStart(sf), end: e.getEnd(), text: "notify" });
      } else if (name === "prompt") {
        warnings.push(`${file}: prompt() trouvé (ligne ${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}) — non remplacé automatiquement.`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) continue;

  for (const pos of asyncAt) edits.push({ pos, end: pos, text: "async " });

  // Import
  const names = [usesConfirm && "confirmDialog", usesNotify && "notify"].filter(Boolean);
  if (!/@\/components\/ConfirmDialog/.test(text)) {
    const imports = sf.statements.filter(ts.isImportDeclaration);
    const insertAt = imports.length ? imports[imports.length - 1].getEnd() : 0;
    const line = `import { ${names.join(", ")} } from "@/components/ConfirmDialog";`;
    edits.push({ pos: insertAt, end: insertAt, text: imports.length ? `\n${line}` : `${line}\n` });
  }

  edits.sort((a, b) => b.pos - a.pos || b.end - a.end);
  let out = text;
  for (const ed of edits) out = out.slice(0, ed.pos) + ed.text + out.slice(ed.end);
  totalFiles++;
  console.log(`${write ? "modifié " : "à modifier"} ${file}  (confirm: ${edits.filter((e) => e.text === "await confirmDialog").length}, alert: ${edits.filter((e) => e.text === "notify").length})`);
  if (write) fs.writeFileSync(file, out);
}

console.log(`\n${totalFiles} fichier(s) ${write ? "modifié(s)" : "concerné(s) (simulation : ajoute --write pour appliquer)"}.`);
if (warnings.length) {
  console.log("\nÀ vérifier à la main :");
  warnings.forEach((w) => console.log(" - " + w));
}
