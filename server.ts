// server.ts - ADICIONE esta verificação
import { serve } from "bun";

const port = Number(process.env.PORT) || 3000;

serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === "/" ? "/index.html" : url.pathname;
    
    console.log(`📁 Servindo: ${path}`);

    // 🔥 IMPEDE acesso a diretórios
    if (path.endsWith('/')) {
      return new Response("Directory access not allowed", { status: 403 });
    }

    try {
      const file = Bun.file(`.${path}`);
      
      if (await file.exists()) {
        return new Response(file);
      } else {
        console.log(`❌ Arquivo não encontrado: ${path}`);
        return new Response("Not found", { status: 404 });
      }
    } catch (error) {
      console.error(`💥 Erro 500 em: ${path}`, error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
});
console.log(`🚀 Servidor rodando em http://localhost:${port}/`);