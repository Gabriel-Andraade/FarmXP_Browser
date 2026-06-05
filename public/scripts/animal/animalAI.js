/**
 * @file animalAI.js - Artificial Intelligence System for Animals
 * Implements autonomous behavior with movement and idle states.
 * Handles collisions, animations, world navigation,
 * stats (hunger, thirst, moral), moods and interactions (pet, feed, guide).
 */

import { logger } from '../logger.js';
import { collisionSystem } from "../collisionSystem.js";
import { getSystem, getObject, getDebugFlag } from '../gameState.js';
import { qualityMode } from '../qualityMode.js';
import { resolveReach } from './animalHitboxConfig.js';
import { IDLE_STATE_MIN_MS, IDLE_STATE_MAX_MS, MOVE_STATE_MIN_MS, MOVE_STATE_MAX_MS, MOVEMENT, ANIMATION, RANGES } from '../constants.js';
import { items } from '../item.js';
import { animals } from '../theWorld.js';
import { assets } from '../assetManager.js';

// weatherSystem expõe `day`; dayNightSystem expõe `dayCount` — aceitar ambos
// e padronizar o lookup pra updateStats e applyMedicine não divergirem.
function getCurrentDay() {
    const daySys = getSystem('dayNight') || getSystem('weather');
    return daySys?.dayCount ?? daySys?.day ?? 0;
}

// Mood system

export const AnimalMood = {
    SLEEPING:   'sleeping',
    HURT:       'hurt',
    SUSPICIOUS: 'suspicious',
    ANGRY:      'angry',
    SAD:        'sad',
    HUNGRY:     'hungry',
    NEEDY:      'needy',
    CALM:       'calm',
};

const MOOD_EMOJIS = {
    sleeping:   'Zzz',
    hurt:       '🤕',
    suspicious: '❓',
    angry:      '😡',
    sad:        '😢',
    hungry:     '🍽️',
    needy:      '💔',
    calm:       '😊',
};

// Mapa item.id → emoji do produto pronto pra coleta. Referência simples
// pelos ids canônicos: 60=Ovo, 61=Leite, 62=Lã. Renderizado pelo draw()
// quando `_pendingProduct` está setado.
const PRODUCT_EMOJI = {
    60: '🥚',  // ovo
    61: '🥛',  // leite
    62: '🧶',  // lã
};

function getMaxPetsPerDay(moral) {
    if (moral >= 80) return 5;
    if (moral >= 60) return 4;
    if (moral >= 40) return 3;
    if (moral >= 20) return 2;
    return 1;
}

/**
 * Sorteia a reação do animal a um remédio com base na palatabilidade do
 * item. Retorna 'accept', 'mild_reject' ou 'reject'. Tabelas pensadas
 * pra que `palatable` raramente cause queda de moral, e `bitter` cause
 * frequentemente.
 */
function pickMedicineReaction(palatability) {
    const r = Math.random();
    if (palatability === 'palatable') {
        if (r < 0.80) return 'accept';
        if (r < 0.97) return 'mild_reject';
        return 'reject';
    }
    if (palatability === 'bitter') {
        if (r < 0.30) return 'accept';
        if (r < 0.65) return 'mild_reject';
        return 'reject';
    }
    // neutral (default para itens sem palatabilidade definida)
    if (r < 0.55) return 'accept';
    if (r < 0.85) return 'mild_reject';
    return 'reject';
}

const AnimalState = {
    IDLE: "idle",
    MOVE: "move",
    FLEE: "flee",
    FOLLOW: "follow",
    // Estados de bebida: animal decide ir ao cocho quando thirst < threshold
    // (sorteado individualmente). SEEKING = caminhando até o slot reservado.
    // DRINKING = parado dentro do slot, recuperando thirst e drenando cocho.
    SEEKING_WATER: "seeking_water",
    DRINKING: "drinking",
    // Issue #171: food (hunger-driven). Mirrors water states.
    SEEKING_FOOD: "seeking_food",
    EATING: "eating",
};

// Cada animal sorteia um threshold próprio entre 5 e 25 — uns são mais
// vigilantes (correm pro cocho cedo), outros aguentam até quase secar.
const THIRST_THRESHOLD_MIN = 5;
const THIRST_THRESHOLD_MAX = 25;
// Issue #171: hunger threshold. Same logic — varies per animal so they
// don't all run to the food trough simultaneously.
const HUNGER_THRESHOLD_MIN = 10;
const HUNGER_THRESHOLD_MAX = 30;

// Sessão de bebida: animal fica `DRINK_SESSION_DURATION_MS` no cocho. A
// quantidade TOTAL (água drenada do cocho + thirst recuperado no animal)
// é species-specific. Per-tick = total / ticks-per-sessão — fica suave
// na barra de sede em vez de pular instantâneo.
const DRINK_TICK_INTERVAL_MS = 250;
const DRINK_SESSION_DURATION_MS = 3000;
const DRINK_TICKS_PER_SESSION = DRINK_SESSION_DURATION_MS / DRINK_TICK_INTERVAL_MS;  // 12

// Unidades de água consumidas POR SESSÃO completa (drinking entry → exit).
// Calibrado pra cocho cheio (100) durar:
//   - ~1.5 dia com 3 vacas (3 × 18 = 54/dia se beberem 2x cada)
//   - ~3-4 dias com 5 galinhas (5 × 3 = 15/dia mesmo bebendo 2x)
const WATER_CONSUMPTION_BY_SPECIES = {
    // Pequeno porte
    Chick:    2,
    Lamb:     3,
    Piglet:   3,
    Calf:     4,
    Chicken:  3,
    Rooster:  3,
    Turkey:   4,
    // Médio porte
    Sheep:    7,
    Pig:     10,
    // Grande porte
    Cow:     18,
    Bull:    20,
};

// Thirst recuperado POR SESSÃO completa. Independente do consumo do cocho —
// animal grande bebe mais (drena mais do cocho) E recupera mais sede.
const THIRST_RESTORE_BY_SPECIES = {
    Chick:   30, Lamb:    35, Piglet:  35, Calf:    40,
    Chicken: 35, Rooster: 35, Turkey:  40,
    Sheep:   55, Pig:     60,
    Cow:     70, Bull:    70,
};

const DEFAULT_WATER_CONSUMPTION = 5;
const DEFAULT_THIRST_RESTORE    = 40;

// Stats decaem em granularidade de 1s real para serem visíveis enquanto o
// painel do animal está aberto. Esse é apenas o intervalo BASE — cada stat
// tem seu próprio agendamento jitterado (ver DECAY_INTERVAL_JITTER abaixo).
const STATS_DECAY_INTERVAL_MS = 1000;
// Balanceamento: 1 dia in-game ≈ 12 min reais (timeSpeed = 2 no weather).
// Taxas distintas por stat — antes hunger e thirst usavam o mesmo número
// (6/min) e por isso decaíam em lockstep. Sede cai mais rápido (animais
// bebem várias vezes ao dia); fome um pouco mais lenta; moral é slow-burn.
const HUNGER_DECAY_PER_MIN = 5;
const THIRST_DECAY_PER_MIN = 8;
const MORAL_DECAY_PER_MIN  = 1.5;

// Cada stat tem seu próprio "relógio" de decay com jitter independente.
// O drop é proporcional ao tempo real decorrido, então a média por minuto
// se mantém igual à taxa configurada — é só rugosidade temporal para
// parecer mais natural (animais não descontam tudo no mesmo segundo).
//
// INTERVAL [min, max] em ms — janelas mais largas ajudam a desincronizar
// stats e animais entre si. Antes era 500-5000ms, ficava previsível.
const DECAY_INTERVAL_JITTER_MIN_MS = 800;
const DECAY_INTERVAL_JITTER_MAX_MS = 8000;
// MAGNITUDE [min, max] multiplicador — janela alargada (era 0.75-1.25,
// agora 0.5-1.5) pra ticks individuais variarem mais.
const DECAY_MAGNITUDE_JITTER_MIN = 0.5;
const DECAY_MAGNITUDE_JITTER_MAX = 1.5;

// Cada animal recebe na construção um multiplicador permanente por stat
// (0.5-1.5). É o "metabolismo" individual: alguns ficam com fome muito
// mais rápido, outros sentem sede menos, etc. Combinado com SPECIES_RATE_MULT,
// a variância total fica ~6x entre o "mais rápido" e o "mais lento".
const PER_ANIMAL_RATE_MULT_MIN = 0.5;
const PER_ANIMAL_RATE_MULT_MAX = 1.5;

// Taxa base por espécie. Multiplica os DECAY_PER_MIN globais — então uma
// vaca/touro come mais que uma galinha, porco filhote tem mais fome que
// ovelha, etc. Espécies não listadas caem no fallback 1.0 em cada stat.
const SPECIES_RATE_MULT = {
    Bull:    { hunger: 1.3, thirst: 1.1, moral: 0.9 },
    Cow:     { hunger: 1.2, thirst: 1.2, moral: 1.0 },
    Calf:    { hunger: 1.1, thirst: 1.1, moral: 1.1 },
    Sheep:   { hunger: 0.9, thirst: 0.8, moral: 1.0 },
    Lamb:    { hunger: 1.0, thirst: 0.9, moral: 1.2 },
    Piglet:  { hunger: 1.4, thirst: 1.0, moral: 1.0 },
    Pig:     { hunger: 1.5, thirst: 1.1, moral: 0.95 },
    Chick:   { hunger: 0.7, thirst: 1.0, moral: 1.1 },
    Chicken: { hunger: 0.8, thirst: 1.0, moral: 1.0 },
    Rooster: { hunger: 0.8, thirst: 1.0, moral: 0.9 },
    Turkey:  { hunger: 1.0, thirst: 1.0, moral: 1.0 },
};

function speciesMult(assetName, key) {
    return SPECIES_RATE_MULT[assetName]?.[key] ?? 1;
}

function randRange(lo, hi) {
    return lo + Math.random() * (hi - lo);
}

const PET_MORAL_GAIN = 8;
const FEED_HUNGER_GAIN = 30;
const FEED_MORAL_GAIN = 5;

const FLEE_SPEED_MULT = 1.8;
const FLEE_DISTANCE = 120;
const SUSPICIOUS_PET_THRESHOLD = 3;

// Cap de magnitude da separação somada ao vetor de movimento. Sem cap,
// múltiplos vizinhos próximos viravam força > velocidade base e o animal
// andava PRA LONGE do alvo (player ou target de wander) — gerava o bug
// "tá em FOLLOW mas não chega". Cap = fração de ANIMAL_SPEED (0.5):
// follow tolera mais separação (cardume mais espalhado), wander tolera
// menos (não atrapalha o passeio individual).
const SEPARATION_CAP_FOLLOW = 0.35;
const SEPARATION_CAP_WANDER = 0.25;

// Validação de target em pickNewState: tenta até N ângulos antes de
// aceitar um destino sorteado dentro de obstáculo. Sem isso, animal
// ciclava MOVE→IDLE→MOVE→IDLE com targets impossíveis e parecia imóvel.
const PICK_TARGET_MAX_ATTEMPTS = 5;

// Efeitos do ferimento por severidade.
// scratch e null: comportamento normal (sem entrada na tabela = 1.0 / 0).
const INJURY_SPEED_MULT = {
    wound:  0.92,   // ferida: leve diferença
    severe: 0.6,    // grave: visivelmente mais lento
};
const INJURY_FOLLOW_ACCEPT_CHANCE = {
    severe: 0.35,   // só o grave pode recusar; ferida ainda aceita
};
const INJURY_MORAL_DECAY_EXTRA_PER_MIN = {
    wound:  0.05,
    severe: 0.15,
};

// Decay extra de moral por minuto, por doença. Cada animal multiplica esse
// valor pelo seu próprio `disease.intensity` (jitter 0.5–1.5 atribuído ao
// adoecer), então dois animais com a mesma doença ainda decaem em ritmos
// diferentes — caso contrário o "extra" uniforme fazia todos os doentes
// convergirem pro piso de moral juntos e parecerem idênticos.
const DISEASE_MORAL_DECAY_EXTRA_PER_MIN = {
    parasitosis: 0.025,
    respiratory: 0.060,
    digestive:   0.050,
    fever:       0.040,
};

// Modificadores por estágio de vida (lifecycle). Adulto e maturo são o
// baseline (1.0). Filhote tem "energia infantil" — moral cai mais devagar.
// Idoso tem fragilidade — moral cai mais rápido E anda mais devagar.
//
// Multiplicam o decay total de moral (depois das outras camadas: doença,
// ferimento, clima) e a velocidade base de movimento.
const STAGE_MORAL_DECAY_MULT = {
    young:   0.65,  // -35%  filhote resistente, energia infantil
    adult:   1.0,
    mature:  1.0,
    elderly: 1.45,  // +45%  idoso fragiliza, perde moral rápido
};
const STAGE_SPEED_MULT = {
    young:   1.0,
    adult:   1.0,
    mature:  1.0,
    elderly: 0.7,   // idoso anda 30% mais devagar — visualmente claro
};

