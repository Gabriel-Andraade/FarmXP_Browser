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

/**
 * Server port number
 * Uses PORT environment variable or defaults to 3000
 * @type {number}
 */
const port = Number(process.env.PORT) || 3000;

// serve apenas arquivos publicos daqui
const BASE_DIR = path.resolve(import.meta.dir, "public");
const BASE_PREFIX = BASE_DIR + path.sep;

// allowlist do que pode ser servido
const ALLOWED_TOP_FILES = new Set([
  "index.html",
  "style.css",
  "responsive.css",
  "favicon.ico",
]);

const ALLOWED_TOP_DIRS = new Set([
  "assets",
  "scripts",
  "style",
  "sounds",
]);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  // ajuste a CSP conforme seu app (se usar cdn/inline, libere aqui)
  // "Content-Security-Policy": "default-src 'self'",
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
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function hasEncodedTraversal(rawLower: string) {
  // bloqueia ../ e ..\ em forma encoded
  return (
    rawLower.includes("%2e%2e") || // ..
    rawLower.includes("%2f") ||    // /
    rawLower.includes("%5c")       // \
  );
}

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const rawPath = url.pathname || "/";

    // usa a url crua pra detectar tentativa encoded
    const rawLower = req.url.toLowerCase();

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

    return new Response(Bun.file(fullPath), {
      headers: {
        ...SECURITY_HEADERS,
        "Content-Type": contentType,
      },
    });
  },
});

console.log(`server running on http://localhost:${port}/`);
