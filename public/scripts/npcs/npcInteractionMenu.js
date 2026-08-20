/**
 * @file npcInteractionMenu.js - Menu que abre ao interagir com qualquer NPC.
 * @description Toda interação com NPC passa por aqui primeiro. O menu aparece
 * SEMPRE, mesmo quando só há "Interagir" e "Sair" — a consistência é o ponto:
 * o jogador aprende que NPC abre menu, e quando um vendedor tiver "Comprar" ou
 * um familiar tiver "Cadê o John?", a opção nova cai num lugar que ele já
 * conhece, em vez de mudar a gramática de interação no meio do jogo.
 *
 * É construído em cima do `dialogueSystem` (uma linha do tipo `choice`), então
 * herda de graça o visual, o i18n, o input e a pausa do jogo — nenhuma UI nova.
 *
 * NPCs podem acrescentar opções sem tocar neste arquivo, declarando
 * `menuOptions` na definição:
 *
 *   menuOptions: [
 *     { textKey: 'npc.menu.whereIsJohn', isAvailable: () => johnEstaFora(),
 *       onSelect: () => dlg.start(buildWhereIsJohn()) },
 *   ]
 *
 * @module NpcInteractionMenu
 */

import { getSystem } from '../gameState.js';
import { t } from '../i18n/i18n.js';
import { logger } from '../logger.js';

/**
 * Monta as opções do menu para um NPC.
 *
 * "Interagir" (e não "Conversar") porque a maioria das cenas começa com o NPC
 * falando, não com o player — e a mesma opção serve pra entrega e loja depois.
 *
 * @param {Object} npc
 * @param {{run: Function|null}} pending - ação a executar depois que o menu fechar
 * @returns {Array<Object>} opções no formato do dialogueSystem
 */
function buildOptions(npc, pending) {
    const options = [];

    if (typeof npc.onInteract === 'function') {
        options.push({
            text: t('npc.menu.interact'),
            end: true,
            onSelect: () => { pending.run = () => npc.onInteract(npc); },
        });
    }

    // Opções declaradas pelo próprio NPC (loja, perguntas, entregas...).
    for (const extra of npc.menuOptions || []) {
        if (typeof extra?.onSelect !== 'function') continue;
        if (typeof extra.isAvailable === 'function' && !extra.isAvailable(npc)) continue;

        options.push({
            text: extra.textKey ? t(extra.textKey) : (extra.text || ''),
            end: true,
            onSelect: () => { pending.run = () => extra.onSelect(npc); },
        });
    }

    options.push({
        text: t('npc.menu.leave'),
        end: true,
        onSelect: () => { pending.run = null; },
    });

    return options;
}

/**
 * Abre o menu de interação do NPC.
 *
 * A ação escolhida roda no `onEnd`, e não no `onSelect`: começar outro diálogo
 * enquanto o menu ainda está fechando faria os dois brigarem pela mesma
 * overlay. Esperar o menu terminar resolve sem timer nem gambiarra.
 *
 * @param {Object} npc
 * @returns {boolean} true se o menu abriu
 */
export function openNpcMenu(npc) {
    const dlg = getSystem('dialogue');
    if (!dlg?.start) {
        // Sem sistema de diálogo, cai no comportamento antigo.
        npc?.onInteract?.(npc);
        return false;
    }

    const pending = { run: null };
    const options = buildOptions(npc, pending);

    dlg.start({
        right: { name: npc.name || '', portrait: npc.portrait || '' },
        lines: [{ side: 'right', text: '', type: 'choice', options }],
        onEnd: () => {
            const action = pending.run;
            pending.run = null;
            try {
                action?.();
            } catch (err) {
                logger.error?.(`[npcMenu] falha na ação de ${npc.id}:`, err);
            }
        },
    });

    return true;
}

export default { openNpcMenu };
