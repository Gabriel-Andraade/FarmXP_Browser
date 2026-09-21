/**
 * @file steamBadge.js - Ponte entre o jogo, o shell (tools/cef) e a Steam.
 *
 * Tres coisas, em ordem de importancia:
 *   1. Eventos do shell -> eventos do jogo (overlay pausa/retoma, suspender
 *      salva). Registrados sempre, com ou sem Steam: o shell dispara
 *      `system:suspend` mesmo fora da Steam.
 *   2. Conquistas do jogo espelhadas na Steam (1:1 pelo id).
 *   3. Nick da Steam num canto + comandos `__debug.steam.*` no console.
 *
 * Degrada em silencio: sem a rota (versao web) ou com a Steam fechada, so o
 * item 1 fica ativo e o jogo segue normal.
 */
(async () => {
    // Eventos que o SHELL (cefclient) dispara no window, vindos da Steam e do
    // sistema. O shell nao sabe nada do jogo; a traducao e aqui.
    //   steam:overlay  {active}  -> pausa/retoma (o jogo ja tem game:pause/resume)
    //   system:suspend           -> salva antes de o PC dormir
    let pausadoPelaOverlay = false;
    window.addEventListener('steam:overlay', (e) => {
        const ativa = !!e.detail?.active;
        if (ativa && !pausadoPelaOverlay) {
            pausadoPelaOverlay = true;
            document.dispatchEvent(new CustomEvent('game:pause'));
        } else if (!ativa && pausadoPelaOverlay) {
            pausadoPelaOverlay = false;
            document.dispatchEvent(new CustomEvent('game:resume'));
        }
    });
    // Perder o foco (Alt+Tab, minimizar) NAO pausa, de proposito: deixar a
    // plantacao crescendo enquanto faz outra coisa e parte do jogo. So a
    // overlay da Steam (acima) e o Esc (menu de pausa) pausam.

    window.addEventListener('system:suspend', () => {
        import('./gameState.js')
            .then(({ getSystem }) => getSystem('save')?.saveActive?.('suspend'))
            .then(() => console.info('[steam] salvo antes de suspender'))
            .catch(() => {});
    });

    const json = (url, body) => fetch(url, body
        ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : { cache: 'no-store' }).then((r) => r.json());

    let dados;
    try {
        const res = await fetch('/steam/status', { cache: 'no-store' });
        if (!res.ok) return;
        dados = await res.json();
    } catch {
        return; // versao web: a rota nao existe
    }

    if (!dados?.connected) {
        console.info('[steam] nao conectado:', dados?.error ?? 'motivo desconhecido');
        return;
    }

    console.info(`[steam] ${dados.name} (${dados.steamId}) appId=${dados.appId}`);

    // Espelha as conquistas do jogo na Steam. O id do achievementTracker e o
    // API name na Steam (1:1, sem mapeamento) - basta cadastrar no Steamworks
    // com o mesmo id. Falha em silencio: a conquista do jogo ja foi dada.
    document.addEventListener('achievement:unlocked', (e) => {
        const id = e.detail?.achievementId;
        if (!id) return;
        json('/steam/achievement', { name: id, achieved: true })
            .then((r) => console.info(`[steam] conquista "${id}" -> ${r.ok ? 'enviada' + (r.demoAs ? ` (demo como ${r.demoAs})` : '') : 'recusada: ' + r.error}`))
            .catch(() => {});
    });

    const badge = document.createElement('div');
    badge.textContent = `Steam: ${dados.name}`;
    badge.title = `SteamID ${dados.steamId} · AppID ${dados.appId}`;
    Object.assign(badge.style, {
        position: 'fixed',
        right: '10px',
        bottom: '10px',
        zIndex: '99999',
        padding: '4px 10px',
        borderRadius: '6px',
        background: 'rgba(23, 26, 33, 0.88)',
        color: '#c7d5e0',
        font: '12px system-ui, sans-serif',
        pointerEvents: 'none',
        userSelect: 'none',
    });
    document.body.appendChild(badge);

    // Comandos de teste no console (F12). Nada disso e chamado pelo jogo.
    //   __debug.steam.list()                    -> conquistas que o App ID conhece
    //   __debug.steam.unlock('ACH_WIN_ONE_GAME') -> destrava (pop-up da Steam)
    //   __debug.steam.clear('ACH_WIN_ONE_GAME')  -> limpa, pra repetir o teste
    window.__debug = window.__debug || {};
    window.__debug.steam = {
        status: () => json('/steam/status'),
        list: () => json('/steam/achievements'),
        unlock: (name) => json('/steam/achievement', { name, achieved: true }),
        clear: (name) => json('/steam/achievement', { name, achieved: false }),
        // overlay(): o que a Steam diz sobre a overlay neste processo.
        // overlay(true): tenta ABRIR a overlay por API, sem Shift+Tab.
        overlay: (abrir = false) => abrir
            ? fetch('/steam/overlay', { method: 'POST' }).then((r) => r.json())
            : json('/steam/overlay'),
    };
})();
