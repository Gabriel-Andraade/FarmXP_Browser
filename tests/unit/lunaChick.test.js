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

mock.module('../../public/scripts/npcs/personalitySystem.js', () => ({
  personalitySystem: { score: () => {} },
}));

/** Preços reais dos itens de filhote (item.js). */
const PRECOS = { 300: 50, 301: 120, 302: 150 };

mock.module('../../public/scripts/itemUtils.js', () => ({
  getItem: (id) => (PRECOS[id] ? { id, price: PRECOS[id] } : null),
}));

mock.module('../../public/scripts/quests/family/dialogueHelpers.js', () => ({
  PORTRAITS: { john: 'j', molly: 'm', luna: 'l' },
  getPlayerName: () => 'Stella',
  getPlayerDialogPortrait: () => 'p',
  makeSpeakerSwap: () => () => {},
  pickByCharacter: (base, prefix) => `${base}.${prefix}Stella`,
  resolveDialogueLabels: (config) => config,
}));

const { lunaChickQuest, PET_CHOICES } = await import('../../public/scripts/quests/family/lunaChick.js');

/** Inventário falso com contagem por item. */
function fakeInventory(qty = {}) {
  return {
    qty,
    getItemQuantity: (id) => qty[id] ?? 0,
    removeItem: (id, n) => { qty[id] = (qty[id] ?? 0) - n; return true; },
  };
}

beforeEach(() => {
  for (const key of Object.keys(systems)) delete systems[key];
  lunaChickQuest.reset();
});

describe('lunaChick — filhote em mãos', () => {
  test('o item de cada filhote existe e é distinto', () => {
    const ids = Object.values(PET_CHOICES).map((p) => p.itemId);
    expect(ids).toEqual([300, 301, 302]);
  });

  test('onPetCollected só avança a partir de waiting_birth', () => {
    expect(lunaChickQuest.onPetCollected()).toBe(false); // estado idle

    lunaChickQuest.setState({ state: 'waiting_birth', pet: 'chick' });
    expect(lunaChickQuest.onPetCollected()).toBe(true);
    expect(lunaChickQuest.getState().state).toBe('carrying');
    expect(lunaChickQuest.isCarrying()).toBe(true);
  });

  // Sem esta guarda, quem vendesse o filhote abriria a cena de entrega e a
  // quest fecharia sem o bichinho — presenteando a Luna com nada.
  test('a cena de entrega NÃO abre sem o filhote no inventário', () => {
    lunaChickQuest.setState({ state: 'carrying', pet: 'chick' });
    systems.inventory = fakeInventory({ 300: 0 });

    expect(lunaChickQuest.canStartScene3()).toBe(false);
  });

  test('a cena de entrega abre com o filhote em mãos', () => {
    lunaChickQuest.setState({ state: 'carrying', pet: 'chick' });
    systems.inventory = fakeInventory({ 300: 1 });

    expect(lunaChickQuest.canStartScene3()).toBe(true);
  });

  test('o objetivo muda de "levar" pra "entregar"', () => {
    lunaChickQuest.setState({ state: 'waiting_birth', pet: 'chick' });
    const esperando = lunaChickQuest.getObjective();

    lunaChickQuest.setState({ state: 'carrying', pet: 'chick' });
    const carregando = lunaChickQuest.getObjective();

    expect(esperando).not.toBe(carregando);
    expect(carregando).toContain('objectiveDeliver');
  });

  /** Entrega o filhote pelo caminho pedido e devolve a recompensa paga. */
  function entregar(petId, rota = 'molly') {
    const itemId = PET_CHOICES[petId].itemId;
    lunaChickQuest.setState({ state: 'carrying', pet: petId, route: rota });
    systems.inventory = fakeInventory({ [itemId]: 1 });

    let pago = null;
    systems.questRegistry = { complete: (_id, opts) => { pago = opts?.extraRewards; } };

    const scene = lunaChickQuest.buildScene3();
    scene.lines.find((l) => typeof l.action === 'function' && l.text.includes('dLunaThanks')).action();
    return pago;
  }

  // Entregando pela frente o John paga pelo animal; na entrega furtiva não há
  // negócio nenhum — mas o XP vem igual, porque não é pagamento, é experiência.
  test('a entrega furtiva não rende dinheiro, mas rende o mesmo XP', () => {
    const pelaFrente = entregar('piglet', 'molly');
    const furtiva    = entregar('piglet', 'quiet');

    expect(pelaFrente).toEqual({ xp: 90, currency: 150 });
    expect(furtiva).toEqual({ xp: 90, currency: 0 });
  });

  test('insistir com o John ainda rende pagamento (ele aceitou no fim)', () => {
    expect(entregar('lamb', 'insist')).toEqual({ xp: 72, currency: 120 });
  });

  // A recompensa sai do PREÇO do item, não de número escrito na quest — se os
  // preços forem rebalanceados, a recompensa acompanha sem ninguém lembrar.
  test('a recompensa escala com o preço do filhote entregue', () => {
    const pintinho = entregar('chick');   // 50
    const cordeiro = entregar('lamb');    // 120
    const leitao   = entregar('piglet');  // 150

    expect(pintinho).toEqual({ xp: 30, currency: 50 });
    expect(cordeiro).toEqual({ xp: 72, currency: 120 });
    expect(leitao).toEqual({ xp: 90, currency: 150 });

    // O mais caro rende mais que o mais barato — a regra que importa.
    expect(leitao.xp).toBeGreaterThan(pintinho.xp);
    expect(leitao.currency).toBeGreaterThan(pintinho.currency);
  });

  test('entregar consome o item e fecha a quest', () => {
    lunaChickQuest.setState({ state: 'carrying', pet: 'lamb' });
    const inv = fakeInventory({ 301: 1 });
    systems.inventory = inv;

    // A entrega roda na `action` da última linha da cena.
    const scene = lunaChickQuest.buildScene3();
    const entrega = scene.lines.find((l) => typeof l.action === 'function' && l.text.includes('dLunaThanks'));
    expect(entrega).toBeTruthy();
    entrega.action();

    expect(inv.qty[301]).toBe(0);
    expect(lunaChickQuest.getState().state).toBe('delivered');
    expect(lunaChickQuest.canStartScene3()).toBe(false);
  });
});
