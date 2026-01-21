// server.ts - secure static server
import { serve } from "bun";
import * as path from "path";

const port = Number(process.env.PORT) || 3000;
const ROOT_DIR = path.resolve(process.cwd());
const ROOT_PREFIX = ROOT_DIR + path.sep;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    const rawUrlLower = req.url.toLowerCase();
    const pathnameRaw = url.pathname || "/";
    const pathnameDecoded = safeDecode(pathnameRaw);

    // detecta traversal (normal + encoded + backslash)
    if (
      rawUrlLower.includes("%2e%2e") ||
      rawUrlLower.includes("%5c") ||
      pathnameDecoded.includes("..") ||
      pathnameDecoded.includes("\\") ||
      pathnameDecoded.includes("\0")
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    const normalized = pathnameDecoded.replace(/\\/g, "/");
    const requestPath = normalized === "/" ? "/index.html" : normalized;

    if (requestPath.endsWith("/")) {
      return new Response("Directory access not allowed", { status: 403 });
    }

    const rel = requestPath.replace(/^\/+/, "");
    const fullPath = path.resolve(ROOT_DIR, rel);

    if (!fullPath.startsWith(ROOT_PREFIX)) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      const file = Bun.file(fullPath);
      if (!(await file.exists())) {
        return new Response("Not found", { status: 404 });
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";

      return new Response(file, {
        headers: {
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Content-Security-Policy": [
            "default-src 'self'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "font-src 'self' https://cdnjs.cloudflare.com data:",
            "img-src 'self' data: blob:",
            "connect-src 'self'",
          ].join("; "),
        },
      });
    } catch {
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});

console.log(`server running on http://localhost:${port}/`);
