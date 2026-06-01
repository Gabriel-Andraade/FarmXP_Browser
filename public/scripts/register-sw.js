/**
 * @file register-sw.js - Registra o Service Worker do FarmingXP.
 *
 * Separado em arquivo dedicado (não inline) pra respeitar a CSP
 * `script-src 'self'`. Carregado com `defer` no index.html.
 *
 * O SW em si vive em `/sw.js` (raiz do scope público). Veja `public/sw.js`
 * pra estratégia de cache.
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
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
}
