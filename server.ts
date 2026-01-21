//secure static server
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

serve({
  port,
  async fetch(req) {
  const url = new URL(req.url);

const rawReqUrl = req.url.toLowerCase();
if (rawReqUrl.includes("%2e%2e") || rawReqUrl.includes("%2f") || rawReqUrl.includes("%5c")) {
  return new Response("Forbidden", { status: 403 });
}

const rawPathname = (url.pathname || "/");
const rawLower = rawPathname.toLowerCase();

if (rawLower.includes("..")) {
  return new Response("Forbidden", { status: 403 });
}


  const rawPath = rawPathname.replace(/\\/g, "/");
  const requestPath = rawPath === "/" ? "/index.html" : rawPath;

  if (requestPath.endsWith("/")) {
    return new Response("Directory access not allowed", { status: 403 });
  }

  const rel = requestPath.replace(/^\/+/, "");
  const fullPath = path.resolve(ROOT_DIR, rel);
  const rootPrefix = ROOT_DIR + path.sep;

  if (!fullPath.startsWith(rootPrefix)) {
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
        "X-XSS-Protection": "1; mode=block",
      },
    });
  } catch {
    return new Response("Internal Server Error", { status: 500 });
  }
}

});

console.log(`server running on http://localhost:${port}/`);
