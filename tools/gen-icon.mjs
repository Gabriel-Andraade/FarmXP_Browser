/**
 * @file gen-icon.mjs - Gera o ícone do executável.
 *
 * Rasteriza uma imagem-fonte em vários tamanhos com sharp e empacota num .ico
 * multi-resolução (PNG-in-ICO, suportado no Windows Vista+). Saída: icon.ico na
 * raiz do repo, usado por `bun build --compile --windows-icon=icon.ico`.
 *
 * Fonte: se passar um caminho de imagem (PNG/JPEG), usa ela; senão, desenha o
 * SVG padrão (trigo dourado sobre campo verde + sol).
 *
 * Rodar:  `bun tools/gen-icon.mjs`            (ícone padrão desenhado)
 *         `bun tools/gen-icon.mjs meu.png`    (usa a sua imagem)
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Um grão de trigo: elipse inclinada saindo do eixo central em (cx,y). */
function grain(cx, y, dir) {
  return (
    `<g transform="rotate(${dir * 34} ${cx} ${y})">` +
    `<ellipse cx="${cx}" cy="${y - 17}" rx="8.5" ry="18" ` +
    `fill="#f4c95d" stroke="#d99a2b" stroke-width="2.5"/></g>`
  );
}

function buildSvg() {
  const cx = 128;
  const tipY = 60;
  const baseY = 150;
  const steps = 5;
  const grains = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const y = baseY + (tipY - baseY) * t;
    grains.push(grain(cx, y, -1), grain(cx, y, 1));
  }
  // grão da ponta (reto)
  grains.push(
    `<ellipse cx="${cx}" cy="${tipY - 4}" rx="8.5" ry="19" ` +
      `fill="#f4c95d" stroke="#d99a2b" stroke-width="2.5"/>`,
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bfe6ff"/>
      <stop offset="1" stop-color="#8fd0ff"/>
    </linearGradient>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7ec24f"/>
      <stop offset="1" stop-color="#4f9138"/>
    </linearGradient>
    <clipPath id="round"><rect x="0" y="0" width="256" height="256" rx="52"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect x="0" y="0" width="256" height="256" fill="url(#sky)"/>
    <circle cx="196" cy="66" r="30" fill="#ffdd55"/>
    <path d="M0 150 Q 128 118 256 150 L256 256 L0 256 Z" fill="url(#field)"/>
    <!-- caule -->
    <rect x="122" y="150" width="12" height="74" rx="6" fill="#c98a2e"/>
    <!-- folhas -->
    <path d="M128 190 Q 92 176 78 150 Q 112 160 128 182 Z" fill="#8fbf3f"/>
    <path d="M128 190 Q 164 176 178 150 Q 144 160 128 182 Z" fill="#8fbf3f"/>
    <!-- espiga -->
    ${grains.join("\n    ")}
  </g>
  <rect x="1.5" y="1.5" width="253" height="253" rx="51" fill="none" stroke="#00000022" stroke-width="3"/>
</svg>`;
}

/** Empacota PNGs num container .ico (header + directory + dados PNG). */
function packIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);

  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  images.forEach((img, i) => {
    const e = 16 * i;
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e + 0); // width (0 = 256)
    dir.writeUInt8(img.size >= 256 ? 0 : img.size, e + 1); // height
    dir.writeUInt8(0, e + 2); // palette
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // color planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(img.buffer.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += img.buffer.length;
  });

  return Buffer.concat([header, dir, ...images.map((i) => i.buffer)]);
}

// Fonte: imagem passada por argumento, ou o SVG padrão.
const srcArg = process.argv[2];
const source = srcArg ? srcArg : Buffer.from(buildSvg());
if (srcArg) console.log("usando imagem:", srcArg);

// Inclui TODOS os tamanhos que o shell do Windows pede (16 lista, 32 barra,
// 48 médio, 96 "ícones grandes" da área de trabalho, 256 extra-grande). Sem o
// 96 nativo, o Windows estica o de 64 → atalho borrado.
const sizes = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const images = await Promise.all(
  sizes.map(async (size) => {
    // A arte é PIXEL ART (bordas duras). Reduzir com filtro suave (lanczos)
    // borra os pixels; `nearest` preserva a nitidez do pixel art. Nos tamanhos
    // minúsculos (<48) o nearest fica ruidoso, então ali usamos lanczos (vira
    // um borrão pequeno de qualquer jeito, melhor suave que serrilhado).
    const img = sharp(source).resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: size >= 48 ? "nearest" : "lanczos3",
    });
    return { size, buffer: await img.png().toBuffer() };
  }),
);

writeFileSync(join(ROOT, "icon.ico"), packIco(images));
// Só exporta o PNG 256 quando a fonte é o ícone PADRÃO (SVG) — evita
// sobrescrever uma imagem-fonte passada por argumento.
if (!srcArg) {
  writeFileSync(join(ROOT, "public", "assets", "icon.png"), images.at(-1).buffer);
}
console.log(`icon.ico gerado (${sizes.length} tamanhos)${srcArg ? "" : " + public/assets/icon.png"}`);
