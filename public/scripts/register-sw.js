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
 * novo = hash novo = o SW novo fica em "waiting" e mostra um prompt
 * "nova versão disponível"; o jogador escolhe quando recarregar (#225).
 *
 * Dev local também DESREGISTRA qualquer SW que tenha sobrado de um teste
 * anterior (ex: contribuinte testou prod local e deixou SW ativo).
 */

(function () {
  if (!('serviceWorker' in navigator)) return;

  // In-page "update available" prompt (#225). Self-contained so it works
  // regardless of the game's module state. The player decides when to reload,
  // so an update pushed mid-session never interrupts play; localStorage saves
  // are untouched by the reload.
  function showUpdatePrompt(worker) {
    if (!worker) return;
    // Banner already up: just point it at the newest waiting worker. A second
    // update supersedes the first, so the click must target the current one.
    var existing = document.getElementById('sw-update-banner');
    if (existing) {
      existing._swWorker = worker;
      return;
    }

    var lang = 'en';
    try { lang = localStorage.getItem('farmxp_language') || 'en'; } catch (e) {}
    var STRINGS = {
      'pt-BR': { msg: 'Nova versão disponível.', reload: 'Atualizar', later: 'Depois' },
      'en':    { msg: 'A new version is available.', reload: 'Reload', later: 'Later' },
      'es':    { msg: 'Hay una nueva versión disponible.', reload: 'Actualizar', later: 'Después' },
    };
    var s = STRINGS[lang] || STRINGS.en;

    var banner = document.createElement('div');
    banner.id = 'sw-update-banner';
    banner.className = 'sw-update-banner';
    banner.setAttribute('role', 'status');
    banner._swWorker = worker;

    var msg = document.createElement('span');
    msg.className = 'sw-update-msg';
    msg.textContent = s.msg;

    var reloadBtn = document.createElement('button');
    reloadBtn.className = 'sw-update-btn sw-update-reload';
    reloadBtn.textContent = s.reload;
    reloadBtn.addEventListener('click', function () {
      reloadBtn.disabled = true;
      // Read the live reference so a later update (which superseded `worker`)
      // is the one that takes over → controllerchange → reload.
      banner._swWorker.postMessage('SKIP_WAITING');
    });

    var laterBtn = document.createElement('button');
    laterBtn.className = 'sw-update-btn sw-update-later';
    laterBtn.textContent = s.later;
    laterBtn.addEventListener('click', function () { banner.remove(); });

    banner.append(msg, reloadBtn, laterBtn);
    document.body.appendChild(banner);
  }

  // location.hostname returns "[::1]" (with brackets) for IPv6 loopback;
  // strip them so the "::1" check below matches.
  var host = location.hostname.replace(/^\[|\]$/g, '');
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

      // Read the guard defensively — sessionStorage can throw SecurityError in
      // sandboxed/storage-restricted contexts, which would abort this handler
      // before the one-time reload runs.
      var alreadyReloaded = false;
      try { alreadyReloaded = !!sessionStorage.getItem('sw-dev-reloaded'); } catch (e) {}

      if (!wasControlled) {
        // Carga já veio limpa — libera o guard pra uma futura limpeza na mesma
        // sessão poder recarregar de novo se preciso.
        try { sessionStorage.removeItem('sw-dev-reloaded'); } catch (e) {}
      } else if (!alreadyReloaded) {
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
      // Um SW já esperando (update de uma sessão anterior): mostra o prompt
      // em vez de ativar sozinho — quem decide recarregar é o jogador.
      if (reg.waiting) {
        showUpdatePrompt(reg.waiting);
      }

      // Deploy NOVO durante esta sessão: o browser dispara `updatefound` ao
      // baixar uma versão nova do sw.js. Quando ela vira `installed` (e já há
      // um controller = é update, não primeira instalação), avisa o jogador.
      reg.addEventListener('updatefound', function () {
        var newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', function () {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(newWorker);
          }
        });
      });

      // Checa por deploy novo a cada 60s. Num jogo single-page (canvas, sem
      // navegação) o browser NÃO dispara o update-check automático sozinho —
      // ele só checa em navegação e, no máximo, a cada 24h. Sem este poll, um
      // player numa sessão longa (ex: teste de horas via ngrok) só pegaria a
      // atualização ao recarregar na mão. Com ele, `reg.update()` força a
      // re-busca do sw.js; se o BUILD_HASH mudou (= server reiniciado com novo
      // código), o fluxo updatefound→prompt→(jogador aceita)→SKIP_WAITING→
      // controllerchange recarrega a aba na versão nova. Saves persistem.
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
