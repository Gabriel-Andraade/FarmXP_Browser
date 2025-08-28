import { serve } from "bun";

serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;

    try {
      const file = Bun.file(`.${path}`);
      return new Response(file);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  },
});

console.log("Servidor rodando em http://localhost:3000");
