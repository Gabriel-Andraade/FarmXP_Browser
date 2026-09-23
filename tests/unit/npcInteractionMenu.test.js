import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

const systems = {};

mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: (name) => systems[name] || null,
  registerSystem: () => {},
}));

mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key) => key,
  i18n: { t: (key) => key },
}));

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

const { openNpcMenu } = await import('../../public/scripts/npcs/npcInteractionMenu.js');

/** Diálogo falso que guarda o config e deixa simular a escolha. */
function fakeDialogue() {
  const dlg = {
    config: null,
    start(config) { dlg.config = config; },
    /** Escolhe pelo texto e encerra, como o dialogueSystem faz com `end: true`. */
    choose(text) {
      const opt = dlg.config.lines[0].options.find((o) => o.text === text);
      if (!opt) throw new Error(`opção não encontrada: ${text}`);
      opt.onSelect?.();
      dlg.config.onEnd?.();
    },
    labels: () => dlg.config.lines[0].options.map((o) => o.text),
  };
  return dlg;
}

beforeEach(() => {
  for (const key of Object.keys(systems)) delete systems[key];
});

describe('menu de interação do NPC', () => {
  test('sempre oferece Interagir e Sair', () => {
    const dlg = fakeDialogue();
    systems.dialogue = dlg;

    openNpcMenu({ id: 'john', name: 'John', onInteract: () => {} });

    expect(dlg.labels()).toEqual(['npc.menu.interact', 'npc.menu.leave']);
  });

  // A ação roda no onEnd, não no onSelect: começar outro diálogo enquanto o
  // menu ainda fecha faria os dois brigarem pela mesma overlay.
  test('só dispara a interação DEPOIS que o menu fecha', () => {
    const dlg = fakeDialogue();
    systems.dialogue = dlg;

    const ordem = [];
    openNpcMenu({ id: 'john', name: 'John', onInteract: () => ordem.push('interagiu') });

    const opt = dlg.config.lines[0].options[0];
    opt.onSelect();
    expect(ordem).toEqual([]);      // escolheu, mas o menu ainda não fechou

    dlg.config.onEnd();
    expect(ordem).toEqual(['interagiu']);
  });

  test('Sair não dispara nada', () => {
    const dlg = fakeDialogue();
    systems.dialogue = dlg;

    let chamou = false;
    openNpcMenu({ id: 'john', name: 'John', onInteract: () => { chamou = true; } });
    dlg.choose('npc.menu.leave');

    expect(chamou).toBe(false);
  });

  // O gancho que sustenta loja, entrega e "cadê o John?" sem tocar no módulo.
  test('opções declaradas pelo NPC entram no menu', () => {
    const dlg = fakeDialogue();
    systems.dialogue = dlg;

    let comprou = false;
    openNpcMenu({
      id: 'thomas', name: 'Thomas', onInteract: () => {},
      menuOptions: [{ textKey: 'npc.menu.shop', onSelect: () => { comprou = true; } }],
    });

    expect(dlg.labels()).toEqual(['npc.menu.interact', 'npc.menu.shop', 'npc.menu.leave']);

    dlg.choose('npc.menu.shop');
    expect(comprou).toBe(true);
  });

  test('opção indisponível não aparece', () => {
    const dlg = fakeDialogue();
    systems.dialogue = dlg;

    openNpcMenu({
      id: 'molly', name: 'Molly', onInteract: () => {},
      menuOptions: [
        { textKey: 'npc.menu.whereIsJohn', isAvailable: () => false, onSelect: () => {} },
      ],
    });

    expect(dlg.labels()).toEqual(['npc.menu.interact', 'npc.menu.leave']);
  });

  // Sem o sistema de diálogo (boot, teste), interagir não pode virar no-op.
  test('sem dialogueSystem, cai no comportamento antigo', () => {
    let chamou = false;
    const aberto = openNpcMenu({ id: 'john', name: 'John', onInteract: () => { chamou = true; } });

    expect(aberto).toBe(false);
    expect(chamou).toBe(true);
  });
});
