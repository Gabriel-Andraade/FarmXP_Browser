/**
 * @file server.ts - Development Static File Server
 * @description Simple Bun-based static file server for local development.
 * Serves files from the project root directory with basic security measures.
 *
 * @module Server
 * @author FarmXP Team
 * @requires bun
 *
 * @example
 * // Start the server
 * bun run server.ts
 *
 * @example
 * // Start with custom port
 * PORT=8080 bun run server.ts
 */

import { serve } from "bun";
import * as path from "path";
import { brotliCompressSync, constants as zlibConst } from "node:zlib";
import { readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { transform as esbuildTransform } from "esbuild";

// Liga/desliga minificação on-the-fly. true por padrão; pra debugar
// pode setar SERVER_NO_MINIFY=1 e ver código original.
const MINIFY_JS = process.env.SERVER_NO_MINIFY !== "1";

// Cache em memória das versões minificadas. Chave = path completo. Valor
// guarda mtime do arquivo no momento da minificação — invalidamos quando
// o arquivo no disco mudou (caso o processo NÃO esteja com --watch ou em
// produção sem restart).
const _minifiedJsCache = new Map<string, { mtimeMs: number; bytes: Uint8Array }>();

/**
 * Server port number
 * Uses PORT environment variable or defaults to 3000
 * @type {number}
 */
const port = Number(process.env.PORT) || 3000;

// Extensões de TEXTO que valem a pena comprimir. Binários (png/webp/mp3)
// já são comprimidos no formato, gzip em cima só desperdiça CPU.
const COMPRESSIBLE_EXT = new Set([
  ".html", ".js", ".css", ".json", ".svg", ".map", ".txt",
]);

// Cache de versões comprimidas. Chave: `${ext}|${path}|${encoding}`.
// Guarda mtime do arquivo de origem pra invalidar se mudou no disco
// (cobrindo deploys sem restart e edição manual sem --watch).
const _compressedCache = new Map<string, { mtimeMs: number; bytes: Uint8Array }>();

/**
 * Comprime `bytes` no formato indicado e cacheia o resultado em memória.
 * Cache invalida quando `mtimeMs` muda (cobre edição manual sem restart).
 *
 * - `"br"` → Brotli quality 6. Boa razão custo/benefício; q=11 demora
 *   muito mais sem ganho proporcional pra arquivos de poucos KB.
 * - `"gzip"` → nível default via `Bun.gzipSync` (rápido em runtime Bun).
 *
 * @param {string} cacheKey - Identificador único por (path, encoding, etc).
 *   Caller decide a granularidade.
 * @param {Uint8Array} rawBytes - Conteúdo a comprimir.
 * @param {"br"|"gzip"} encoding - Algoritmo de compressão.
 * @param {number} mtimeMs - mtime do arquivo de origem; usado pra invalidar
 *   entry cacheada quando o arquivo mudou.
 * @returns {Uint8Array} Bytes comprimidos.
 */
function getCompressed(
  cacheKey: string,
  rawBytes: Uint8Array,
  encoding: "br" | "gzip",
  mtimeMs: number,
): Uint8Array {
  const cached = _compressedCache.get(cacheKey);
  if (cached && cached.mtimeMs === mtimeMs) return cached.bytes;

  let compressed: Uint8Array;
  if (encoding === "br") {
    compressed = brotliCompressSync(rawBytes, {
      params: {
        [zlibConst.BROTLI_PARAM_QUALITY]: 6,
        [zlibConst.BROTLI_PARAM_MODE]: zlibConst.BROTLI_MODE_TEXT,
      },
    });
  } else {
    compressed = Bun.gzipSync(rawBytes);
  }
  _compressedCache.set(cacheKey, { mtimeMs, bytes: compressed });
  return compressed;
}

/**
 * Minifica um JS source via esbuild, preservando ES modules (não bundla).
 *
 * Reduz ~40% antes da compressão; somado com brotli, dá ~70% menor que
 * o original. Bonus: JS minified parseia mais rápido em CPU fraca.
 * Resultado cacheado em memória, invalidado por mtime do arquivo.
 *
 * Falhas (sintaxe inválida etc.) caem pro código original — comportamento
 * defensivo, evita derrubar o jogo por causa de um arquivo quebrado.
 *
 * @param {string} fullPath - Path absoluto do arquivo (usado como cache key).
 * @param {Uint8Array} rawBytes - Source bruto lido do disco.
 * @param {number} mtimeMs - mtime do arquivo de origem (invalida o cache).
 * @returns {Promise<Uint8Array>} Bytes minificados ou os originais em
 *   caso de erro de parse.
 */
async function getMinifiedJs(fullPath: string, rawBytes: Uint8Array, mtimeMs: number): Promise<Uint8Array> {
  if (!MINIFY_JS) return rawBytes;
  const cached = _minifiedJsCache.get(fullPath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.bytes;
  try {
    const source = new TextDecoder().decode(rawBytes);
    const result = await esbuildTransform(source, {
      minify: true,
      target: "es2020",       // browsers modernos (98%+). Mantém ES modules.
      format: "esm",
      sourcemap: false,
      legalComments: "none",  // remove license/JSDoc comments
      treeShaking: false,     // sem bundling — não tem como saber o uso real
    });
    const out = new TextEncoder().encode(result.code);
    _minifiedJsCache.set(fullPath, { mtimeMs, bytes: out });
    return out;
  } catch (err) {
    // Em caso de erro de parse, retorna original (evita derrubar o jogo).
    console.warn(`[server] minify falhou em ${path.basename(fullPath)}: ${err}`);
    return rawBytes;
  }
}

/**
 * Escolhe o melhor encoding suportado pelo client (br > gzip > identity).
 *
 * Honra q-values do header `Accept-Encoding` — `identity, br;q=0` recusa
 * brotli explicitamente, e um `includes("br")` ingênuo cairia nessa
 * armadilha enviando brotli pra cliente que recusou.
 *
 * @param {string|null} acceptEncoding - Valor cru do header `Accept-Encoding`
 *   (ou null se ausente).
 * @returns {"br"|"gzip"|null} Encoding escolhido ou null pra servir identity.
 */
function pickEncoding(acceptEncoding: string | null): "br" | "gzip" | null {
  if (!acceptEncoding) return null;
  const accepted = new Map<string, number>();
  for (const raw of acceptEncoding.toLowerCase().split(",")) {
    const parts = raw.trim().split(";");
    const token = parts[0].trim();
    if (!token) continue;
    let q = 1;
    for (let i = 1; i < parts.length; i++) {
      const p = parts[i].trim();
      if (p.startsWith("q=")) {
        const v = parseFloat(p.slice(2));
        if (!Number.isNaN(v)) q = v;
      }
    }
    accepted.set(token, q);
  }
  if ((accepted.get("br") ?? 0) > 0) return "br";
  if ((accepted.get("gzip") ?? 0) > 0) return "gzip";
  return null;
}

// serve apenas arquivos publicos daqui
const BASE_DIR = path.resolve(import.meta.dir, "public");
const BASE_PREFIX = BASE_DIR + path.sep;

// allowlist do que pode ser servido
const ALLOWED_TOP_FILES = new Set([
  "index.html",
  "style.css",
  "responsive.css",
  "manifest.json",
  "sw.js",
]);

// Build hash: computado UMA vez no boot do server, derivado de mtime+size
// de cada source file em public/. Injetado no CACHE_VERSION de sw.js a
// cada request — assim deploy em prod (= novo processo = potencialmente
// novo hash) invalida o cache do SW automaticamente, sem que ninguém
// precise editar sw.js. Em dev com --watch, cada save de arquivo gera
// novo hash, mas o register-sw.js NEM registra o SW em localhost, então
// não há reload chato.
const SW_BASENAME = "sw.js";
const SW_SOURCE_EXTS = new Set([
  ".js", ".css", ".html", ".mjs", ".json",
]);

/**
 * Computa um hash SHA-1 (10 chars hex) determinístico a partir de
 * todos os source files em `public/` cuja extensão está em
 * `SW_SOURCE_EXTS`. O hash entra como `CACHE_VERSION` no Service Worker
 * via `rewriteServiceWorker`.
 *
 * Inputs do hash por arquivo: `rel_path:size:mtime`. Sort por nome
 * garante mesmo hash em filesystems com ordens diferentes (Linux/Mac/Win).
 * Diretórios `node_modules` e dotfiles são pulados.
 *
 * Falhas de I/O em arquivos individuais são silenciosamente ignoradas
 * — o objetivo é "best-effort" stable signal, não auditoria.
 *
 * @returns {string} 10 chars hex (sha1 truncado).
 */
function _computeBuildHash(): string {
  const hasher = createHash("sha1");
  /**
   * Visita recursiva. Mantida inline em vez de helper top-level pra
   * fechar sobre `hasher` sem precisar passar adiante.
   */
  function walk(dir: string) {
    let entries: ReturnType<typeof readdirSync>;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    // sort por nome pra hash ser determinístico cross-platform
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // skip node_modules-like e pastas geradas (atlas já é asset binário)
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SW_SOURCE_EXTS.has(ext)) continue;
      try {
        const stat = statSync(full);
        // path relativo pra evitar leak da hierarquia local no hash
        const rel = path.relative(BASE_DIR, full);
        hasher.update(`${rel}:${stat.size}:${Math.floor(stat.mtimeMs)}\n`);
      } catch {}
    }
  }
  walk(BASE_DIR);
  return hasher.digest("hex").slice(0, 10);
}

