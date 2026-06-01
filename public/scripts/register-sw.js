/**
 * @file register-sw.js - Registra o Service Worker do FarmingXP.
 *
 * Separado em arquivo dedicado (não inline) pra respeitar a CSP
 * `script-src 'self'`. Carregado com `defer` no index.html.
 *
 * O SW em si vive em `/sw.js` (raiz do scope público). Veja `public/sw.js`
 * pra estratégia de cache.
 *
 * Dev (localhost / 127.0.0.1 / LAN privada): SW NÃO é registrado. Motivo:
 * o auto-bump do CACHE_VERSION no server.ts vê cada save de arquivo como
 * "nova build", o que dispararia controllerchange + reload de aba a cada
 * salvada — chato durante desenvolvimento. Em prod (deploy real), boot
 * novo = hash novo = SW atualiza + tab reload uma única vez.
 *
 * Dev local também DESREGISTRA qualquer SW que tenha sobrado de um teste
 * anterior (ex: contribuinte testou prod local e deixou SW ativo).
 */

(function () {
  if (!('serviceWorker' in navigator)) return;

  var host = location.hostname;
  var isDev =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  window.addEventListener('load', function () {
    if (isDev) {
      // Limpa SW antigo + caches dele pra dev não ficar servindo lixo cacheado.
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        for (var i = 0; i < regs.length; i++) regs[i].unregister();
      }).catch(function () {});
      if (typeof caches !== 'undefined' && caches.keys) {
        caches.keys().then(function (keys) {
          for (var i = 0; i < keys.length; i++) caches.delete(keys[i]);
        }).catch(function () {});
      }
      return;
    }

    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      // Ativa imediatamente um SW que já estava esperando (de uma sessão
      // anterior, por exemplo). Sem isso, ficaria preso até que TODAS as
      // abas do jogo fechassem.
      if (reg.waiting) {
        reg.waiting.postMessage('SKIP_WAITING');
      }

      // Detecta deploy NOVO acontecendo durante esta sessão: o browser
      // dispara `updatefound` quando começa a baixar uma nova versão do
      // sw.js. Esperamos ele virar `installed` e mandamos SKIP_WAITING
      // pra ele tomar controle. Senão, o player nunca pega o update
      // sem fechar todas as abas.
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch(function (err) {
      console.warn('[SW] register failed:', err);
    });

    // Quando o SW novo assume controle, recarrega a página pra pegar
    // o HTML/assets servidos pela nova versão. Guard pra não recarregar
    // em loop: só uma vez por sessão.
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
})();
