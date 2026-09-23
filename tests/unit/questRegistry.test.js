import { describe, test, expect, beforeEach, mock } from 'bun:test';
import '../setup.js';

const systems = {};

mock.module('../../public/scripts/gameState.js', () => ({
  getSystem: (name) => systems[name] || null,
  registerSystem: () => {},
}));

mock.module('../../public/scripts/logger.js', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
}));

const { questRegistry, NPC_QUESTS } = await import('../../public/scripts/quests/questRegistry.js');

/** NPC carregado, devolvendo o estado pedido. */
function liveNpc(state) {
  return { getQuestState: () => state };
}

beforeEach(() => {
  for (const key of Object.keys(systems)) delete systems[key];
  questRegistry.registerPastQuest(null); // estado inerte entre testes
});

describe('questRegistry', () => {
  test('conta 0 quando o NPC não tem estado legível', () => {
    expect(questRegistry.getProgress('john')).toEqual({ total: 2, done: 0, pct: 0 });
  });

  test('conta as quests concluídas do estado vivo', () => {
    systems.npcJohn = liveNpc({ dialogue: 'intro_done', milkQuest: 'idle' });

    const p = questRegistry.getProgress('john');
    expect(p.total).toBe(2);
    expect(p.done).toBe(1);
    expect(p.pct).toBe(0.5);
  });

  test('recusar conta como concluída (é escolha, não pendência)', () => {
    systems.npcLucas = liveNpc({ secretQuest: 'declined' });
    expect(questRegistry.getProgress('lucas').done).toBe(1);
  });

  test('estado intermediário não conta', () => {
    systems.npcLucas = liveNpc({ secretQuest: 'in_progress' });
    expect(questRegistry.getProgress('lucas').done).toBe(0);
  });

  // #227: NPCs de city são lazy — logo após carregar um save na fazenda eles
  // não existem, e contar só pelo módulo carregado zeraria o progresso.
  test('usa o save aplicado quando o NPC não está carregado', () => {
    systems.save = {
      getAppliedGameFlags: () => ({ milly_quest: { quest: 'completed' } }),
    };

    expect(questRegistry.getProgress('milly').done).toBe(1);
  });

  test('prefere o estado vivo ao do save', () => {
    systems.npcLucas = liveNpc({ secretQuest: 'delivered' });
    systems.save = {
      getAppliedGameFlags: () => ({ lucas_quest: { secretQuest: 'idle' } }),
    };

    expect(questRegistry.getProgress('lucas').done).toBe(1);
  });

  test('NPC desconhecido não quebra', () => {
    expect(questRegistry.getProgress('naoexiste')).toEqual({ total: 0, done: 0, pct: 0 });
  });
});

// Guarda contra deriva: o registro vive em outro arquivo que os NPCs, então
// nada impede alguém de adicionar uma quest e esquecer de declará-la aqui —
// e aí o gatilho do clímax passa a contar errado, em silêncio.
describe('sincronia com o saveSystem', () => {
  // NPCs persistidos que de propósito não entram na contagem.
  const IGNORADOS = new Set([
    'isabela_quest',   // sem quest própria ainda (só marcação de intro)
    'tutorial_quests', // tutorial, não quest de NPC
  ]);

  test('todo NPC persistido está declarado (ou ignorado explicitamente)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('public/scripts/saveSystem.js', 'utf8');

    // chaves coletadas no _getGameFlags: `xxx_quest: npcState(...)`
    const persistidos = [...src.matchAll(/^\s{12}([a-z_]+_quests?):\s*(?:npcState|tutorials|getSystem)/gm)]
      .map((m) => m[1]);

    expect(persistidos.length).toBeGreaterThan(0);

    const declarados = new Set(Object.values(NPC_QUESTS).map((d) => d.flag));
    const faltando = persistidos.filter((f) => !declarados.has(f) && !IGNORADOS.has(f));

    expect(faltando).toEqual([]);
  });

  test('nenhum NPC declarado aponta pra flag inexistente', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('public/scripts/saveSystem.js', 'utf8');

    for (const def of Object.values(NPC_QUESTS)) {
      expect(src).toContain(`${def.flag}:`);
    }
  });
});

describe('gatilho da quest de passado', () => {
  /** Marca todas as quests de todos os NPCs como concluídas. */
  function completeEveryone() {
    for (const [, def] of Object.entries(NPC_QUESTS)) {
      const state = {};
      for (const q of def.quests) state[q.field] = q.done[0];
      // Estados agregados (arco Miller) guardam a quest um nível abaixo.
      systems[def.system] = liveNpc(def.sub ? { [def.sub]: state } : state);
    }
  }

  test('não dispara com o mundo zerado', () => {
    expect(questRegistry.hasEveryoneReached(0.4)).toBe(false);
  });

  test('dispara quando todos atingem o limiar', () => {
    completeEveryone();
    expect(questRegistry.hasEveryoneReached(0.4)).toBe(true);
  });

  // O gatilho é o clímax do protagonista: um único NPC atrasado segura tudo.
  test('um NPC abaixo do limiar segura o gatilho', () => {
    completeEveryone();
    systems.npcMilly = liveNpc({ quest: 'idle' });

    expect(questRegistry.hasEveryoneReached(0.4)).toBe(false);
    expect(questRegistry.pendingFor(0.4)).toContain('milly');
  });

  test('NPC ilegível conta como 0 e segura o gatilho', () => {
    completeEveryone();
    delete systems.npcBru;

    expect(questRegistry.hasEveryoneReached(0.4)).toBe(false);
  });

  // Sem quest de passado implementada, pausar as ofertas travaria TODAS as
  // quests do jogo pra sempre assim que o limiar batesse.
  test('não pausa as ofertas enquanto a quest de passado não existir', () => {
    questRegistry.registerPastQuest(null);
    completeEveryone();

    expect(questRegistry.isPastQuestUnlocked()).toBe(true);
    expect(questRegistry.isOfferingPaused()).toBe(false);
  });

  test('pausa as ofertas entre o desbloqueio e a conclusão da quest de passado', () => {
    questRegistry.registerPastQuest({ isDone: () => false });

    expect(questRegistry.isOfferingPaused()).toBe(false); // ainda não destravou

    completeEveryone();
    expect(questRegistry.isOfferingPaused()).toBe(true);

    questRegistry.registerPastQuest({ isDone: () => true });
    expect(questRegistry.isOfferingPaused()).toBe(false); // resolvida → volta
  });

  // Quest sem fim (o imposto do Bartolomeu) não pode entrar na contagem: ela
  // nunca conclui, então travaria o NPC num teto e limiares altos — como os
  // 75% da visita da avó Maria — nunca disparariam.
  test('todo NPC consegue chegar a 100%', () => {
    completeEveryone();

    const all = questRegistry.getAllProgress();
    for (const [npcId, p] of Object.entries(all)) {
      expect({ npcId, pct: p.pct }).toEqual({ npcId, pct: 1 });
    }
    expect(questRegistry.hasEveryoneReached(0.75)).toBe(true);
  });
});
