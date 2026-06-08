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
      // A página foi carregada SOB controle de um SW remanescente? (ex: sessão
      // de teste de prod anterior). Se sim, os assets desta carga vieram do
      // cache dele (stale-while-revalidate) — então mesmo após limpar tudo, a
      // aba atual continua rodando código velho. Por isso, ao final da limpeza,
      // forçamos UM reload pra próxima carga vir limpa da rede.
      var wasControlled = !!navigator.serviceWorker.controller;

      // Limpa SW antigo + caches dele pra dev não ficar servindo lixo cacheado.
      var cleanup = [];
      cleanup.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(regs.map(function (r) { return r.unregister(); }));
        }).catch(function () {})
      );
      if (typeof caches !== 'undefined' && caches.keys) {
        cleanup.push(
          caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).catch(function () {})
        );
      }

      if (!wasControlled) {
        // Carga já veio limpa — libera o guard pra uma futura limpeza na mesma
        // sessão poder recarregar de novo se preciso.
        try { sessionStorage.removeItem('sw-dev-reloaded'); } catch (e) {}
      } else if (!sessionStorage.getItem('sw-dev-reloaded')) {
        // Estava controlada por SW velho: espera a limpeza terminar e recarrega
        // UMA vez. Guard de sessão evita loop de reload.
        Promise.all(cleanup).then(function () {
          try { sessionStorage.setItem('sw-dev-reloaded', '1'); } catch (e) {}
          window.location.reload();
        });
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

      // Checa por deploy novo a cada 60s. Num jogo single-page (canvas, sem
      // navegação) o browser NÃO dispara o update-check automático sozinho —
      // ele só checa em navegação e, no máximo, a cada 24h. Sem este poll, um
      // player numa sessão longa (ex: teste de horas via ngrok) só pegaria a
      // atualização ao recarregar na mão. Com ele, `reg.update()` força a
      // re-busca do sw.js; se o BUILD_HASH mudou (= server reiniciado com novo
      // código), o fluxo updatefound→SKIP_WAITING→controllerchange recarrega a
      // aba UMA vez na versão nova. Saves ficam no localStorage e persistem.
      setInterval(function () {
        reg.update().catch(function () {});
      }, 60000);

      // Também checa quando o jogador volta pra aba (retomou o teste depois de
      // sair) — pega o update na hora em vez de esperar o próximo tick.
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          reg.update().catch(function () {});
        }
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