const BUILD_HASH = _computeBuildHash();
console.log(`[server] build hash: farmxp-${BUILD_HASH}`);

/**
 * Reescreve o literal `const CACHE_VERSION = '...'` no source do sw.js
 * pelo hash do boot atual (`BUILD_HASH`). Aplicado em cada request a
 * `/sw.js` antes do minify/compress pipeline.
 *
 * Se o regex não bater (sw.js refatorado pra `let`, template literal,
 * comentário no meio etc.), retorna os bytes originais E loga um warn
 * — fail silent aqui significaria cache-busting morto em produção.
 *
 * @param {Uint8Array} bytes - Conteúdo bruto do sw.js lido do disco.
 * @returns {Uint8Array} Bytes possivelmente modificados (ou originais
 *   se o pattern não foi encontrado).
 */
function rewriteServiceWorker(bytes: Uint8Array): Uint8Array {
  const text = new TextDecoder().decode(bytes);
  const replaced = text.replace(
    /const CACHE_VERSION\s*=\s*['"][^'"]+['"]/,
    `const CACHE_VERSION = 'farmxp-${BUILD_HASH}'`,
  );
  if (replaced === text) {
    // Falha silenciosa aqui significa cache-busting do SW desativado em
    // PROD sem ninguém notar — todos pegariam asset velho indefinidamente.
    // Loga warn pra surfar regressão (ex: alguém refatorou sw.js pra usar
    // `let` ou template literal e o regex parou de bater).
    console.warn("[server] CACHE_VERSION pattern não encontrado em sw.js — cache-busting do SW desativado");
    return bytes;
  }
  return new TextEncoder().encode(replaced);
}