// Touro ferindo vizinho ao berrar. Gatilho situacional (não diário):
// dispara só quando o `bull_bellow` toca, candidato é o vizinho mais
// próximo dentro do raio. Cooldown do bellow já é 20-40s, então mesmo
// com chance baixa por berro, ficar perto de um Bull por muito tempo
// aumenta linearmente o risco — coerente com "o touro é perigoso".
const BULL_BELLOW_INJURY_RADIUS = 80;
const BULL_BELLOW_INJURY_CHANCE = 0.015;

// Travamento de gênero por espécie. 'male'/'female' = sempre esse sexo;
// 'random' = sorteia 50/50 na criação. Saves antigos sem `gender` caem
// aqui no construtor antes do deserialize, então mesmo animais legados
// passam a exibir ♂/♀ no painel.
const SPECIES_GENDER = {
    Bull:    'male',
    Rooster: 'male',
    Cow:     'female',
    Chicken: 'female',  // galinha adulta — produtora de ovos
    Calf:    'random',
    Chick:   'random',
    Lamb:    'random',
    Piglet:  'random',
    Pig:     'random',  // porco adulto (vem do crescimento de Piglet)
    Sheep:   'random',
    Turkey:  'random',
};

function pickGenderFor(assetName) {
    const rule = SPECIES_GENDER[assetName];
    if (rule === 'male' || rule === 'female') return rule;
    return Math.random() < 0.5 ? 'male' : 'female';
}

