/**
 * @file gen-embedded.mjs - Gera embeddedAssets.ts pro executável single-file.
 *
 * Anda pelo public/, escolhe o MENOR de cada par png/webp (mesma otimização do
 * pacote) e emite um `import ... with { type: "file" }` por arquivo + um Map
 * `EMBEDDED` (url-path -> caminho do arquivo). O `bun build --compile` embute
 * esses arquivos no binário; em dev os imports resolvem pro disco. Assim o
 * server serve de `EMBEDDED` e não precisa mais da pasta public/ ao lado.
 *
 * Rodar: `bun tools/gen-embedded.mjs`
 */
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(ROOT, "public");

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith(".")) walk(full, out); }
    else out.push(full);
  }
  return out;
}

const all = walk(PUB);
const allSet = new Set(all);
const keep = new Set();
for (const f of all) {
  const lower = f.toLowerCase();
  if (lower.endsWith(".png")) {
    const webp = f.slice(0, -4) + ".webp";
    keep.add(allSet.has(webp) && statSync(webp).size < statSync(f).size ? webp : f);
  } else if (lower.endsWith(".webp")) {
    const png = f.slice(0, -5) + ".png";
    keep.add(allSet.has(png) && statSync(png).size <= statSync(f).size ? png : f);
  } else {
    keep.add(f);
  }
}

const files = [...keep].sort();
const imports = [];
const entries = [];
let total = 0;
files.forEach((f, i) => {
  const rel = relative(PUB, f).replace(/\\/g, "/");
  const spec = "./public/" + rel;
  imports.push(`import _a${i} from ${JSON.stringify(spec)} with { type: "file" };`);
  entries.push(`  [${JSON.stringify(rel)}, _a${i}],`);
  total += statSync(f).size;
});

const out =
  `// GERADO por tools/gen-embedded.mjs — não editar à mão.\n` +
  `// ${files.length} arquivos, ${(total / 1048576).toFixed(1)} MB embutidos no binário.\n\n` +
  imports.join("\n") +
  `\n\nexport const EMBEDDED: Map<string, string> = new Map([\n` +
  entries.join("\n") +
  `\n]);\n`;

writeFileSync(join(ROOT, "embeddedAssets.ts"), out);
console.log(`embeddedAssets.ts: ${files.length} arquivos, ${(total / 1048576).toFixed(1)} MB`);