const ALLOWED_TOP_DIRS = new Set([
  "assets",
  "scripts",
  "style",
  "city_map",
]);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // connect-src adicionado pra permitir o SW fazer fetch() das fontes
  // do Google e cachear pra uso offline. Sem isso, CSP bloqueia o
  // request dentro do service worker e os nomes de NPC/player caíam
  // pro fallback de system font (visualmente "negrito") quando offline.
  "Content-Security-Policy":
    "default-src 'self'; " +
    "img-src 'self' data:; " +
    "style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
    "script-src 'self'; " +
    "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;",
};

type BodyLike = ConstructorParameters<typeof Response>[0];
function respond(body: BodyLike, status: number) {
  return new Response(body, {
    status,
    headers: SECURITY_HEADERS,
  });
}

function safeDecode(value: string) {
  try {
    let current = value;

    // decode recursivo com limite para evitar bypass por double-encoding
    for (let i = 0; i < 4; i++) {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    }

    return current;
  } catch {
    return null;
  }
}

function hasEncodedTraversal(rawLower: string) {
  // bloqueia traversal patterns em forma encoded, mista ou duplamente encoded
  return (
    rawLower.includes("%2e%2e") || // ..
    rawLower.includes("%2e.") ||   // mixed: %2e followed by literal .
    rawLower.includes(".%2e") ||   // mixed: literal . followed by %2e
    rawLower.includes("%252e") ||  // double-encoded %2e
    rawLower.includes("%252f") ||  // double-encoded %2f
    rawLower.includes("%255c") ||  // double-encoded %5c
    rawLower.includes("%2f") ||    // /
    rawLower.includes("%5c")       // \
  );
}
/**
 * Start the Bun HTTP server
 * Handles static file serving with directory access protection
 *
 * @security Blocks directory listing by rejecting paths ending with '/'
 * @security Path traversal protection implemented via safeDecode, hasEncodedTraversal, and normalizedRel checks
 */
serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const rawPath = url.pathname || "/";

    // usa o pathname cru pra detectar tentativa encoded
    const rawLower = rawPath.toLowerCase();

    // bloqueia tentativa encoded de traversal
    if (hasEncodedTraversal(rawLower)) {
      return respond("Forbidden", 403);
    }

    const decoded = safeDecode(rawPath);
    if (decoded === null) {
      return respond("Bad request", 400);
    }

    const normalized = decoded.replace(/\\/g, "/");
    const requestPath = normalized === "/" ? "/index.html" : normalized;

    // bloqueia null byte
    if (requestPath.includes("\0")) {
      return respond("Forbidden", 403);
    }

    // bloqueia diretorio com trailing slash
    if (requestPath.endsWith("/")) {
      return respond("Directory access not allowed", 403);
    }

    const rel = requestPath.replace(/^\/+/, "");
    const normalizedRel = path.posix.normalize(rel);
    if (normalizedRel.startsWith("..") || normalizedRel.includes("/..")) {
      return respond("Forbidden", 403);
    }

    // allowlist do primeiro segmento
    const first = normalizedRel.split("/")[0] || "";
    const isAllowed =
      ALLOWED_TOP_FILES.has(first) || ALLOWED_TOP_DIRS.has(first);

    if (!isAllowed) {
      return respond("Forbidden", 403);
    }

    if (ALLOWED_TOP_DIRS.has(normalizedRel)) {
      return respond("Directory access not allowed", 403);
    }

    // resolve e garante containment
    const fullPath = path.resolve(BASE_DIR, normalizedRel);
    if (!fullPath.startsWith(BASE_PREFIX)) {
      return respond("Forbidden", 403);
    }

    // bloqueia servir o proprio server.ts e qualquer coisa fora da allowlist
    if (path.basename(fullPath).toLowerCase() === "server.ts") {
      return respond("Forbidden", 403);
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Cache:
    //   - HTML: no-cache (sempre revalida, deploys novos refletem)
    //   - sw.js: no-cache TAMBÉM (crítico — se cachear o SW antigo, ele
    //     fica preso e o cache de assets nunca atualiza pro player)
    //   - Resto: max-age=3600 (1h) — o SW dele lida com cache long-term
    const basename = path.basename(fullPath).toLowerCase();

    // Hosts de desenvolvimento (localhost / loopback / LAN privada): NÃO
    // cacheia JS/CSS. Espelha o isDev do register-sw.js. Sem isso, o
    // max-age=3600 fazia o browser servir JS editado do cache por até 1h —
    // edições em dev só apareciam com hard-refresh manual. Em prod (host
    // externo) o cache longo continua valendo, com o Service Worker cuidando
    // do versionamento via BUILD_HASH.
    const reqHost = url.hostname;
    const isDevHost =
      reqHost === "localhost" ||
      reqHost === "127.0.0.1" ||
      reqHost === "::1" ||
      /^192\.168\./.test(reqHost) ||
      /^10\./.test(reqHost) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(reqHost);

    let cacheHeader: string;
    if (ext === ".html" || basename === "sw.js") {
      cacheHeader = "no-cache, must-revalidate";
    } else if (isDevHost && (ext === ".js" || ext === ".css")) {
      cacheHeader = "no-store";
    } else {
      cacheHeader = "public, max-age=3600";
    }

    // Pipeline texto: 1) ler bytes  2) minify (se .js)  3) comprimir.
    // Cache aplica nos passos 2 e 3 — primeira request por path paga
    // o custo, demais requests são instantâneas. mtimeMs é usado pra
    // invalidar entradas quando o arquivo muda no disco (deploys sem
    // restart, edição manual).
    if (COMPRESSIBLE_EXT.has(ext)) {
      const encoding = pickEncoding(req.headers.get("Accept-Encoding"));
      const file = Bun.file(fullPath);
      const mtimeMs = file.lastModified || 0;
      let rawBytes = new Uint8Array(await file.arrayBuffer());

      // sw.js: injetar o BUILD_HASH no CACHE_VERSION antes de qualquer
      // transformação. Isso faz o cache do Service Worker invalidar
      // automaticamente quando algo no public/ muda (= novo boot = novo
      // hash). Bypass do minify cache pra essa request via key próprio.
      if (basename === SW_BASENAME) {
        rawBytes = rewriteServiceWorker(rawBytes);
      }

      // Minify JS antes de comprimir (compressão de minified é melhor).
      if (ext === ".js") {
        // sw.js usa BUILD_HASH como parte da key — assim o cache de
        // minified bytes se renova quando o hash muda em prod.
        const cacheTag = basename === SW_BASENAME ? `${fullPath}#${BUILD_HASH}` : fullPath;
        rawBytes = await getMinifiedJs(cacheTag, rawBytes, mtimeMs);
      }

      if (encoding) {
        const cacheKey = `${encoding}|${ext === ".js" && MINIFY_JS ? "min|" : ""}${fullPath}`;
        const compressed = getCompressed(cacheKey, rawBytes, encoding, mtimeMs);
        return new Response(compressed, {
          headers: {
            ...SECURITY_HEADERS,
            "Content-Type": contentType,
            "Content-Encoding": encoding,
            "Vary": "Accept-Encoding",
            "Cache-Control": cacheHeader,
          },
        });
      }

      // Sem compressão suportada mas ainda assim aplica minify pra JS.
      if (ext === ".js" && MINIFY_JS) {
        return new Response(rawBytes, {
          headers: {
            ...SECURITY_HEADERS,
            "Content-Type": contentType,
            "Cache-Control": cacheHeader,
          },
        });
      }
    }

    return new Response(Bun.file(fullPath), {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": contentType,
        "Cache-Control": cacheHeader,
      },
    });
  },
});

console.log(`server running on http://localhost:${port}/?hitboxes=1&eatSlots=1&drinkSlots=1 `);
// for test of collsion, or adjust something: localhost:${port}/?hitboxes=1&eatSlots=1&drinkSlots=1 