export class AnimalEntity {
    constructor(assetName, assetData, x, y, opts = {}) {
        // Id estável desde a construção. theWorld atribui o id real do
        // spawn/save logo depois (via `if (!animal.id)`), mas sem este
        // fallback há uma janela em que `_tryStep`/`_isPositionBlocked`
        // passam `undefined` para `collisionSystem.areaCollides` —
        // resultado: o animal pode detectar a própria hitbox como
        // obstáculo, ou animais com id indefinido se confundirem entre si.
        this.id = opts.id ?? `animal_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.frameCounts = assetData.frameCounts || null;
        this.type = "ANIMAL";
        this.assetName = assetName;

        this.img = assetData.img;
        this.cols = assetData.cols || 4;
        this.rows = assetData.rows || 4;

        this.x = x;
        this.y = y;

        this.frameWidth = assetData.frameWidth || (this.img ? this.img.width / this.cols : 32);
        this.frameHeight = assetData.frameHeight || (this.img ? this.img.height / this.rows : 32);
        this.renderScale = assetData.renderScale || 1;
        this.width = this.frameWidth * this.renderScale;
        this.height = this.frameHeight * this.renderScale;

        this.collisionBox = this.getInitialCollisionConfig();

        this.state = AnimalState.IDLE;
        this.direction = 0;
        this.targetX = x;
        this.targetY = y;

        this.directionRows = assetData.directionRows || { down: 0, up: 3, left: 1, right: 2 };
        // Sprites como a Cow (sheet 8×3) só desenham 'left' — 'right' é
        // 'left' espelhado em runtime. Quando `mirrorRight` é true e o
        // animal está virado pra direita, `flipX` ativa `ctx.scale(-1,1)` no draw.
        this._mirrorRight = !!assetData.mirrorRight;
        this.flipX = false;

        this.stateTimer = performance.now();
        this.stateDuration = 1000;

        this.frameIndex = 0;
        this.lastFrameTime = 0;

        this._lastSfxTime = 0;
        this._sfxCooldownMs = 20000 + Math.random() * 20000;

        const initStats = opts.stats || {};
        this.stats = {
            hunger: initStats.hunger ?? 70,
            thirst: initStats.thirst ?? 70,
            moral:  initStats.moral  ?? 60,
        };

        // Metabolismo individual: cada stat tem um multiplicador 0.7-1.3
        // sorteado uma vez na construção. Faz dois animais da mesma
        // espécie decaírem em ritmos diferentes — a Galinha A pode ficar
        // com fome 30% mais rápido que a Galinha B, etc.
        this._statRateMultipliers = opts.statRateMultipliers || {
            hunger: randRange(PER_ANIMAL_RATE_MULT_MIN, PER_ANIMAL_RATE_MULT_MAX),
            thirst: randRange(PER_ANIMAL_RATE_MULT_MIN, PER_ANIMAL_RATE_MULT_MAX),
            moral:  randRange(PER_ANIMAL_RATE_MULT_MIN, PER_ANIMAL_RATE_MULT_MAX),
        };

        this._isSuspicious = opts.suspicious || false;
        this.gender = opts.gender ?? pickGenderFor(assetName);
        // Ferimento atual: null = saudável, ou { severity, region, daysSince }.
        // Arranhão é leve e NÃO dispara mood HURT (ver getter `_isHurt`).
        this.injury = opts.injury ?? null;
        // Doença atual: null = saudável, ou { id, daysSince, diagnosed }.
        // Enquanto não diagnosticada, o UiPanel exibe apenas "?".
        this.disease = opts.disease ?? null;

        // Produção (milk/wool/egg). `_pendingProduct` é setado pelo
        // productionSystem no `dayChanged` quando o animal está elegível.
        // Player coleta com a ferramenta certa (ou nenhuma, se o produto
        // não exigir). Cleared on collection. `_lastProducedDay` evita
        // spawn duplo no mesmo dia.
        this._pendingProduct = opts.pendingProduct ?? null;
        this._pendingTool    = opts.pendingTool    ?? null;
        this._lastProducedDay = opts.lastProducedDay ?? -1;

        // Feedback visual flutuante (sucesso/falha de coleta).
        // `{ text, success, startedAt, duration }`. Cleared no draw quando
        // expira. Não persiste no save (efeito transitório).
        this._collectFx = null;

        // ─── Lifecycle / aging ─────────────────────────────────────────
        // `_daysOld`: idade real do animal em dias in-game (sempre
        // incrementa em `dayChanged`). `_lifeStage`: 'young' | 'adult' |
        // 'mature' | 'elderly'. Avanço de estágio exige `_avgMoral >= 50`
        // — animal mal cuidado fica preso no estágio anterior pra sempre.
        // `_avgMoral`: EMA (exponential moving average) atualizado por dia,
        // serve como proxy de "qualidade do cuidado" sem precisar guardar
        // histórico completo.
        this._daysOld   = opts.daysOld   ?? 0;
        this._lifeStage = opts.lifeStage ?? this._defaultLifeStageFromAsset(assetName);
        this._avgMoral  = opts.avgMoral  ?? this.stats.moral;
        // Tempo de vida total (em dias) sorteado ao nascer. Variância 85-110
        // dias = idoso vive 20-45 dias após chegar ao último estágio (65d).
        // Player não vê o valor — gera incerteza de "quando ela vai partir".
        this._lifespan = opts.lifespan ?? (85 + Math.floor(Math.random() * 26));

        // FX flutuante de aging (sparkle + toast quando cresce). Não persiste.
        this._ageUpFx = null;

        this._mood = opts.initialMood || (this._isSuspicious ? AnimalMood.SUSPICIOUS : AnimalMood.CALM);

        this.petsToday = 0;
        this.petAttempts = 0;
        this.lastPetDay = -1;
        this.following = false;
        this._followTarget = null;

        // Schedule de decay independente por stat. Cada um tem seu próprio
        // "lastAt" (quando dropou pela última vez) e "nextAt" (quando vai
        // dropar de novo, com jitter).
        const now = performance.now();
        this._decayState = {
            hunger: { lastAt: now, nextAt: now + randRange(DECAY_INTERVAL_JITTER_MIN_MS, DECAY_INTERVAL_JITTER_MAX_MS) },
            thirst: { lastAt: now, nextAt: now + randRange(DECAY_INTERVAL_JITTER_MIN_MS, DECAY_INTERVAL_JITTER_MAX_MS) },
            moral:  { lastAt: now, nextAt: now + randRange(DECAY_INTERVAL_JITTER_MIN_MS, DECAY_INTERVAL_JITTER_MAX_MS) },
        };

        this.__uiPaused = false;

        // ─── Drinking ────────────────────────────────────────────────────
        // Threshold individual: animal só procura cocho quando thirst cai
        // abaixo disso. Variação faz uns sairem mais cedo que outros.
        this._drinkThreshold = opts.drinkThreshold ?? randRange(THIRST_THRESHOLD_MIN, THIRST_THRESHOLD_MAX);
        // Slot reservado atualmente, se houver. Setado em SEEKING_WATER,
        // liberado ao sair de DRINKING (ou se cocho secar / animal morrer).
        this._claimedTrough = null;   // troughId
        this._claimedSlot   = -1;     // 0..2
        this._lastDrinkTickAt = 0;
        // Ponto FORA do cocho onde o animal vai parar pra beber (lado
        // perpendicular ao slot). Setado no claim, usado como target em
        // SEEKING_WATER. Diferente do slot center (que é inalcançável).
        this._drinkPos = null;        // { x, y, facing }
        // Sessão de bebida atual (computada ao entrar em DRINKING). Guarda
        // os totais species-specific e o quanto já foi gasto, pra parar
        // exatamente na cota e não desperdiçar.
        this._drinkSession = null;
        // Cooldown após desistir/falhar — evita loop "seek → timeout → IDLE
        // → seek imediato" quando o caminho tá bloqueado.
        this._drinkCooldownUntil = 0;
        // Estado de "intersecta slot" cacheado pelo update — usado pelo
        // draw pra pintar a hitbox de interação em verde quando dentro.
        this._interactionActive = false;

        // Issue #171: food (hunger). Mirrors the water slot system — claims
        // 1 of 3 slots per trough so multiple animals can eat side by side
        // but don't overlap on the same spot.
        this._eatThreshold = opts.eatThreshold ?? randRange(HUNGER_THRESHOLD_MIN, HUNGER_THRESHOLD_MAX);
        this._claimedFoodTrough = null;
        this._claimedFoodSlot = null;
        this._eatPos = null;
        this._lastEatTickAt = 0;
        this._eatCooldownUntil = 0;
    }

    /**
     * Estágio de vida default baseado no assetName quando o animal é
     * construído (sem dado persistido). Filhotes começam 'young', adultos
     * já começam 'adult'. Idoso/maturo nunca surgem ao construir — só via
     * aging system.
     */
    _defaultLifeStageFromAsset(assetName) {
        const youngAssets = ['Chick', 'Calf', 'Lamb', 'Piglet'];
        return youngAssets.includes(assetName) ? 'young' : 'adult';
    }

    /**
     * Troca o asset (sprite + dimensões + hitbox) do animal mantendo
     * tudo o resto (id, posição, stats, gender, doença, etc.). Usado
     * pelo agingSystem quando filhote vira adulto (Chick→Chicken etc.).
     *
     * Re-registra a hitbox no collisionSystem com as novas dimensões —
     * fundamental porque a hitbox antiga (do filhote pequeno) ficaria
     * desalinhada do sprite novo (adulto maior).
     *
     * @param {string} newAssetName
     * @returns {boolean} true se a transformação rolou
     */
    transformInto(newAssetName) {
        if (!newAssetName || newAssetName === this.assetName) return false;
        const newAsset = assets?.animals?.[newAssetName];
        if (!newAsset?.img) {
            logger.warn?.(`[AnimalEntity] transformInto: asset '${newAssetName}' não disponível`);
            return false;
        }

        const fromAsset = this.assetName;

        // Atualiza referências do asset
        this.assetName = newAssetName;
        this.img = newAsset.img;
        this.cols = newAsset.cols || 4;
        this.rows = newAsset.rows || 4;
        this.frameCounts = newAsset.frameCounts || null;
        this.frameWidth  = newAsset.frameWidth  || (this.img ? this.img.width  / this.cols : 32);
        this.frameHeight = newAsset.frameHeight || (this.img ? this.img.height / this.rows : 32);
        this.renderScale = newAsset.renderScale || 1;
        this.width  = this.frameWidth  * this.renderScale;
        this.height = this.frameHeight * this.renderScale;
        this.directionRows = newAsset.directionRows || { down: 0, up: 3, left: 1, right: 2 };
        this._mirrorRight = !!newAsset.mirrorRight;
        this.flipX = false;

        // Recalcula collisionBox com as novas dimensões
        this.collisionBox = this.getInitialCollisionConfig();

        // Re-registra hitbox no collisionSystem (remove a antiga, add nova).
        // Sem isso, o player conseguiria "atravessar" o adulto maior na
        // região que ainda usa o tamanho do filhote.
        try {
            if (this.id && typeof collisionSystem.removeHitbox === 'function') {
                collisionSystem.removeHitbox(this.id);
            }
            const hb = this.getHitbox();
            if (typeof collisionSystem.addHitbox === 'function') {
                collisionSystem.addHitbox(this.id, 'ANIMAL', hb.x, hb.y, hb.width, hb.height, this);
                if (typeof collisionSystem.setInteractionHitboxBounds === 'function') {
                    const m = 0.1;
                    collisionSystem.setInteractionHitboxBounds(
                        this.id,
                        this.x + this.width * m,
                        this.y + this.height * m,
                        this.width * (1 - 2 * m),
                        this.height * (1 - 2 * m)
                    );
                }
            }
        } catch (e) {
            logger.warn?.('[AnimalEntity] transformInto: falha ao re-registrar hitbox', e);
        }

        // Reset animation
        this.frameIndex = 0;
        this.direction = 0;
        this.lastFrameTime = 0;

        document.dispatchEvent(new CustomEvent('animalTransformed', {
            detail: { animal: this, from: fromAsset, to: newAssetName },
        }));
        return true;
    }

    getInitialCollisionConfig() {
        let box = {
            offsetX: this.width * 0.25,
            offsetY: this.height * 0.6,
            width: this.width * 0.5,
            height: this.height * 0.4
        };
        try {
            if (collisionSystem && typeof collisionSystem.getConfigForObject === 'function') {
                const cfg = collisionSystem.getConfigForObject({
                    type: 'ANIMAL',
                    original: this
                });
                if (cfg) {
                    box.width = this.width * (cfg.widthRatio ?? 0.5);
                    box.height = this.height * (cfg.heightRatio ?? 0.4);
                    box.offsetX = this.width * (cfg.offsetXRatio ?? 0.25);
                    box.offsetY = this.height * (cfg.offsetYRatio ?? 0.6);
                }
            }
        } catch (e) {
            logger.warn("AnimalEntity: error loading collision config", e);
        }
        return box;
    }

    getHitbox() {
        // Pool de hitbox por animal: reusa o mesmo objeto em vez de alocar
        // um novo por chamada. updateAnimals + collision queries chamam
        // ~3× por frame por animal — com 30 animais a 60fps = 5400 alocações/s
        // antes. Agora 0. GC pressure dropa drasticamente.
        let hb = this._hitboxBuf;
        if (!hb) hb = this._hitboxBuf = { x: 0, y: 0, width: 0, height: 0 };
        const cb = this.collisionBox;
        hb.x = this.x + (cb.offsetX || 0);
        hb.y = this.y + (cb.offsetY || 0);
        hb.width = cb.width || this.width;
        hb.height = cb.height || this.height;
        return hb;
    }

    /**
     * Hitbox de INTERAÇÃO — retângulo fino na frente do animal, alinhado
     * à direção que ele está olhando. Diferente da hitbox física (corpo),
     * esta serve pra "tatear" o que está logo à frente (cocho, comida,
     * etc.). Pintada laranja por padrão, verde quando intersecta algo
     * interagível.
     *
     * Direção mapeada via `this.directionRows`. `flipX` (mirrorRight)
     * inverte left/right pra sprites espelhados.
     *
     * @returns {{ x:number, y:number, w:number, h:number, facing:string }}
     */
    getInteractionHitbox() {
        const r = this.directionRows;

        // Resolve facing considerando mirrorRight.
        let facing;
        if (this.direction === r.down) facing = 'down';
        else if (this.direction === r.up) facing = 'up';
        else if (this.direction === r.left) facing = this.flipX ? 'right' : 'left';
        else if (this.direction === r.right) facing = 'right';
        else facing = 'down';

        // Valores ABSOLUTOS em `animal/animalHitboxConfig.js` — você edita
        // x/y/width/height por espécie + direção, F5 reflete. SEM fórmula.
        // Pra Bull os valores são feitos pro sprite 48×48 dele; pra Lamb,
        // pro sprite 24×24 — cada um afinado individualmente.
        const cfg = resolveReach(this.assetName, facing);
        return {
            x: this.x + cfg.x,
            y: this.y + cfg.y,
            w: cfg.width,
            h: cfg.height,
            facing,
        };
    }

    /**
     * Helper privado: desenha path de retângulo arredondado no contexto
     * dado (sem fill/stroke — chama depois `ctx.fill()` ou `ctx.stroke()`).
     * Usado pelo FX da barra de sede. Fallback simples pra runtimes sem
     * `ctx.roundRect()` (Safari antigo).
     */
    _roundRect(ctx, x, y, w, h, r) {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, rr);
            return;
        }
        ctx.moveTo(x + rr, y);
        ctx.lineTo(x + w - rr, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr);
        ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr);
        ctx.quadraticCurveTo(x, y, x + rr, y);
        ctx.closePath();
    }

    /** True se a hitbox de interação intersecta o slot {x,y,w,h} dado. */
    _interactionHitsSlot(slot) {
        if (!slot) return false;
        const ih = this.getInteractionHitbox();
        return ih.x < slot.x + slot.w &&
               ih.x + ih.w > slot.x &&
               ih.y < slot.y + slot.h &&
               ih.y + ih.h > slot.y;
    }

    recalcMood() {
        const weather = getSystem('weather');
        if (weather) {
            const minutes = weather.currentTime ?? 0;
            const hour = Math.floor(minutes / 60);
            if (hour >= 22 || hour < 6) {
                this._mood = AnimalMood.SLEEPING;
                return;
            }
        }

        if (this._isHurt) {
            this._mood = AnimalMood.HURT;
            return;
        }
        if (this._isSuspicious) {
            this._mood = AnimalMood.SUSPICIOUS;
            return;
        }
        if (this.stats.moral < 15) {
            this._mood = AnimalMood.ANGRY;
            return;
        }
        if (this.stats.moral < 30) {
            this._mood = AnimalMood.SAD;
            return;
        }
        if (this.stats.hunger < 20) {
            this._mood = AnimalMood.HUNGRY;
            return;
        }
        if (this.stats.moral < 50 && this.stats.hunger < 40) {
            this._mood = AnimalMood.NEEDY;
            return;
        }

        if (weather) {
            const wt = weather.weatherType;
            if (wt === 'storm' || wt === 'blizzard') {
                if (this.stats.moral < 60) {
                    this._mood = AnimalMood.SAD;
                    return;
                }
            }
        }

        this._mood = AnimalMood.CALM;
    }

    /**
     * Animal está "machucado" o suficiente para mood HURT.
     * Arranhão (scratch) é leve demais e não conta — segue mood normal.
     */
    get _isHurt() {
        const inj = this.injury;
        return !!inj && inj.severity !== 'scratch';
    }

    /** Multiplicador de velocidade aplicado ao movimento (1 = normal). */
    _injurySpeedMult() {
        return INJURY_SPEED_MULT[this.injury?.severity] ?? 1;
    }

    /** Chance (0–1) do animal aceitar seguir ao ser guiado. */
    _injuryAcceptChance() {
        return INJURY_FOLLOW_ACCEPT_CHANCE[this.injury?.severity] ?? 1;
    }

    /** Decay extra de moral por minuto causado pelo ferimento. */
    _injuryMoralDecayExtra() {
        return INJURY_MORAL_DECAY_EXTRA_PER_MIN[this.injury?.severity] ?? 0;
    }

    _diseaseMoralDecayExtra() {
        const d = this.disease;
        if (!d) return 0;
        const base = DISEASE_MORAL_DECAY_EXTRA_PER_MIN[d.id] ?? 0.04;
        const intensity = Number.isFinite(d.intensity) ? d.intensity : 1;
        return base * intensity;
    }

    /**
     * Multiplicador de decay de moral pelo estágio de vida.
     * Filhote = 0.65 (mais resiliente). Idoso = 1.45 (mais frágil).
     * Aplicado sobre o total (base + ferimento + doença + clima).
     */
    _stageMoralMult() {
        return STAGE_MORAL_DECAY_MULT[this._lifeStage] ?? 1;
    }

    /**
     * Multiplicador de velocidade pelo estágio de vida.
     * Filhote/Adulto/Maturo = 1.0. Idoso = 0.7 (visivelmente mais lento).
     * Combina multiplicativamente com `_injurySpeedMult` — animal velho
     * E ferido fica ainda mais lento.
     */
    _stageSpeedMult() {
        return STAGE_SPEED_MULT[this._lifeStage] ?? 1;
    }

    get mood() {
        return this._mood;
    }

    get moodEmoji() {
        return MOOD_EMOJIS[this._mood] || '';
    }

    updateStats() {
        const now = performance.now();

        // Reset diário de carinhos
        const currentDay = getCurrentDay();
        if (currentDay != null && currentDay !== this.lastPetDay) {
            this.lastPetDay = currentDay;
            this.petsToday = 0;
        }

        // Cada stat tem sua própria taxa efetiva. Moral inclui penalidades de
        // ferimento e de clima ruim (storm/blizzard/rain). Depois de somar
        // todas as camadas, multiplica pelo modifier do estágio de vida —
        // filhote resiste mais, idoso fragiliza.
        const moralRate = (MORAL_DECAY_PER_MIN
            + this._injuryMoralDecayExtra()
            + this._diseaseMoralDecayExtra()
            + this._weatherMoralPenaltyPerMin())
            * this._stageMoralMult();

        this._tickStat('hunger', HUNGER_DECAY_PER_MIN, now);
        this._tickStat('thirst', THIRST_DECAY_PER_MIN, now);
        this._tickStat('moral',  moralRate,            now);

        // recalcMood roda todo frame: mudanças de hora/clima não podem esperar
        // o próximo tick de decay (atraso pode deixar animal dormindo
        // "interactable" por engano).
        this.recalcMood();
    }

    /**
     * Tick de decay de um stat com agendamento e magnitude jitterados.
     * Drop é proporcional ao tempo real decorrido desde o último tick — a
     * média de decay por minuto se mantém igual a `ratePerMin` mesmo com
     * o jitter, garantindo balance estável.
     */
    _tickStat(key, ratePerMin, now) {
        const s = this._decayState[key];
        if (!s || now < s.nextAt) return;

        const elapsedMs = now - s.lastAt;
        const minutes = elapsedMs / 60_000;
        const magnitudeJitter = randRange(DECAY_MAGNITUDE_JITTER_MIN, DECAY_MAGNITUDE_JITTER_MAX);
        // Duas camadas de variância pra evitar lockstep:
        //   speciesMult — taxa base por espécie (vaca come mais que galinha)
        //   animalMult  — metabolismo individual sorteado na construção
        const animalMult = this._statRateMultipliers?.[key] ?? 1;
        const specMult = speciesMult(this.assetName, key);
        const drop = ratePerMin * specMult * animalMult * minutes * magnitudeJitter;

        this.stats[key] = Math.max(0, this.stats[key] - drop);

        s.lastAt = now;
        s.nextAt = now + randRange(DECAY_INTERVAL_JITTER_MIN_MS, DECAY_INTERVAL_JITTER_MAX_MS);
    }

    /** Penalidade extra de moral por minuto causada pelo clima atual. */
    _weatherMoralPenaltyPerMin() {
        const weather = getSystem('weather');
        if (!weather) return 0;
        const wt = weather.weatherType;
        if (wt === 'storm' || wt === 'blizzard') return 0.1;
        if (wt === 'rain') return 0.03;
        return 0;
    }

    pet() {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }

        if (this._isSuspicious) {
            this.petAttempts++;
            if (this.petAttempts < SUSPICIOUS_PET_THRESHOLD) {
                this._startFlee();
                return { success: false, message: 'suspicious_flee' };
            }
            this._isSuspicious = false;
            this.petAttempts = 0;
            this.stats.moral = Math.min(100, this.stats.moral + PET_MORAL_GAIN);
            this.recalcMood();
            return { success: true, message: 'gained_trust' };
        }

        if (this._mood === AnimalMood.ANGRY) {
            return { success: false, message: 'angry' };
        }

        const maxPets = getMaxPetsPerDay(this.stats.moral);
        if (this.petsToday >= maxPets) {
            return { success: false, message: 'max_pets' };
        }

        this.petsToday++;
        this.stats.moral = Math.min(100, this.stats.moral + PET_MORAL_GAIN);
        this.recalcMood();

        // Dispatch event for quest system
        document.dispatchEvent(new CustomEvent('animalPetted', {
            detail: { animal: this, assetName: this.assetName }
        }));

        return { success: true, message: 'pet_ok' };
    }

    feed(itemId = null) {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            return { success: false, message: 'suspicious' };
        }

        const inv = getSystem('inventory');
        if (!inv) return { success: false, message: 'no_inventory' };

        // Player pode passar `itemId` específico (via sub-menu de Alimentar).
        // Se omitido, mantém legacy: pega o primeiro animal_food do inventário.
        let feedItem = null;
        if (itemId != null) {
            // Resolve item específico — precisa estar no inventário com qty > 0
            const catalog = items.find(it => it.id === itemId);
            if (catalog) {
                // Verifica posse via inventory
                if (typeof inv.findItem === 'function') {
                    feedItem = inv.findItem(it => it.id === itemId && it.quantity > 0);
                } else if (inv.categories && inv.categories.animal_food?.items) {
                    feedItem = inv.categories.animal_food.items.find(it => it.id === itemId && it.quantity > 0);
                }
                // Fallback — usa o catálogo direto se o lookup falhou mas
                // o player tem (caso o inventory esteja em formato atípico)
                if (!feedItem && typeof inv.getItemQuantity === 'function' && inv.getItemQuantity(itemId) > 0) {
                    feedItem = { ...catalog, quantity: inv.getItemQuantity(itemId) };
                }
            }
        } else if (typeof inv.findFirstItemInCategory === 'function') {
            feedItem = inv.findFirstItemInCategory('animal_food', item => item.quantity > 0);
        } else if (inv.categories && inv.categories.animal_food && inv.categories.animal_food.items) {
            feedItem = inv.categories.animal_food.items.find(item => item.quantity > 0);
        } else if (typeof inv.findItem === 'function') {
            feedItem = inv.findItem(item => item.type === 'animal_food' || item.id === 'animal_feed_basic' || item.category === 'animal_food');
        }

        if (!feedItem) {
            return { success: false, message: 'no_food' };
        }

        // Validação de compatibilidade — `targetAnimals` no item:
        //   • undefined ou null: sem restrição (compat)
        //   • 'all': qualquer espécie aceita
        //   • Array<string>: lista exata de assetName aceitos
        //   • Array vazio []: nada do farm aceita (ex: ração de gato)
        // Player vê warning mas o item NÃO é consumido — sem perda.
        const catalog = items.find(it => it.id === feedItem.id) || feedItem;
        if (!this._isFoodCompatible(catalog)) {
            return { success: false, message: 'wrong_food' };
        }

        const removed = (typeof inv.removeItem === 'function')
            ? inv.removeItem(feedItem.id, 1)
            : (inv.removeItemFromCategory ? inv.removeItemFromCategory('animal_food', feedItem.id, 1) : false);

        if (removed === false) {
            return { success: false, message: 'failed_remove_food' };
        }

        this.stats.hunger = Math.min(100, this.stats.hunger + FEED_HUNGER_GAIN);
        this.stats.moral  = Math.min(100, this.stats.moral  + FEED_MORAL_GAIN);
        this.recalcMood();
        return { success: true, message: 'fed' };
    }

    /**
     * Verifica se o item de alimento é compatível com este animal.
     * Lê `item.targetAnimals` do catálogo (items.js).
     *   - undefined/null: compat por default (sem restrição)
     *   - 'all': qualquer espécie aceita
     *   - Array com assetName: aceito apenas se assetName está nele
     *   - Array vazio: explicitamente incompatível (ex: ração de gato)
     */
    _isFoodCompatible(item) {
        if (!item) return false;
        const t = item.targetAnimals;
        if (t == null) return true;            // sem restrição
        if (t === 'all') return true;          // genérico (Petisco, Ração Premium)
        if (!Array.isArray(t)) return true;    // formato desconhecido — permissivo
        if (t.length === 0) return false;      // explicitamente vazio
        return t.includes(this.assetName);
    }

    /**
     * Aplica um remédio no animal. A reação depende da palatabilidade do
     * item (campo `palatability` no items.js):
     *   - palatable: 80% aceita, 20% reclama (queda leve de moral)
     *   - neutral:   55% aceita, 30% reclama, 15% recusa (queda maior)
     *   - bitter:    30% aceita, 35% reclama, 35% recusa
     *
     * Esse método NÃO mexe no inventário — quem chama (main.js) deve
     * decrementar o item antes de invocar. A lógica de cura propriamente
     * dita ainda não está aqui; `disease.lastMedicine` registra o último
     * remédio aplicado para o sistema de cura usar depois.
     *
     * @param {number} itemId - id do item no items.js
     * @returns {{ success: boolean, reaction?: string, message: string, itemId?: number }}
     */
    applyMedicine(itemId) {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            return { success: false, message: 'suspicious' };
        }

        const item = items.find(it => it.id === itemId);
        if (!item || item.type !== 'medicine') {
            return { success: false, message: 'not_medicine' };
        }

        const reaction = pickMedicineReaction(item.palatability);

        // 3 desfechos exclusivos (espelhando o "afastada / moral / nada"):
        //   accept       → nada
        //   mild_reject  → queda leve de moral
        //   reject       → animal foge (afastada física, sem moral drop)
        if (reaction === 'mild_reject') {
            this.stats.moral = Math.max(0, this.stats.moral - 3);
        } else if (reaction === 'reject') {
            this._startFlee();
        }

        // Registra a aplicação. Se há doença ativa, fica nela; senão, no
        // próprio animal (apenas pra debug — não tem efeito mecânico).
        const day = getCurrentDay();
        if (this.disease) {
            this.disease.lastMedicine = { itemId, day };
        } else {
            this.lastMedicine = { itemId, day };
        }

        // Cura: só aplica se o animal aceitou (não fugiu) e o remédio é
        // pro tipo certo de doença. Não exige `diagnosed` — se o jogador
        // já conhece o remédio (comprou na vet), pode aplicar em outro
        // animal com a mesma doença sem pagar diagnóstico de novo.
        let cured = false;
        if (reaction !== 'reject' && this.disease?.id === item.targetDisease) {
            if (item.cureMode === 'instant') {
                this._cureFromMedicine(item);
                cured = true;
            } else if (item.cureMode === 'gradual') {
                cured = this._progressGradualTreatment(item, day);
            }
        }

        this.recalcMood();

        const message = cured                        ? 'medicine_cured'
                      : reaction === 'accept'        ? 'medicine_accept'
                      : reaction === 'mild_reject'   ? 'medicine_mild_reject'
                      :                                'medicine_reject';
        return { success: true, reaction, message, itemId, cured };
    }

    /**
     * Avança o tratamento gradual em uma dose. Aplica as regras de:
     *   - dosesPerDay: doses extras no mesmo dia são desperdiçadas
     *   - daysToCure: dias necessários, escalado por `disease.intensity`
     *     (animal mais sintomático precisa mais dias do mesmo remédio)
     *   - troca de remédio: reinicia o tratamento (não soma progresso
     *     entre remédios diferentes pra mesma doença)
     * @returns {boolean} true se a cura foi completada nessa dose.
     */
    _progressGradualTreatment(item, day) {
        if (!this.disease) return false;

        const intensity = Number.isFinite(this.disease.intensity) ? this.disease.intensity : 1;
        const requiredDays = Math.max(1, Math.round((item.daysToCure || 1) * intensity));
        const requiredDoses = item.dosesPerDay || 1;

        let tx = this.disease.treatment;
        if (tx && tx.medicineId !== item.id) tx = null; // remédio diferente reinicia
        if (!tx) {
            tx = {
                medicineId: item.id,
                startDay: day,
                daysCompleted: 0,
                dosesToday: 0,
                lastDoseDay: day,
            };
            this.disease.treatment = tx;
        }

        // Novo dia → zera contador de doses do dia.
        if (tx.lastDoseDay !== day) {
            tx.dosesToday = 0;
            tx.lastDoseDay = day;
        }

        // Já cumpriu a cota? Dose extra desperdiça o item sem progresso.
        if (tx.dosesToday < requiredDoses) {
            tx.dosesToday++;
            if (tx.dosesToday >= requiredDoses) {
                tx.daysCompleted++;
            }
        }

        if (tx.daysCompleted >= requiredDays) {
            this._cureFromMedicine(item);
            return true;
        }
        return false;
    }

    /**
     * Limpa a doença e dá um pequeno bônus de moral. O evento `animalCured`
     * sai com detalhes pra UI/quests reagirem se quiserem.
     */
    _cureFromMedicine(item) {
        const ds = getSystem('animalDisease');
        const wasDiseaseId = this.disease?.id;
        if (ds && typeof ds.clear === 'function') {
            ds.clear(this);
        } else {
            this.disease = null;
        }
        this.stats.moral = Math.min(100, this.stats.moral + 10);
        document.dispatchEvent(new CustomEvent('animalCured', {
            detail: { animal: this, medicineId: item.id, diseaseId: wasDiseaseId },
        }));
    }

    guide() {
        // Todos os retornos incluem `following` pra contrato estável
        // (caller pode ler result.following em qualquer branch sem precisar
        // de fallback). No path de falha, mantém o valor atual.
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, following: this.following, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            this._startFlee();
            return { success: false, following: this.following, message: 'suspicious_flee' };
        }
        if (this._mood === AnimalMood.ANGRY) {
            return { success: false, following: this.following, message: 'angry' };
        }

        // Animais gravemente feridos podem recusar seguir.
        // Só vale ao iniciar o follow (parar de seguir nunca recusa).
        if (!this.following) {
            const chance = this._injuryAcceptChance();
            if (chance < 1 && Math.random() > chance) {
                return { success: false, following: this.following, message: 'severe_refused' };
            }
        }

        this.following = !this.following;
        if (this.following) {
            this.state = AnimalState.FOLLOW;
        } else {
            this.state = AnimalState.IDLE;
            this.stateTimer = performance.now();
            this.stateDuration = IDLE_STATE_MIN_MS;
        }
        return {
            success: true,
            following: this.following,
            message: this.following ? 'guide_start' : 'guide_stop',
        };
    }

    _startFlee() {
        const currentPlayer = getObject('currentPlayer');
        const px = currentPlayer?.x ?? this.x;
        const py = currentPlayer?.y ?? this.y;

        const dx = this.x - px;
        const dy = this.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        this.targetX = this.x + (dx / dist) * FLEE_DISTANCE;
        this.targetY = this.y + (dy / dist) * FLEE_DISTANCE;
        this.state = AnimalState.FLEE;
        this.stateTimer = performance.now();
        this.stateDuration = 2000;
        this.updateDirection();
    }

    update() {
        // Stats sempre tickam, mesmo com o painel aberto. Sem isso, a UI
        // mostraria barras congeladas enquanto o jogador olha o animal.
        this.updateStats();

        // Resto do update (AI/movimento) fica congelado durante interação UI,
        // EXCETO quando o animal está sendo guiado (following) ou fugindo
        // (FLEE). Sem essa exceção, clicar em "Guiar" no UiPanel deixava o
        // animal imóvel: guide() setava following=true/state=FOLLOW, mas o
        // próximo frame caía aqui e retornava antes de _updateFollow rodar
        // — o jogador via "guide_start" no painel e ZERO movimento, parecendo
        // que a ação não funcionou. O painel já tem loop próprio que
        // reposiciona a UI por frame, então acompanha o animal em movimento.
        // UI aberta pausa AI normal MAS deixa rodar: follow (guide), flee,
        // e os estados de bebida (senão abrir painel pra ver thirst trava
        // o restore — animal "bebia" sem o stat subir, só caía pelo decay).
        if (this.__uiPaused &&
            !this.following &&
            this.state !== AnimalState.FLEE &&
            this.state !== AnimalState.SEEKING_WATER &&
            this.state !== AnimalState.DRINKING &&
            this.state !== AnimalState.SEEKING_FOOD &&
            this.state !== AnimalState.EATING) return;

        const now = performance.now();

        // Cleanup de slot orfão: se o animal tem cocho reservado mas saiu
        // dos estados de bebida (mood SLEEPING, player clicou guiar, FLEE
        // ativou, etc), libera a reserva pra outros poderem usar. Sem isso
        // os 3 slots de cada cocho vão sendo "lockados" por animais que
        // não estão mais lá, e ninguém consegue beber depois.
        if (this._claimedTrough &&
            this.state !== AnimalState.SEEKING_WATER &&
            this.state !== AnimalState.DRINKING) {
            const wtSys = getSystem('waterTrough');
            wtSys?.releaseSlot?.(this._claimedTrough, this._claimedSlot, this.id);
            this._claimedTrough = null;
            this._claimedSlot = -1;
            this._drinkPos = null;
            this._drinkSession = null;
            this._interactionActive = false;
        }

        // Same cleanup for food trough slot claim.
        if (this._claimedFoodTrough &&
            this.state !== AnimalState.SEEKING_FOOD &&
            this.state !== AnimalState.EATING) {
            const ftSys = getSystem('foodTrough');
            ftSys?.releaseSlot?.(this._claimedFoodTrough, this._claimedFoodSlot, this.id);
            this._claimedFoodTrough = null;
            this._claimedFoodSlot = null;
            this._eatPos = null;
        }

        if (this._mood === AnimalMood.SLEEPING) {
            this.state = AnimalState.IDLE;
            this.frameIndex = 0;
            return;
        }

        // Se o jogador ativou Guide neste animal, ele deve PERMANECER
        // seguindo até toggle manual. Várias transições inocentes podem
        // ter derivado `state` pra IDLE/MOVE com `following` ainda true
        // (ex.: move() não conseguiu avançar e setou IDLE; FLEE de
        // rejeitar remédio expirou e setou IDLE; pickNewState rodou
        // antes do fix). Sem este restore, o animal saía do follow e
        // virava wanderer aleatório — daí "alguns seguem, outros não".
        // Não restaura quando está em FLEE (interrupção intencional);
        // SLEEPING já foi tratado acima.
        if (this.following && this.state !== AnimalState.FOLLOW && this.state !== AnimalState.FLEE) {
            this.state = AnimalState.FOLLOW;
        }

        if (this.following && this.state === AnimalState.FOLLOW) {
            this._updateFollow();
            return;
        }

        if (this.state === AnimalState.FLEE) {
            this.move(FLEE_SPEED_MULT);
            this.updateAnimation(now);
            if (now - this.stateTimer > this.stateDuration) {
                this.state = AnimalState.IDLE;
                this.frameIndex = 0;
                this.stateTimer = now;
                this.stateDuration = IDLE_STATE_MIN_MS + Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS);
            }
            return;
        }

        // ─── Drinking states (prioridade média, abaixo de FLEE/FOLLOW) ────
        if (this.state === AnimalState.SEEKING_WATER) {
            this._updateSeekingWater(now);
            return;
        }
        if (this.state === AnimalState.DRINKING) {
            this._updateDrinking(now);
            return;
        }
        // Transição: thirst caiu abaixo do threshold → tenta ir beber.
        // Só dispara se NÃO está em FLEE/FOLLOW (já tratados acima) e o
        // animal não está machucado/dormindo.
        if (this._tryEnterSeekingWater()) {
            this._updateSeekingWater(now);
            return;
        }

        // ─── Eating states (Issue #171) — same priority tier as drinking ─
        if (this.state === AnimalState.SEEKING_FOOD) {
            this._updateSeekingFood(now);
            return;
        }
        if (this.state === AnimalState.EATING) {
            this._updateEating(now);
            return;
        }
        if (this._tryEnterSeekingFood()) {
            this._updateSeekingFood(now);
            return;
        }

        if (now - this.stateTimer > this.stateDuration) {
            this.pickNewState();
            this.stateTimer = now;
        }

        if (this.state === AnimalState.MOVE) {
            this.move();
        }

        this.updateAnimation(now);
    }

    /**
     * Tenta entrar em SEEKING_WATER. Falha (retorna false) se:
     *   - thirst >= threshold (ainda não tem sede)
     *   - dormindo (mood SLEEPING)
     *   - já existe um claim ativo (paranoia, mas garante consistência)
     *   - nenhum cocho com água + slot livre disponível
     */
    _tryEnterSeekingWater() {
        if (this._mood === AnimalMood.SLEEPING) return false;
        if ((this.stats.thirst || 0) >= this._drinkThreshold) return false;
        if (this._claimedTrough) return false;  // já tem claim
        if (performance.now() < this._drinkCooldownUntil) return false;

        const wtSys = getSystem('waterTrough');
        const found = wtSys?.findFreeSlotFor?.(this);
        if (!found) return false;

        const claimed = wtSys.claimSlot(found.trough.id, found.slotIdx, this.id);
        if (!claimed) return false;

        this._claimedTrough = found.trough.id;
        this._claimedSlot   = found.slotIdx;
        this._drinkPos      = found.drinkPos;
        // Alvo: drinkPos (ponto FORA do cocho, alinhado com o slot). Não
        // o centro do slot — esse fica dentro da colisão do cocho e é
        // inalcançável; animal ficava esbarrando na parede.
        this.targetX = found.drinkPos.x;
        this.targetY = found.drinkPos.y;
        this.state = AnimalState.SEEKING_WATER;
        this.stateTimer = performance.now();
        this.stateDuration = 12000;  // timeout — se não chegou em 12s, desiste
        return true;
    }

    _updateSeekingWater(now) {
        const wtSys = getSystem('waterTrough');
        const slots = wtSys?.getDrinkSlots?.(this._claimedTrough) || [];
        const slot = slots[this._claimedSlot];

        // Cocho sumiu ou slot inválido → aborta.
        if (!slot) {
            this._exitDrinkFlow();
            return;
        }

        // Cocho secou no caminho → aborta sem desperdiçar viagem completa.
        if (wtSys.getWaterLevel(this._claimedTrough) <= 0) {
            this._exitDrinkFlow();
            return;
        }

        // Encaixou: hitbox de interação intersectando o slot → DRINKING.
        if (this._interactionHitsSlot(slot)) {
            this._interactionActive = true;
            this.state = AnimalState.DRINKING;
            this.stateTimer = now;
            this.stateDuration = 8000;  // máx 8s bebendo (segurança)
            this._lastDrinkTickAt = now;
            this.frameIndex = 0;
            return;
        }

        // Alvo: drinkPos fora do cocho. Se o drinkPos foi perdido (raro,
        // mas se save/load não persistiu), recalcula.
        let dp = this._drinkPos;
        if (!dp) {
            dp = wtSys.getDrinkPosition?.(
                wtSys.getWaterTroughs().find(w => w.id === this._claimedTrough),
                slot, this
            );
            this._drinkPos = dp;
        }
        this.targetX = dp.x;
        this.targetY = dp.y;

        const dx = dp.x - this.x;
        const dy = dp.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Chegou no drinkPos: força facing pro centro do slot pra hitbox
        // de interação encaixar. Não chama move() (que poderia setar IDLE).
        // Próximo frame, _interactionHitsSlot vai detectar e transitar
        // pra DRINKING (early return no topo).
        if (dist < 6) {
            const slotCx = slot.x + slot.w / 2;
            const slotCy = slot.y + slot.h / 2;
            const sdx = slotCx - (this.x + this.width / 2);
            const sdy = slotCy - (this.y + this.height / 2);
            this._setFacing(sdx, sdy);
            this.frameIndex = 0;
        } else {
            this.move();
            // move() pode ter setado IDLE em dist<2 corner case — restaura.
            if (this.state !== AnimalState.SEEKING_WATER) {
                this.state = AnimalState.SEEKING_WATER;
            }
        }
        this._interactionActive = false;
        this.updateAnimation(now);

        // Timeout: se demorou demais (preso por outros animais? cercado
        // de obstáculos?), libera o slot, desiste E coloca cooldown pra
        // não retentar imediatamente.
        if (now - this.stateTimer > this.stateDuration) {
            this._drinkCooldownUntil = now + 5000;
            this._exitDrinkFlow();
        }
    }

    _updateDrinking(now) {
        const wtSys = getSystem('waterTrough');
        const slots = wtSys?.getDrinkSlots?.(this._claimedTrough) || [];
        const slot = slots[this._claimedSlot];

        // Cocho/slot sumiu ou animal saiu do slot (foi empurrado) → cleanup.
        if (!slot || !this._interactionHitsSlot(slot)) {
            this._exitDrinkFlow();
            return;
        }

        this._interactionActive = true;

        // Lazy init da sessão de bebida — uma vez por entrada no DRINKING.
        // Total drenado/recuperado vem das tabelas species-specific;
        // per-tick é o total dividido por DRINK_TICKS_PER_SESSION (12).
        if (!this._drinkSession) {
            const waterTotal  = WATER_CONSUMPTION_BY_SPECIES[this.assetName] ?? DEFAULT_WATER_CONSUMPTION;
            const thirstTotal = THIRST_RESTORE_BY_SPECIES[this.assetName]   ?? DEFAULT_THIRST_RESTORE;
            this._drinkSession = {
                waterTotal,
                thirstTotal,
                waterPerTick:  waterTotal  / DRINK_TICKS_PER_SESSION,
                thirstPerTick: thirstTotal / DRINK_TICKS_PER_SESSION,
                thirstGained: 0,   // acumulador pra parar exatamente na cota
            };
        }

        // Tick de bebida ~250ms: drena fração species-specific do cocho
        // e restaura fração no thirst do animal. Suave na barra de sede.
        if (now - this._lastDrinkTickAt >= DRINK_TICK_INTERVAL_MS) {
            this._lastDrinkTickAt = now;
            const s = this._drinkSession;

            const drained = wtSys.drink(this._claimedTrough, s.waterPerTick);
            if (!drained) {
                // Cocho secou.
                this._exitDrinkFlow();
                return;
            }
            this.stats.thirst = Math.min(100, (this.stats.thirst || 0) + s.thirstPerTick);
            s.thirstGained += s.thirstPerTick;

            // Cota da sessão batida → sai satisfeito. Animal pequeno
            // recupera só 30, animal grande recupera 70 — modela "tamanho
            // do gole" + "necessidade hídrica".
            if (s.thirstGained >= s.thirstTotal || this.stats.thirst >= 100) {
                this._exitDrinkFlow();
                return;
            }
        }

        // Safety timeout: se algo travou e o tick não progride, sai.
        if (now - this.stateTimer > 10000) {
            this._exitDrinkFlow();
        }

        this.frameIndex = 0;
    }

    /** Libera slot reservado e volta pra IDLE. Idempotente. */
    _exitDrinkFlow() {
        const wtSys = getSystem('waterTrough');
        if (wtSys && this._claimedTrough) {
            wtSys.releaseSlot(this._claimedTrough, this._claimedSlot, this.id);
        }
        this._claimedTrough = null;
        this._claimedSlot = -1;
        this._drinkPos = null;
        this._drinkSession = null;
        this._interactionActive = false;
        this.state = AnimalState.IDLE;
        this.stateTimer = performance.now();
        this.stateDuration = IDLE_STATE_MIN_MS + Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS);
        this.frameIndex = 0;
    }

    // ─── Eating (Issue #171) ─────────────────────────────────────────────
    // No slot reservation: multiple animals can crowd around the same
    // trough. Simpler than water — pick nearest matching trough with food,
    // walk to a side, drain food + restore hunger over ~6s.

    _tryEnterSeekingFood() {
        if (this._mood === AnimalMood.SLEEPING) return false;
        if ((this.stats.hunger || 0) >= this._eatThreshold) return false;
        if (this._claimedFoodTrough) return false;
        if (performance.now() < this._eatCooldownUntil) return false;

        const ftSys = getSystem('foodTrough');
        const found = ftSys?.findFreeSlotFor?.(this);
        if (!found) return false;

        const claimed = ftSys.claimSlot(found.trough.id, found.slotIdx, this.id);
        if (!claimed) return false;

        this._claimedFoodTrough = found.trough.id;
        this._claimedFoodSlot = found.slotIdx;
        this._eatPos = found.eatPos;
        this.targetX = found.eatPos.x;
        this.targetY = found.eatPos.y;
        this.state = AnimalState.SEEKING_FOOD;
        this.stateTimer = performance.now();
        this.stateDuration = 12000;
        return true;
    }

    _updateSeekingFood(now) {
        const ftSys = getSystem('foodTrough');
        if (!ftSys) { this._exitFoodFlow(); return; }

        const troughId = this._claimedFoodTrough;
        // Bail if trough is now empty (both bars 0).
        if (ftSys.getFoodLevel(troughId) <= 0 && ftSys.getPremiumLevel(troughId) <= 0) {
            this._exitFoodFlow();
            return;
        }

        // Reached the slot → transition to EATING.
        if (ftSys.isAnimalAtSlot?.(this, troughId, this._claimedFoodSlot)) {
            this.state = AnimalState.EATING;
            this.stateTimer = now;
            this.stateDuration = 8000;
            this._lastEatTickAt = now;
            this.frameIndex = 0;
            return;
        }

        const ep = this._eatPos;
        if (ep) {
            this.targetX = ep.x;
            this.targetY = ep.y;
        }
        const dx = (ep?.x || 0) - this.x;
        const dy = (ep?.y || 0) - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) {
            this._setFacing?.(ep.facing === 'right' ? 1 : ep.facing === 'left' ? -1 : 0,
                              ep.facing === 'down'  ? 1 : ep.facing === 'up'   ? -1 : 0);
            this.frameIndex = 0;
        } else {
            this.move();
            if (this.state !== AnimalState.SEEKING_FOOD) this.state = AnimalState.SEEKING_FOOD;
        }
        this.updateAnimation(now);

        if (now - this.stateTimer > this.stateDuration) {
            this._eatCooldownUntil = now + 5000;
            this._exitFoodFlow();
        }
    }

    _updateEating(now) {
        const ftSys = getSystem('foodTrough');
        if (!ftSys || !this._claimedFoodTrough) { this._exitFoodFlow(); return; }

        // Tick once per second. eat() returns { drained, fromPremium } or false.
        // Premium feeds drain slower (3 vs 5) but restore more hunger (+12 vs +8).
        if (now - this._lastEatTickAt >= 1000) {
            const result = ftSys.eat(this._claimedFoodTrough, 5, 3);
            if (result && result.drained) {
                const gain = result.fromPremium ? 12 : 8;
                this.stats.hunger = Math.min(100, (this.stats.hunger || 0) + gain);
            } else {
                this._exitFoodFlow();
                return;
            }
            this._lastEatTickAt = now;
        }

        // Stop when full or session timeout.
        if ((this.stats.hunger || 0) >= 95 || now - this.stateTimer > this.stateDuration) {
            this._exitFoodFlow();
        }
        this.updateAnimation(now);
    }

    _exitFoodFlow() {
        const ftSys = getSystem('foodTrough');
        if (ftSys && this._claimedFoodTrough && this._claimedFoodSlot != null) {
            ftSys.releaseSlot(this._claimedFoodTrough, this._claimedFoodSlot, this.id);
        }
        this._claimedFoodTrough = null;
        this._claimedFoodSlot = null;
        this._eatPos = null;
        this.state = AnimalState.IDLE;
        this.stateTimer = performance.now();
        this.stateDuration = IDLE_STATE_MIN_MS + Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS);
        this.frameIndex = 0;
    }

    _updateFollow() {
        const currentPlayer = getObject('currentPlayer');
        if (!currentPlayer) {
            this.following = false;
            this.state = AnimalState.IDLE;
            return;
        }

        const px = currentPlayer.x;
        const py = currentPlayer.y;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 60) {
            // Personal space: separa animais que chegaram juntos no
            // raio do player. Sem isso, follow + colisão soft entre
            // animais resultava em todos empilhados no mesmo ponto —
            // o getObjectAtMouse só clica no de cima da pilha (UI
            // Panel não abria pros outros), e animais grudados ainda
            // pareciam travados. Aqui empurra suavemente pra longe
            // de qualquer vizinho próximo.
            this._spreadFromNearbyAnimals();

            this.state = AnimalState.FOLLOW;
            this.frameIndex = 0;
            this._setFacing(dx, dy);
            return;
        }

        const speed = MOVEMENT.ANIMAL_SPEED * 1.2 * this._injurySpeedMult() * this._stageSpeedMult();
        // Combina vetor rumo ao player com força de separação CAPADA.
        // Sem cap, vários vizinhos somavam força maior que a velocidade
        // base e o animal andava pra LONGE do player — entrava em loop
        // de "FOLLOW eterno" sem nunca chegar perto. Com cap, separação
        // afasta sem dominar.
        const baseVx = (dx / dist) * speed;
        const baseVy = (dy / dist) * speed;
        const sep = this._computeSeparation(28, SEPARATION_CAP_FOLLOW);
        const vx = baseVx + sep.x;
        const vy = baseVy + sep.y;

        // Tenta primeiro com separação. Se o vetor combinado estiver
        // bloqueado (animal entre vizinhos e parede), retenta SEM
        // separação. Sem o fallback, animal parado entre obstáculo e
        // cardume mantinha state=FOLLOW sem se mover — sintoma reportado:
        // "alguns dizem estar seguindo mas não seguem".
        if (!this._tryMoveTowards(vx, vy)) {
            this._tryMoveTowards(baseVx, baseVy);
        }

        // Direção visual segue a INTENÇÃO (rumo ao jogador), não o
        // deslocamento real — assim o sprite continua olhando pra ele
        // mesmo se o frame atual escorregou só no eixo perpendicular.
        this._setFacing(dx, dy);

        this.updateAnimation(performance.now());
    }

    pickNewState() {
        this.frameIndex = 0;

        // Bias pra MOVE: antes era 40% MOVE / 60% IDLE — animais ficavam
        // sentados ~62% do tempo e davam sensação de "imóveis por muito
        // tempo". Agora 55% MOVE / 45% IDLE. Mantemos as durações; só
        // a frequência de wander é maior.
        if (Math.random() > 0.45) {
            this.state = AnimalState.MOVE;
            this.stateDuration = Math.random() * (MOVE_STATE_MAX_MS - MOVE_STATE_MIN_MS) + MOVE_STATE_MIN_MS;

            // Tenta achar um destino que NÃO esteja dentro de obstáculo.
            // Sem isso, o sorteio podia cair em árvore/casa: animal
            // entrava em MOVE, todos os steps falhavam, voltava pra IDLE
            // (1s) e sorteava de novo — ciclava sem sair do lugar e
            // parecia paralisado.
            let placed = false;
            for (let attempt = 0; attempt < PICK_TARGET_MAX_ATTEMPTS; attempt++) {
                const angle = Math.random() * Math.PI * 2;
                // Distância mínima 30% do raio: alvos muito próximos
                // disparavam o `dist < 2` cedo demais e o MOVE virava
                // só "1 frame e volta pra IDLE".
                const r = (0.3 + Math.random() * 0.7) * RANGES.ANIMAL_SIGHT_RADIUS;
                const tx = this.x + Math.cos(angle) * r;
                const ty = this.y + Math.sin(angle) * r;
                if (!this._isPositionBlocked(tx, ty)) {
                    this.targetX = tx;
                    this.targetY = ty;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // Cercado por obstáculos em todas as direções amostradas.
                // Aceita target qualquer — _tryMoveTowards faz axis-slide
                // / detour pra ao menos sair do canto. Melhor que IDLE.
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * RANGES.ANIMAL_SIGHT_RADIUS;
                this.targetX = this.x + Math.cos(angle) * r;
                this.targetY = this.y + Math.sin(angle) * r;
            }

            this.updateDirection();
        } else {
            this.state = AnimalState.IDLE;
            this.stateDuration = Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS) + IDLE_STATE_MIN_MS;
        }

        if (this.assetName === 'Bull') {
            const now = performance.now();
            if (now - this._lastSfxTime >= this._sfxCooldownMs && Math.random() < 0.25) {
                const audio = getSystem('audio');
                if (audio && audio.playSfx3D) {
                    const played = audio.playSfx3D('bull_bellow', this.x, this.y, { category: 'animal' });
                    if (played) {
                        this._lastSfxTime = now;
                        this._sfxCooldownMs = 20000 + Math.random() * 20000;
                        this._maybeBullBellowInjury();
                    }
                }
            }
        }
    }

    // Define `this.direction` (índice de linha do sprite) e `this.flipX`
    // (espelhamento horizontal pra espécies com `mirrorRight`) a partir
    // do vetor de movimento. Centralizado pra não duplicar a lógica nos
    // 3 sites que decidem direção (updateDirection, follow, pickNewState).
    _setFacing(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                this.direction = this.directionRows.right;
                this.flipX = this._mirrorRight;
            } else {
                this.direction = this.directionRows.left;
                this.flipX = false;
            }
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
            this.flipX = false;
        }
    }

    updateDirection() {
        this._setFacing(this.targetX - this.x, this.targetY - this.y);
    }

    move(speedMult = 1) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.state = AnimalState.IDLE;
            this.frameIndex = 0;
            return;
        }

        const speed = MOVEMENT.ANIMAL_SPEED * speedMult * this._injurySpeedMult() * this._stageSpeedMult();
        const baseVx = (dx / dist) * speed;
        const baseVy = (dy / dist) * speed;
        // Separação leve durante wander também — antes só era aplicada
        // em follow. Sem isso, animais em IDLE/MOVE livre podiam
        // empilhar quando dois pickNewState convergiam pro mesmo
        // ponto.
        const sep = this._computeSeparation(28, SEPARATION_CAP_WANDER);
        const vx = baseVx + sep.x;
        const vy = baseVy + sep.y;

        if (!this._tryMoveTowards(vx, vy)) {
            // Vetor combinado bloqueado — tenta sem separação antes
            // de desistir. Pequeno custo, mas reduz casos de "paralisia
            // por vizinhos" durante wander.
            if (!this._tryMoveTowards(baseVx, baseVy)) {
                // Realmente preso (todas as tentativas — direto,
                // axis-slide, detour ±30°/±60°/±90° — falharam). Vai
                // pra IDLE curto; o próximo pickNewState gera target
                // novo e o animal sai do entalo.
                this.state = AnimalState.IDLE;
                this.frameIndex = 0;
                this.stateTimer = performance.now();
                this.stateDuration = IDLE_STATE_MIN_MS;
            }
        }
    }

    /**
     * Tenta avançar o vetor (vx, vy) com fallbacks que evitam o "travado
     * no obstáculo". Estratégia padrão de pathing 2D leve:
     *   1) movimento direto
     *   2) slide só no eixo X (animal escorrega pela parede vertical)
     *   3) slide só no eixo Y (escorrega pela parede horizontal)
     *   4) detour rotacionado ±30°, ±60°, ±90° pra contornar
     *      obstáculos largos (árvore, casa) — com 90° o animal passa
     *      a se mover perpendicular ao alvo, garantindo "step-around"
     *      quando houver espaço dos lados.
     * Aplica o primeiro deslocamento livre. Retorna true se algum
     * movimento foi aplicado.
     */
    _tryMoveTowards(vx, vy) {
        // Pré-fetch candidatos de colisão UMA VEZ pra essa busca de step.
        // _tryStep faz até 9 tentativas (direto + 2 slides + 6 rotações);
        // sem cache eram 9 queries do spatial grid por animal por frame.
        // Área de query cobre o bounding box de TODOS os possíveis steps
        // (origem + |vx|+|vy| em cada eixo + buffer pra rotações).
        const speed = Math.max(Math.abs(vx), Math.abs(vy), 1);
        const buffer = speed + 2;
        const queryX = this.x + (this.collisionBox.offsetX || 0) - buffer;
        const queryY = this.y + (this.collisionBox.offsetY || 0) - buffer;
        const queryW = this.collisionBox.width  + buffer * 2;
        const queryH = this.collisionBox.height + buffer * 2;
        const candidates = (typeof collisionSystem.queryPhysicalCandidates === 'function')
            ? collisionSystem.queryPhysicalCandidates(queryX, queryY, queryW, queryH)
            : null;

        if (this._tryStep(vx, vy, candidates)) {
            // Movimento direto liberou — limpa o "compromisso" de eixo.
            this._lastEscapeAxis = null;
            return true;
        }

        // Axis-slide com hysteresis: prefere o eixo que escapou bem na
        // última frame bloqueada. Em corredor estreito o vetor alvo
        // oscilava entre +x e +y e o animal alternava axis-slide (x, y,
        // x, y...) — ping-pong perceptível. Mantendo o último eixo,
        // ele "compromete" andar pela parede até liberar.
        const xValid = Math.abs(vx) > 0.01;
        const yValid = Math.abs(vy) > 0.01;
        const preferY = this._lastEscapeAxis === 'y';
        if (preferY) {
            if (yValid && this._tryStep(0, vy, candidates)) { this._lastEscapeAxis = 'y'; return true; }
            if (xValid && this._tryStep(vx, 0, candidates)) { this._lastEscapeAxis = 'x'; return true; }
        } else {
            if (xValid && this._tryStep(vx, 0, candidates)) { this._lastEscapeAxis = 'x'; return true; }
            if (yValid && this._tryStep(0, vy, candidates)) { this._lastEscapeAxis = 'y'; return true; }
        }

        const speedSq = vx * vx + vy * vy;
        if (speedSq < 0.0001) return false;

        // Pares (cos, sin) das rotações progressivas. Tenta cada ângulo
        // nos dois sentidos (horário/anti-horário). 90° = movimento
        // perpendicular ao alvo (passar pelo lado do obstáculo). Sem
        // os ângulos largos, animais entalavam em árvore/casa direto
        // na frente porque a aproximação era quase puramente em um
        // eixo e o slide+detour curto também batia.
        const ROTATIONS = [
            { c: 0.866, s: 0.5 },     // 30°
            { c: 0.5,   s: 0.866 },   // 60°
            { c: 0,     s: 1 },       // 90° (perpendicular)
        ];
        for (const { c, s } of ROTATIONS) {
            if (this._tryStep(vx * c - vy * s, vx * s + vy * c, candidates)) return true;
            if (this._tryStep(vx * c + vy * s, -vx * s + vy * c, candidates)) return true;
        }
        return false;
    }

    /**
     * Move (dx, dy) se a nova posição não colidir. Retorna true se moveu.
     * Helper interno do `_tryMoveTowards`.
     *
     * Animais usam colisão SOFT contra outros animais: eles podem se
     * sobrepor levemente em vez de travar. Sem isso, 4 animais seguindo
     * juntos formavam um aglomerado onde cada um bloqueava o caminho
     * do outro e todos congelavam. Obstáculos do mundo (árvores,
     * cercas, jogador) continuam sendo barreiras duras.
     */
    _tryStep(dx, dy, cachedCandidates = null) {
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        const boxX = nextX + (this.collisionBox.offsetX || 0);
        const boxY = nextY + (this.collisionBox.offsetY || 0);

        // Se candidatos foram pré-fetched (caller é `_tryMoveTowards`),
        // usa AABB inline contra eles. Senão queryea o grid (caller
        // standalone tipo `_spreadFromNearbyAnimals`).
        let willCollide;
        if (cachedCandidates && typeof collisionSystem.areaCollidesAgainst === 'function') {
            willCollide = collisionSystem.areaCollidesAgainst(
                boxX, boxY,
                this.collisionBox.width, this.collisionBox.height,
                cachedCandidates,
                this.id,
                { ignoreTypes: ['ANIMAL'] }
            );
        } else if (typeof collisionSystem.areaCollides === 'function') {
            willCollide = collisionSystem.areaCollides(
                boxX, boxY,
                this.collisionBox.width, this.collisionBox.height,
                this.id,
                { ignoreTypes: ['ANIMAL'] }
            );
        } else {
            willCollide = false;
        }

        if (willCollide) return false;
        this.x = nextX;
        this.y = nextY;
        return true;
    }

    /**
     * Verifica se a hitbox do animal numa posição (x, y) hipotética
     * colide com algum obstáculo (ignorando outros animais e a si
     * próprio). Usado por `pickNewState` pra rejeitar targets que
     * estão dentro de árvore/cerca/casa antes de sequer entrar em MOVE.
     */
    _isPositionBlocked(x, y) {
        if (typeof collisionSystem?.areaCollides !== 'function') return false;
        const boxX = x + (this.collisionBox.offsetX || 0);
        const boxY = y + (this.collisionBox.offsetY || 0);
        return collisionSystem.areaCollides(
            boxX, boxY,
            this.collisionBox.width, this.collisionBox.height,
            this.id,
            { ignoreTypes: ['ANIMAL'] }
        );
    }

    /**
     * Calcula um vetor de "separação" pequeno apontando pra longe de
     * animais vizinhos próximos. Usado pra somar ao vetor de movimento
     * quando o animal está em trânsito — evita que o cardume gruda em
     * uma pilha durante o caminho.
     *
     * @param {number} minDist - raio em px pra contar como vizinho.
     * @param {number|null} maxMag - se definido, limita a magnitude do
     *   vetor resultante. Crítico nos call-sites de movimento: sem cap,
     *   muitos vizinhos somam forças > velocidade base e o animal anda
     *   pra LONGE do alvo. Com cap, separação afasta sem dominar.
     * @returns {{ x: number, y: number }}
     */
    _computeSeparation(minDist = 28, maxMag = null) {
        const out = { x: 0, y: 0 };
        const myCx = this.x + this.width / 2;
        const myCy = this.y + this.height / 2;
        const minSq = minDist * minDist;

        // Query no spatial grid em vez de iterar `animals` inteiro.
        // O(k) onde k = vizinhos próximos, vs O(n) onde n = todos os
        // animais do mundo. Com 30 animais, k típico é 2-5 (cluster
        // pequeno). Cai bem o custo por frame por animal.
        const neighbors = collisionSystem.queryNearbyAnimals(myCx, myCy, minDist, this.id);
        for (let i = 0; i < neighbors.length; i++) {
            const other = neighbors[i];
            if (!other || other === this) continue;
            const ocx = other.x + other.width / 2;
            const ocy = other.y + other.height / 2;
            const ddx = myCx - ocx;
            const ddy = myCy - ocy;
            const dsq = ddx * ddx + ddy * ddy;
            if (dsq >= minSq) continue;
            if (dsq < 0.5) {
                // Praticamente sobrepostos — nudge aleatório pra
                // quebrar o empate. Sem isso, o cálculo direcional
                // dá NaN/zero e os animais ficam grudados pra sempre.
                const angle = Math.random() * Math.PI * 2;
                out.x += Math.cos(angle) * 0.5;
                out.y += Math.sin(angle) * 0.5;
                continue;
            }
            const d = Math.sqrt(dsq);
            // Força inversamente proporcional à distância (mais perto
            // = empurra mais). Cap em 1 quando colados.
            const force = 1 - d / minDist;
            out.x += (ddx / d) * force;
            out.y += (ddy / d) * force;
        }
        if (maxMag != null) {
            const mag = Math.sqrt(out.x * out.x + out.y * out.y);
            if (mag > maxMag) {
                out.x = (out.x / mag) * maxMag;
                out.y = (out.y / mag) * maxMag;
            }
        }
        return out;
    }

    /**
     * Touro ferindo um vizinho ao berrar. Só dispara via `pickNewState`
     * quando o `bull_bellow` realmente tocou (`played === true`). Pega
     * o vizinho mais próximo dentro do raio — o touro "investe num alvo",
     * não em todos os animais próximos. Pula quem já está ferido, doente
     * ou hospitalizado (consistente com `rollDailyForAll`).
     *
     * Severidade só pode ser `wound` ou `severe` (sem `scratch`): touro
     * é sério. Região é frontal (head/chest/back) com peso na cabeça —
     * chifrada é o cenário visual mais coerente.
     */
    _maybeBullBellowInjury() {
        if (!Array.isArray(animals)) return;
        if (Math.random() >= BULL_BELLOW_INJURY_CHANCE) return;

        let nearest = null;
        let nearestDistSq = BULL_BELLOW_INJURY_RADIUS * BULL_BELLOW_INJURY_RADIUS;
        const myCx = this.x + this.width / 2;
        const myCy = this.y + this.height / 2;
        for (const other of animals) {
            if (!other || other === this) continue;
            if (other.injury) continue;
            if (other.disease) continue;
            if (other.hospitalized) continue;
            const ocx = other.x + other.width / 2;
            const ocy = other.y + other.height / 2;
            const ddx = myCx - ocx;
            const ddy = myCy - ocy;
            const dsq = ddx * ddx + ddy * ddy;
            if (dsq < nearestDistSq) {
                nearest = other;
                nearestDistSq = dsq;
            }
        }
        if (!nearest) return;

        const severity = Math.random() < 0.6 ? 'wound' : 'severe';
        const r = Math.random();
        const region = r < 0.5 ? 'head' : r < 0.83 ? 'chest' : 'back';

        // Lazy via getSystem pra evitar ciclo de imports
        // (animalAI ← injurySystem ← theWorld ← animalAI).
        const injurySys = getSystem('animalInjury');
        injurySys?.inflict?.(nearest, severity, region, 'bull_bellow');
    }

    /**
     * Aplica diretamente um pequeno deslocamento de separação dos
     * vizinhos. Usado quando o animal está parado no raio do player
     * (dist < 60) — sem isso, vários followers convergem ao mesmo
     * ponto e ficam impossíveis de clicar individualmente.
     */
    _spreadFromNearbyAnimals() {
        const sep = this._computeSeparation(32);
        const mag = Math.sqrt(sep.x * sep.x + sep.y * sep.y);
        if (mag < 0.05) return;
        // Step pequeno (max ~1.5px/frame) — não atropela o sentimento de
        // "parado" do player, só desempilha gradualmente.
        const step = Math.min(mag * 1.5, 1.5);
        const dx = (sep.x / mag) * step;
        const dy = (sep.y / mag) * step;
        this._tryStep(dx, dy);
    }

    updateAnimation(now) {
        const isMoving = this.state === AnimalState.MOVE || this.state === AnimalState.FLEE ||
            (this.state === AnimalState.FOLLOW && this.following);

        const frameRate = isMoving ? ANIMATION.FRAME_RATE_MOVE_MS : ANIMATION.FRAME_RATE_IDLE_MS;

        const configuredFrames = this.frameCounts?.[this.state === AnimalState.MOVE ? 'move' : 'idle'];
        const maxFrames = Number.isFinite(configuredFrames)
            ? Math.min(this.cols, Math.max(1, Math.floor(configuredFrames)))
            : this.cols;

        if (now - this.lastFrameTime >= frameRate) {
            this.lastFrameTime = now;
            this.frameIndex = (this.frameIndex + 1) % maxFrames;
        }
    }

    draw(ctx, camera, frameNow) {
        if (!this.img || !camera) return;

        const screenPos = camera.worldToScreen(this.x, this.y);
        const zoomedWidth = this.width * camera.zoom;
        const zoomedHeight = this.height * camera.zoom;

        if (screenPos.x < -zoomedWidth || screenPos.x > camera.width ||
            screenPos.y < -zoomedHeight || screenPos.y > camera.height) return;

        // Timestamp do frame — usado em vários FX (bounce de emote, fade
        // out, pulse, etc). Aceita argumento do caller (gameLoop cacheia
        // 1x por frame e propaga); fallback pra `performance.now()` se
        // o caller for antigo. Sem isso, draw() chama performance.now()
        // 5+ vezes por animal por frame → 150 syscalls/frame com 30 animais.
        const _now = (frameNow != null) ? frameNow : performance.now();

        const sx = this.frameIndex * this.frameWidth;
        const sy = this.direction * this.frameHeight;
        const drawX = Math.floor(screenPos.x);
        const drawY = Math.floor(screenPos.y);

        if (this.flipX) {
            ctx.save();
            // Translada pro canto direito e inverte X — o sprite desenhado
            // em (0,0) cai exatamente no lugar de antes, só espelhado.
            ctx.translate(drawX + zoomedWidth, drawY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.img,
                sx, sy, this.frameWidth, this.frameHeight,
                0, 0, zoomedWidth, zoomedHeight
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                this.img,
                sx, sy, this.frameWidth, this.frameHeight,
                drawX, drawY, zoomedWidth, zoomedHeight
            );
        }

        if (this._mood !== AnimalMood.CALM) {
            const emoji = this.moodEmoji;
            if (emoji) {
                ctx.save();
                ctx.font = `${Math.round(14 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(emoji, Math.floor(screenPos.x + zoomedWidth / 2), Math.floor(screenPos.y - 4 * camera.zoom));
                ctx.restore();
            }
        }

        // Indicador de produto pronto pra coleta (🥛 leite, 🧶 lã, 🥚 ovo).
        // Desenhado um pouco acima do mood emoji, com leve bounce vertical
        // pra chamar atenção sem ser piscante demais. Visível em qualquer
        // mood (até SLEEPING — animal pode ter ovo pronto e estar dormindo,
        // coleta de manhã).
        if (this._pendingProduct) {
            const productEmoji = PRODUCT_EMOJI[this._pendingProduct] || '✨';
            const bounce = Math.sin(_now / 250) * 2 * camera.zoom;
            ctx.save();
            ctx.font = `${Math.round(16 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(
                productEmoji,
                Math.floor(screenPos.x + zoomedWidth / 2),
                Math.floor(screenPos.y - 20 * camera.zoom + bounce)
            );
            ctx.restore();
        }

        // FX de aging: sparkles ao redor + texto "Cresceu!" pulsando.
        // Dura ~2.5s (mais que coleta porque é evento memorável).
        if (this._ageUpFx) {
            const fx = this._ageUpFx;
            const elapsed = _now - fx.startedAt;
            const duration = fx.duration || 2500;
            if (elapsed >= duration) {
                this._ageUpFx = null;
            } else {
                const t = elapsed / duration;
                const alpha = 1 - Math.pow(t, 2);  // fade out quadrático
                const pulse = 1 + 0.15 * Math.sin(elapsed / 100);
                ctx.save();
                ctx.globalAlpha = alpha;

                // Texto "Cresceu!" pulsando acima
                ctx.font = `bold ${Math.round(13 * camera.zoom * pulse)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3 * camera.zoom;
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = '#d4a017';
                const tx = Math.floor(screenPos.x + zoomedWidth / 2);
                const ty = Math.floor(screenPos.y - 32 * camera.zoom - t * 12 * camera.zoom);
                ctx.strokeText(fx.text || '✨', tx, ty);
                ctx.fillText(fx.text || '✨', tx, ty);

                // 4 sparkles orbitando o sprite (rotação simples)
                ctx.font = `${Math.round(14 * camera.zoom)}px sans-serif`;
                const cx = screenPos.x + zoomedWidth / 2;
                const cy = screenPos.y + zoomedHeight / 2;
                const radius = (zoomedWidth + zoomedHeight) / 2 * (0.6 + t * 0.3);
                const angleBase = elapsed / 200;
                for (let i = 0; i < 4; i++) {
                    const ang = angleBase + i * Math.PI / 2;
                    const sx2 = cx + Math.cos(ang) * radius;
                    const sy2 = cy + Math.sin(ang) * radius;
                    ctx.fillText('✨', Math.floor(sx2), Math.floor(sy2));
                }
                ctx.restore();
            }
        }

        // Hitbox de interação (laranja/verde). Visível com `?hitboxes=1` na URL.
        // Verde = atualmente intersecta algo interagível (slot do cocho, etc.)
        if (getDebugFlag('hitboxes')) {
            const ih = this.getInteractionHitbox();
            const sp = camera.worldToScreen(ih.x, ih.y);
            const zoom = camera.zoom || 1;
            ctx.save();
            ctx.lineWidth = 2;
            if (this._interactionActive) {
                ctx.strokeStyle = 'rgba(80, 220, 100, 0.95)';
                ctx.fillStyle   = 'rgba(80, 220, 100, 0.30)';
            } else {
                ctx.strokeStyle = 'rgba(255, 140, 0, 0.95)';
                ctx.fillStyle   = 'rgba(255, 140, 0, 0.18)';
            }
            ctx.fillRect(Math.round(sp.x), Math.round(sp.y), Math.round(ih.w * zoom), Math.round(ih.h * zoom));
            ctx.strokeRect(Math.round(sp.x), Math.round(sp.y), Math.round(ih.w * zoom), Math.round(ih.h * zoom));
            ctx.restore();
        }

        // ─── Emote 💧 quando com sede (mas não bebendo ainda) ────────────
        // Aparece acima do animal quando thirst está abaixo do threshold,
        // dando feedback ao player sem abrir painel. Esconde durante
        // DRINKING (a barra já comunica). Bobbing leve pra chamar atenção.
        const isThirsty = (this.stats.thirst || 0) < this._drinkThreshold;
        const showThirstEmote = isThirsty && this.state !== AnimalState.DRINKING;
        if (showThirstEmote) {
            const now = _now;
            const bob = Math.sin(now / 280) * 2.5 * camera.zoom;
            const isSeeking = this.state === AnimalState.SEEKING_WATER;
            ctx.save();
            ctx.font = `${Math.round(15 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'center';
            // Sombra discreta pro emote destacar de qualquer fundo.
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 4 * camera.zoom;
            // Pulsa quando seeking (animal já está atrás de água — feedback "indo!"),
            // mais quieto quando só está com sede sem agir.
            ctx.globalAlpha = isSeeking ? (0.65 + 0.35 * Math.abs(Math.sin(now / 220))) : 0.85;
            ctx.fillText(
                '💧',
                Math.floor(screenPos.x + zoomedWidth / 2),
                Math.floor(screenPos.y - 30 * camera.zoom + bob)
            );
            ctx.restore();
        }

        // ─── Barra de sede + FX visual durante DRINKING ────────────────
        if (this.state === AnimalState.DRINKING) {
            const now = _now;
            const barW = Math.max(36, this.width * 0.75) * camera.zoom;
            const barH = 6 * camera.zoom;
            const radius = barH / 2;
            const bx = Math.floor(screenPos.x + (zoomedWidth - barW) / 2);
            const by = Math.floor(screenPos.y - 14 * camera.zoom);
            const pct = Math.max(0, Math.min(1, (this.stats.thirst || 0) / 100));

            // Quality mode: low = só barra básica (fill simples + outline).
            // Medium/high = todos os FX (halo, gradient, shine, bolhas, shadow).
            const heavyFX = qualityMode.enableHeavyFX;

            ctx.save();

            // Halo radial sob o animal (HEAVY — radialGradient é caro).
            if (heavyFX) {
                const haloX = screenPos.x + zoomedWidth / 2;
                const haloY = screenPos.y + zoomedHeight - 4 * camera.zoom;
                const haloR = Math.max(zoomedWidth, zoomedHeight) * 0.45;
                const halo = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, haloR);
                halo.addColorStop(0, 'rgba(120, 200, 255, 0.22)');
                halo.addColorStop(1, 'rgba(120, 200, 255, 0)');
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(haloX, haloY, haloR, 0, Math.PI * 2);
                ctx.fill();
            }

            // Ícone 💧 antes da barra (sempre — é só um texto).
            const iconBounce = heavyFX ? Math.sin(now / 200) * 1.5 * camera.zoom : 0;
            ctx.font = `${Math.round(11 * camera.zoom)}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            if (heavyFX) {
                ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
                ctx.shadowBlur = 3 * camera.zoom;
            }
            ctx.fillStyle = '#cde9ff';
            ctx.fillText('💧', bx - 3 * camera.zoom, by + barH / 2 + iconBounce);
            ctx.shadowBlur = 0;

            // Fundo da barra — gradient no high, cor sólida no low.
            if (heavyFX) {
                const bgGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
                bgGrad.addColorStop(0, 'rgba(8, 20, 38, 0.85)');
                bgGrad.addColorStop(1, 'rgba(4, 12, 24, 0.85)');
                ctx.fillStyle = bgGrad;
            } else {
                ctx.fillStyle = 'rgba(6, 16, 30, 0.85)';
            }
            this._roundRect(ctx, bx, by, barW, barH, radius);
            ctx.fill();

            // Preenchimento — gradient + shadow + shine no high, fill simples no low.
            const fillW = Math.max(0, Math.round(barW * pct));
            if (fillW > 1) {
                if (heavyFX) {
                    const pulse = 0.85 + 0.15 * Math.sin(now / 180);
                    const fillGrad = ctx.createLinearGradient(bx, by, bx, by + barH);
                    fillGrad.addColorStop(0, '#9be3ff');
                    fillGrad.addColorStop(0.5, '#5bbcff');
                    fillGrad.addColorStop(1, '#2d7ec8');
                    ctx.fillStyle = fillGrad;
                    ctx.shadowColor = `rgba(123, 200, 255, ${0.55 * pulse})`;
                    ctx.shadowBlur = 8 * camera.zoom;
                    this._roundRect(ctx, bx, by, fillW, barH, radius);
                    ctx.fill();
                    ctx.shadowBlur = 0;

                    // Shine animado atravessando a barra.
                    const shineX = bx + ((now / 12) % (barW + 20)) - 10;
                    if (shineX > bx && shineX < bx + fillW - 4) {
                        const shineGrad = ctx.createLinearGradient(shineX - 6, 0, shineX + 6, 0);
                        shineGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                        shineGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.55)');
                        shineGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
                        ctx.fillStyle = shineGrad;
                        ctx.fillRect(shineX - 6, by + 1, 12, barH - 2);
                    }
                } else {
                    // Low: fill chapado cyan.
                    ctx.fillStyle = '#5bbcff';
                    this._roundRect(ctx, bx, by, fillW, barH, radius);
                    ctx.fill();
                }
            }

            // Contorno (sempre — barato).
            ctx.strokeStyle = heavyFX ? 'rgba(255, 230, 180, 0.7)' : 'rgba(255, 230, 180, 0.4)';
            ctx.lineWidth = Math.max(1, camera.zoom);
            this._roundRect(ctx, bx, by, barW, barH, radius);
            ctx.stroke();

            // Bolhas subindo (HEAVY — 3 arcs por frame).
            if (heavyFX && fillW > 6) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                for (let i = 0; i < 3; i++) {
                    const phase = (now / 600 + i * 0.33) % 1;
                    const bbX = bx + 4 * camera.zoom + (i * (fillW - 10) / 3);
                    const bbY = by + barH - phase * (barH - 2);
                    if (bbX < bx + fillW - 2) {
                        ctx.beginPath();
                        ctx.arc(bbX, bbY, 1 * camera.zoom, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }

            ctx.restore();
        }

        // FX flutuante de coleta (sucesso/falha). Texto sobe e desaparece
        // em ~1.5s. Stroke branco pra legibilidade sobre qualquer fundo.
        if (this._collectFx) {
            const fx = this._collectFx;
            const elapsed = _now - fx.startedAt;
            const duration = fx.duration || 1500;
            if (elapsed >= duration) {
                this._collectFx = null;
            } else {
                const t = elapsed / duration;
                const alpha = 1 - t;
                const yOffset = -34 - (t * 18);  // sobe 18px no fim
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${Math.round(12 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.lineWidth = 3 * camera.zoom;
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = fx.success ? '#1f8b3a' : '#b73030';
                const tx = Math.floor(screenPos.x + zoomedWidth / 2);
                const ty = Math.floor(screenPos.y + yOffset * camera.zoom);
                ctx.strokeText(fx.text, tx, ty);
                ctx.fillText(fx.text, tx, ty);
                ctx.restore();
            }
        }
    }

    serialize() {
        return {
            assetName: this.assetName,
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            stats: { ...this.stats },
            isSuspicious: this._isSuspicious,
            gender: this.gender,
            customName: this.customName || null,
            injury: this.injury ? { ...this.injury } : null,
            disease: this.disease
                ? {
                    ...this.disease,
                    treatment: this.disease.treatment ? { ...this.disease.treatment } : undefined,
                    lastMedicine: this.disease.lastMedicine ? { ...this.disease.lastMedicine } : undefined,
                }
                : null,
            statRateMultipliers: this._statRateMultipliers
                ? { ...this._statRateMultipliers } : null,
            petsToday: this.petsToday,
            petAttempts: this.petAttempts,
            lastPetDay: this.lastPetDay,
            following: this.following,
            // Produção persistida
            pendingProduct:  this._pendingProduct ?? null,
            pendingTool:     this._pendingTool    ?? null,
            lastProducedDay: this._lastProducedDay ?? -1,
            // Aging / lifecycle
            daysOld:   this._daysOld   ?? 0,
            lifeStage: this._lifeStage ?? 'adult',
            avgMoral:  this._avgMoral  ?? this.stats.moral,
            lifespan:  this._lifespan  ?? 90,
        };
    }

    deserialize(data) {
        if (!data) return;
        if (Number.isFinite(data.x)) this.x = data.x;
        if (Number.isFinite(data.y)) this.y = data.y;
        if (data.stats) {
            this.stats.hunger = data.stats.hunger ?? this.stats.hunger;
            this.stats.thirst = data.stats.thirst ?? this.stats.thirst;
            this.stats.moral  = data.stats.moral  ?? this.stats.moral;
        }
        this._isSuspicious = data.isSuspicious ?? false;
        // Saves anteriores ao gênero: mantém o que o construtor sorteou via SPECIES_GENDER.
        if (data.gender) this.gender = data.gender;
        // customName persiste no save desde esta versão. Para saves antigos
        // (sem o campo), o UiPanel continua carregando do localStorage map
        // quando abre — mas painéis que não abrem o UiPanel (vet, hospital)
        // agora veem o nome direto do animal sem precisar daquela ida prévia.
        if (data.customName !== undefined) this.customName = data.customName || '';
        // Migração: saves antigos guardavam apenas `isHurt: true/false`.
        // Sem severidade/região concretas, traduzimos para uma ferida na perna —
        // o jogador resolve no vet, e o estado não fica "sem ferida" por engano.
        if (data.injury !== undefined) {
            this.injury = data.injury;
        } else if (data.isHurt) {
            this.injury = { severity: 'wound', region: 'leg', daysSince: 0 };
        } else {
            this.injury = null;
        }
        // Doença persistida. Saves antigos não têm o campo → animal saudável.
        this.disease = data.disease ?? null;
        // Metabolismo individual: preserva entre saves. Em saves antigos
        // sem o campo, mantém o que o construtor sorteou.
        if (data.statRateMultipliers) {
            this._statRateMultipliers = { ...data.statRateMultipliers };
        }
        this.petsToday = data.petsToday ?? 0;
        this.petAttempts = data.petAttempts ?? 0;
        this.lastPetDay = data.lastPetDay ?? -1;
        this.following = data.following ?? false;
        if (this.following) this.state = AnimalState.FOLLOW;
        // Produção
        this._pendingProduct  = data.pendingProduct  ?? null;
        this._pendingTool     = data.pendingTool     ?? null;
        this._lastProducedDay = data.lastProducedDay ?? -1;
        // Aging / lifecycle. Saves antigos sem campo: filhote começa 'young',
        // adulto começa 'adult' (fallback via assetName).
        this._daysOld   = data.daysOld   ?? 0;
        this._lifeStage = data.lifeStage ?? this._defaultLifeStageFromAsset(this.assetName);
        this._avgMoral  = data.avgMoral  ?? this.stats.moral;
        this._lifespan  = data.lifespan  ?? (85 + Math.floor(Math.random() * 26));
        this.recalcMood();
    }
}