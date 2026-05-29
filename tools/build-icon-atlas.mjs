#!/usr/bin/env node
/**
 * @file tools/build-icon-atlas.mjs - Empacota icons individuais num atlas.
 *
 * Lê todos os PNGs em `public/assets/icons/` e gera:
 *   - `public/assets/icons/atlas.webp` — imagem única com todos os icons
 *   - `public/assets/icons/atlas.png`  — fallback pra browser sem WebP
 *   - `public/style/icon-atlas.css`    — classe por icon com posições
 *
 * No jogo, `setItemIcon` usa CSS classes em vez de carregar 77 imagens
 * separadas. Resultado: 77 HTTP requests → 1 (atlas) + 1 (CSS).
 *
 * Uso:
 *   npm run build-icon-atlas
 *
 * Layout: grid simples (sqrt do total) × (sqrt do total). Cell size é o
 * MÁXIMO dimensão dos icons (consistência visual + simplicidade).
 * Algoritmo de bin-packing não vale a complexidade — icons são similares.
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'public', 'assets', 'icons');
const OUT_PNG = path.join(ICONS_DIR, 'atlas.png');
const OUT_WEBP = path.join(ICONS_DIR, 'atlas.webp');
const OUT_CSS = path.join(ROOT, 'public', 'style', 'icon-atlas.css');

async function main() {
  const entries = await fs.readdir(ICONS_DIR);
  const files = entries
    .filter(f => f.endsWith('.png') && !f.startsWith('atlas'))
    .sort();

  if (files.length === 0) {
    console.warn('No PNG icons found.');
    return;
  }

  console.log(`📦 ${files.length} icons → atlas`);

  // Metadata + raw bytes em paralelo.
  const metas = await Promise.all(files.map(async (f) => {
    const fullPath = path.join(ICONS_DIR, f);
    const meta = await sharp(fullPath).metadata();
    const buf = await fs.readFile(fullPath);
    return { name: f, width: meta.width, height: meta.height, buf };
  }));

  // Cell size = maior dim. Padding zero — icons já têm seu próprio whitespace.
  const cellW = Math.max(...metas.map(m => m.width));
  const cellH = Math.max(...metas.map(m => m.height));
  const cols = Math.ceil(Math.sqrt(files.length));
  const rows = Math.ceil(files.length / cols);
  const atlasW = cols * cellW;
  const atlasH = rows * cellH;

  console.log(`  Grid ${cols}×${rows} (cells ${cellW}×${cellH}) → ${atlasW}×${atlasH}`);

  // Posiciona cada icon. Centraliza dentro da célula se for menor que cellW/cellH.
  const positions = {};
  const composites = metas.map((m, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = col * cellW + Math.floor((cellW - m.width) / 2);
    const y = row * cellH + Math.floor((cellH - m.height) / 2);
    positions[m.name] = { x, y, w: m.width, h: m.height };
    return { input: m.buf, left: x, top: y };
  });

  // Cria atlas vazio transparente + compõe.
  await sharp({
    create: {
      width: atlasW,
      height: atlasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(OUT_PNG);

  await sharp(OUT_PNG)
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(OUT_WEBP);

  // Gera CSS com 1 classe por icon. Class name = nome do arquivo sem .png.
  // Base class .icon-atlas tem o background-image; .icon-* tem posição+size.
  const cssLines = [
    '/**',
    ' * @file icon-atlas.css — gerado automaticamente por',
    ' * `tools/build-icon-atlas.mjs`. NÃO edite à mão. Bumpa quando rodar',
    ' * `npm run build-icon-atlas` após adicionar/remover icons.',
    ' */',
    '',
    '.icon-atlas {',
    `  background-image: url('/assets/icons/atlas.webp');`,
    '  background-repeat: no-repeat;',
    '  display: inline-block;',
    '  image-rendering: -webkit-optimize-contrast;',
    '  image-rendering: crisp-edges;',
    '}',
    '',
  ];
  for (const [filename, p] of Object.entries(positions)) {
    const cls = `icon-${filename.replace(/\.png$/i, '')}`;
    cssLines.push(`.${cls} { background-position: -${p.x}px -${p.y}px; width: ${p.w}px; height: ${p.h}px; }`);
  }
  await fs.writeFile(OUT_CSS, cssLines.join('\n') + '\n');

  const [pngStat, webpStat, cssStat] = await Promise.all([
    fs.stat(OUT_PNG),
    fs.stat(OUT_WEBP),
    fs.stat(OUT_CSS),
  ]);
  const origTotal = metas.reduce((sum, m) => sum + m.buf.length, 0);

  console.log(`
─────────────────────────────────
📊 Resumo
  Icons individuais (PNG)  : ${(origTotal / 1024).toFixed(1)} KB
  Atlas PNG                : ${(pngStat.size / 1024).toFixed(1)} KB
  Atlas WebP               : ${(webpStat.size / 1024).toFixed(1)} KB
  CSS gerado               : ${(cssStat.size / 1024).toFixed(1)} KB
  Total atlas (WebP+CSS)   : ${((webpStat.size + cssStat.size) / 1024).toFixed(1)} KB
  HTTP requests poupados   : ${files.length - 2}
─────────────────────────────────`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
