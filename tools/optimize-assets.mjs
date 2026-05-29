#!/usr/bin/env node
/**
 * @file scripts/optimize-assets.mjs - Converte PNGs em WebP via Sharp.
 *
 * Gera um `.webp` ao lado de cada `.png` em `public/assets`. Skip
 * incremental: se o `.webp` já existe E é mais novo que o `.png`,
 * pula (idempotente — pode rodar 100× sem reprocessar).
 *
 * Uso:
 *   npm run optimize-assets        # converte tudo
 *   node scripts/optimize-assets.mjs --force   # reprocessa tudo
 *
 * Quality: 90 + effort 6 = near-lossless visual, compressão ~60-75%
 * abaixo do PNG original. Pra sprites com transparência (animais, icons)
 * o alpha é preservado.
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'public', 'assets');
const FORCE = process.argv.includes('--force');

const STATS = {
  scanned: 0,
  converted: 0,
  skipped: 0,
  failed: 0,
  totalPngBytes: 0,
  totalWebpBytes: 0,
};

/** Recursivamente lista arquivos com extensão dada. */
async function walkExt(dir, ext) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walkExt(full, ext));
    } else if (e.isFile() && full.toLowerCase().endsWith(ext)) {
      out.push(full);
    }
  }
  return out;
}

/** Decide se reprocessa: força, ou .webp não existe, ou .png é mais novo. */
async function shouldConvert(pngPath, webpPath) {
  if (FORCE) return true;
  try {
    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath),
    ]);
    return pngStat.mtimeMs > webpStat.mtimeMs;
  } catch {
    return true;
  }
}

async function convertOne(pngPath) {
  const webpPath = pngPath.replace(/\.png$/i, '.webp');
  if (!await shouldConvert(pngPath, webpPath)) {
    STATS.skipped++;
    return;
  }
  try {
    await sharp(pngPath)
      .webp({ quality: 90, effort: 6, alphaQuality: 100 })
      .toFile(webpPath);
    const [pngStat, webpStat] = await Promise.all([
      fs.stat(pngPath),
      fs.stat(webpPath),
    ]);
    STATS.converted++;
    STATS.totalPngBytes += pngStat.size;
    STATS.totalWebpBytes += webpStat.size;
    const ratio = ((1 - webpStat.size / pngStat.size) * 100).toFixed(1);
    const rel = path.relative(ROOT, pngPath);
    console.log(`✓ ${rel} → -${ratio}%`);
  } catch (err) {
    STATS.failed++;
    console.error(`✗ ${pngPath}: ${err.message}`);
  }
}

async function main() {
  console.log(`📦 Scanning ${path.relative(ROOT, ASSETS_DIR)} for PNGs...`);
  const pngs = await walkExt(ASSETS_DIR, '.png');
  STATS.scanned = pngs.length;
  console.log(`Found ${pngs.length} PNGs. ${FORCE ? 'FORCE mode.' : 'Incremental.'}\n`);

  const CONCURRENCY = 4;
  for (let i = 0; i < pngs.length; i += CONCURRENCY) {
    await Promise.all(pngs.slice(i, i + CONCURRENCY).map(convertOne));
  }

  const pngMb = (STATS.totalPngBytes / 1024 / 1024).toFixed(2);
  const webpMb = (STATS.totalWebpBytes / 1024 / 1024).toFixed(2);
  const totalRatio = STATS.totalPngBytes
    ? ((1 - STATS.totalWebpBytes / STATS.totalPngBytes) * 100).toFixed(1)
    : '0';

  console.log(`
─────────────────────────────────
📊 Resumo
  Total scanned   : ${STATS.scanned}
  Convertidos     : ${STATS.converted}
  Pulados (cache) : ${STATS.skipped}
  Falhas          : ${STATS.failed}
  PNG (só novos)  : ${pngMb} MB
  WebP (só novos) : ${webpMb} MB
  Redução         : -${totalRatio}%
─────────────────────────────────`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
