/**
 * @file hide-console.mjs - Marca um .exe como GUI (sem console) no Windows.
 *
 * O `--windows-hide-console` do Bun não está aplicando (o binário sai com
 * subsystem = 3 = console, então abre um terminal preto ao rodar). Este passo
 * pós-build vira o byte do subsystem no cabeçalho PE pra 2 (GUI) — mesma coisa
 * que `editbin /SUBSYSTEM:WINDOWS`. Assim o Windows não aloca console.
 *
 * Rodar: `bun tools/hide-console.mjs <caminho-do-exe>`
 */
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("uso: bun tools/hide-console.mjs <exe>");
  process.exit(1);
}

const buf = readFileSync(file);
const peOff = buf.readUInt32LE(0x3c);
if (buf.toString("ascii", peOff, peOff + 2) !== "PE") {
  console.error("não parece um PE válido:", file);
  process.exit(1);
}
const subsystemOff = peOff + 4 + 20 + 68; // PE sig + COFF(20) + optHeader+68
const current = buf.readUInt16LE(subsystemOff);

const GUI = 2;
const CONSOLE = 3;
if (current === GUI) {
  console.log("já é GUI (sem console) — nada a fazer:", file);
  process.exit(0);
}
if (current !== CONSOLE) {
  console.error(`subsystem inesperado (${current}) — abortando por segurança.`);
  process.exit(1);
}

buf.writeUInt16LE(GUI, subsystemOff);
writeFileSync(file, buf);
console.log(`OK: ${file} agora é GUI (subsystem 3 → 2, sem terminal).`);
