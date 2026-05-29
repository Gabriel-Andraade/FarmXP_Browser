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
      // Detecta SW novo disponível (deploy aconteceu) — pra futuro,
      // pode mostrar toast "atualizar agora" pro player.
      if (reg.waiting) {
        // SW novo já está esperando, pode ativar agora se quiser
        // (descomentar pra forçar update imediato):
        // reg.waiting.postMessage('SKIP_WAITING');
      }
    }).catch(function (err) {
      console.warn('[SW] register failed:', err);
    });
  });
}
