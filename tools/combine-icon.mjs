/**
 * @file combine-icon.mjs - Monta o icon.ico final.
 *
 * Usa o quadro 256×256 do .ico de origem (raster nativo, sem filtro) e
 * adiciona os tamanhos menores gerados por nearest-neighbor a partir da arte
 * em alta — assim o ícone fica nítido no extra-grande E no atalho pequeno
 * (com só o 256, o Windows redimensiona sozinho e borra os tamanhos menores).
 *
 * Rodar: `bun tools/combine-icon.mjs icon-src/farmingXP.ico icon-src/iconGame.png`
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const icoPath = process.argv[2];
const artPath = process.argv[3];
if (!icoPath || !artPath) {
  console.error("uso: bun tools/combine-icon.mjs <ico-do-usuario> <arte.png>");
  process.exit(1);
}

/** Extrai o PNG de maior tamanho de dentro de um .ico (PNG-in-ICO). */
function extractLargestPng(ico) {
  const count = ico.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const e = 6 + 16 * i;
    const w = ico.readUInt8(e) || 256;
    const bytes = ico.readUInt32LE(e + 8);
    const off = ico.readUInt32LE(e + 12);
    const png = ico.subarray(off, off + bytes);
    if (!best || w >= best.size) best = { size: w, buffer: png };
  }
  return best;
}

/** Empacota PNGs num container .ico. */
function packIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  images.forEach((img, i) => {
    const e = 16 * i;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e + 0);
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e + 1);
    dir.writeUInt16LE(1, e + 4);
    dir.writeUInt16LE(32, e + 6);
    dir.writeUInt32LE(img.buffer.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += img.buffer.length;
  });
  return Buffer.concat([header, dir, ...images.map((i) => i.buffer)]);
}

const big = extractLargestPng(readFileSync(icoPath));
console.log(`256 do usuário: ${big.size}px, ${big.buffer.length} bytes`);

const smallSizes = [16, 20, 24, 32, 40, 48, 64, 96, 128];
const small = await Promise.all(
  smallSizes.map(async (size) => ({
    size,
    buffer: await sharp(artPath)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: size >= 48 ? "nearest" : "lanczos3",
      })
      .png()
      .toBuffer(),
  })),
);

// Ordena do MAIOR pro menor: o Bun parece embutir o primeiro frame da lista,
// então o 256 precisa vir primeiro pra não sair um 16px esticado (borrado).
const images = [{ size: 256, buffer: big.buffer }, ...small].sort(
  (a, b) => b.size - a.size,
);
writeFileSync(join(ROOT, "icon.ico"), packIco(images));
console.log(`icon.ico final: ${images.length} tamanhos, maior primeiro (256 = o seu)`);
