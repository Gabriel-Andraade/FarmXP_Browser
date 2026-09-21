/**
 * @file serve.ts - Entrypoint do servidor do jogo pro pacote da Steam.
 *
 * Só sobe o server.ts (assets embutidos, porta fixa, só loopback). Quem abre a
 * janela é o shell (tools/cef): ele lança este exe, espera a porta responder e
 * derruba ao sair. Diferente do app.ts, não procura navegador nenhum.
 *
 * Empacota com: `bun run build:server` → dist-steam/farmxp-server.exe
 */
import { startServer } from "./server.ts";

const port = Number(process.env.PORT) || 43110;
try {
  const s = startServer({ port, minify: false, hostname: "127.0.0.1" });
  console.log(`[farmxp-server] http://127.0.0.1:${s.port}/`);
} catch (err) {
  console.error(`[farmxp-server] porta ${port} em uso?`, err);
  process.exit(1);
}
