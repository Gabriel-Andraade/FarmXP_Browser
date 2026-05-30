/**
 * @file sw.js - Service Worker do FarmingXP.
 *
 * Estratégia:
 *   - HTML (documento): Network First (sempre tenta puxar fresco — assim
 *     deploys novos refletem na hora). Fallback pro cache quando offline.
 *   - JS, CSS, imagens, fontes, áudio: Cache First com Stale-While-Revalidate.
 *     Resposta servida do cache na hora; em paralelo, fetch atualiza o
 *     cache pra próxima visita. Resultado: segunda visita do jogador é
 *     INSTANTÂNEA mesmo offline.
 *   - Requisições non-GET ou cross-origin: bypass total.
 *
 * Versionamento: bumpa `CACHE_VERSION` quando quiser forçar reload do
 * cache inteiro (ex: mudança de protocolo, breaking change). Caches
 * antigos são apagados no evento `activate`.
 */

// Fallback estático — em prod via server.ts, o build hash dinâmico substitui
// este literal a cada boot. Se você está editando manualmente, prefira deixar
// o auto-bump fazer o trabalho. Útil só como fallback se o sw.js for servido
// por um host estático sem o rewrite do server (ex: GitHub Pages).
const CACHE_VERSION = 'farmxp-static';
const HTML_CACHE = `${CACHE_VERSION}-html`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

/** URLs mínimas pre-cacheadas no install pra primeiro paint funcionar
 *  offline imediatamente. Tudo mais cacheia on-the-fly conforme o jogo
 *  pede. Mantém install rápido (não baixa 8MB de uma vez). */
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(HTML_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Cross-origin que VALE A PENA cachear (fontes do Google que o jogo usa).
// Sem isso, offline cai no system font default — renderiza mais "encorpado"
// e nomes de NPC/player ficavam parecendo negrito.
const CACHEABLE_CROSS_ORIGINS = new Set([
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
]);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const cacheableCrossOrigin = CACHEABLE_CROSS_ORIGINS.has(url.origin);

  if (!sameOrigin && !cacheableCrossOrigin) return;  // skip outros cross-origin

  // HTML / navegação: Network First → fallback cache (mantém deploys frescos)
  if (sameOrigin && (req.mode === 'navigate' || req.destination === 'document')) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  // Tudo mais (JS, CSS, imagens, áudio, fontes): Cache First com revalidação
  event.respondWith(staleWhileRevalidate(req, ASSET_CACHE));
});

/**
 * Network First: tenta rede; se falhar (offline / 5xx), serve do cache.
 * Resposta de rede sucedida atualiza o cache pra fallback futuro.
 */
async function networkFirst(request, cacheName) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (e) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback final: offline.html ou 503 simples
    return new Response('<h1>Offline</h1><p>Sem conexão e sem cache.</p>', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * Stale While Revalidate: retorna o cached IMEDIATAMENTE. Em paralelo,
 * dispara um fetch e atualiza o cache. Próxima request pega a versão
 * nova. Ideal pra assets — UX rápida, sem ficar desatualizado por muito tempo.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then((res) => {
    // res.ok === true pra 2xx. PORÉM cross-origin sem CORS retorna
    // "opaque response" (type === 'opaque', ok === false, status 0).
    // Fontes do Google se encaixam aqui — cacheamos mesmo assim pra
    // funcionar offline (downside: não podemos verificar se foi 200,
    // mas no caso de fontes vale o risco).
    const isCacheable = res && (res.ok || res.type === 'opaque');
    if (isCacheable) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => null);

  // Tem cache → serve já, deixa o fetch rolando em background.
  if (cached) return cached;

  // Sem cache → espera a rede.
  const fresh = await networkPromise;
  if (fresh) return fresh;

  return new Response('Not available offline', { status: 504 });
}

// Permite forçar update do SW via postMessage do client
// (futuro: botão "atualizar" em settings).
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
