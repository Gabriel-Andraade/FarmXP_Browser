/**
 * @file app.ts - Entrypoint do executável do jogo.
 *
 * Sobe o server local (reaproveita `server.ts`) numa porta fixa e abre o jogo
 * numa JANELA de app do Chrome/Edge instalado (`--app`), rodando offline. Ao
 * fechar a janela, o server é derrubado e o processo encerra.
 *
 * Empacota com: `bun run build:win` / `bun run build:linux` — o public/ é
 * embutido no binário (single-file), então nada precisa ficar ao lado do .exe.
 */

import { startServer } from "./server.ts";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Porta FIXA: os saves ficam no localStorage do Chrome, que é por ORIGEM
// (http://localhost:<porta>). Porta aleatória mudaria a origem a cada run e os
// saves "sumiriam". Uma porta alta e incomum evita conflito na prática.
const APP_PORT = 43110;

/** Perfil do Chrome PERSISTENTE por usuário — sem isso o localStorage (= saves)
 *  é zerado a cada abertura. Fica no app-data do SO. */
function stableProfileDir(): string {
  const base =
    process.env.LOCALAPPDATA ||               // Windows
    process.env.XDG_DATA_HOME ||              // Linux
    join(homedir(), ".local", "share");       // fallback Linux/macOS
  const dir = join(base, "FarmingXP", "chrome-profile");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Acha um Chromium instalado (Chrome/Edge no Windows, chromium no Linux/macOS). */
function findChromium(): string | undefined {
  const candidates = [
    process.env.BUN_CHROME_PATH,
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean) as string[];
  return candidates.find((p) => existsSync(p));
}

const chrome = findChromium();
if (!chrome) {
  console.error(
    "[app] Nenhum navegador Chromium encontrado.\n" +
      "      Instale o Google Chrome (ou Chromium/Edge) e tente novamente.",
  );
  process.exit(1);
}

// Server local em porta FIXA (origem estável p/ os saves), SEM minify,
// preso em 127.0.0.1 (não expõe o jogo pra outras máquinas da rede).
let server;
try {
  server = startServer({ port: APP_PORT, minify: false, hostname: "127.0.0.1" });
} catch (err) {
  console.error(
    `[app] Não consegui subir o servidor na porta ${APP_PORT} — o jogo já está aberto?`,
    err,
  );
  process.exit(1);
}
const url = `http://localhost:${server.port}/`;
console.log("[app] Farming XP rodando em", url);

// Perfil PERSISTENTE (mantém os saves entre aberturas).
const profile = stableProfileDir();
console.log("[app] perfil:", profile);

const proc = Bun.spawn(
  [
    chrome,
    `--app=${url}`,
    "--window-size=1000,820",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
  ],
  { stdout: "inherit", stderr: "inherit" },
);

console.log("[app] Janela aberta (PID " + proc.pid + "). Feche a janela pra sair.");

// Mantém o processo vivo até a janela fechar; então derruba o server e sai.
await proc.exited;
server.stop(true);
console.log("[app] Encerrado.");
process.exit(0);
