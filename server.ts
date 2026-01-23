import { serve } from "bun";
import * as path from "path";
import { statSync } from "fs";

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
  fetch(req) {
    const url = new URL(req.url);
    const rawPath = url.pathname || "/";
    const rawLower = rawPath.toLowerCase();

    // bloqueia tentativa encoded de traversal
    if (hasEncodedTraversal(rawLower)) {
      return new Response("Forbidden", { status: 403 });
    }

    const decoded = safeDecode(rawPath);
    if (decoded === null) {
      return new Response("Bad request", { status: 400 });
    }

    const normalized = decoded.replace(/\\/g, "/");
    const requestPath = normalized === "/" ? "/index.html" : normalized;

    // bloqueia null byte
    if (requestPath.includes("\0")) {
      return new Response("Forbidden", { status: 403 });
    }

    // bloqueia diretorio com trailing slash
    if (requestPath.endsWith("/")) {
      return new Response("Directory access not allowed", { status: 403 });
    }

    const rel = requestPath.replace(/^\/+/, "");
    const normalizedRel = path.posix.normalize(rel);
    if (normalizedRel.startsWith("..") || normalizedRel.includes("/..")) {
      return new Response("Forbidden", { status: 403 });
    }

    // allowlist do primeiro segmento
    const first = normalizedRel.split("/")[0] || "";
    const isAllowed =
      ALLOWED_TOP_FILES.has(first) || ALLOWED_TOP_DIRS.has(first);

    if (!isAllowed) {
      return new Response("Forbidden", { status: 403 });
    }

    // resolve e garante containment
    const fullPath = path.resolve(BASE_DIR, normalizedRel);
    if (!fullPath.startsWith(BASE_PREFIX)) {
      return new Response("Forbidden", { status: 403 });
    }

    // verifica se arquivo existe e bloqueia diretorios
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      return new Response("Not Found", { status: 404 });
    }
    if (stat.isDirectory()) {
      return new Response("Directory access not allowed", { status: 403 });
    }

    // bloqueia servir o proprio server.ts e qualquer coisa fora da allowlist
    if (path.basename(fullPath).toLowerCase() === "server.ts") {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(Bun.file(fullPath));
  },
});

console.log(`server running on http://localhost:${port}/`);