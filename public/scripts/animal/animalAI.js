/**
 * @file animalAI.js - Artificial Intelligence System for Animals
 * Implements autonomous behavior with movement and idle states.
 * Handles collisions, animations, world navigation,
 * stats (hunger, thirst, moral), moods and interactions (pet, feed, guide).
 */

import { logger } from '../logger.js';
import { collisionSystem } from "../collisionSystem.js";
import { getSystem, getObject } from '../gameState.js';
import { IDLE_STATE_MIN_MS, IDLE_STATE_MAX_MS, MOVE_STATE_MIN_MS, MOVE_STATE_MAX_MS, MOVEMENT, ANIMATION, RANGES } from '../constants.js';
import { items } from '../item.js';
import { animals } from '../theWorld.js';

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
};

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
// (0.7-1.3). É o "metabolismo" individual: alguns ficam com fome muito
// mais rápido, outros sentem sede menos, etc. Isso quebra o lockstep
// entre animais da mesma espécie sem precisar de constantes diferentes.
const PER_ANIMAL_RATE_MULT_MIN = 0.7;
const PER_ANIMAL_RATE_MULT_MAX = 1.3;

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
        // Ferimento atual: null = saudável, ou { severity, region, daysSince }.
        // Arranhão é leve e NÃO dispara mood HURT (ver getter `_isHurt`).
        this.injury = opts.injury ?? null;
        // Doença atual: null = saudável, ou { id, daysSince, diagnosed }.
        // Enquanto não diagnosticada, o UiPanel exibe apenas "?".
        this.disease = opts.disease ?? null;
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
        const cb = this.collisionBox;
        return {
            x: this.x + (cb.offsetX || 0),
            y: this.y + (cb.offsetY || 0),
            width: cb.width || this.width,
            height: cb.height || this.height
        };
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

    get mood() {
        return this._mood;
    }

    get moodEmoji() {
        return MOOD_EMOJIS[this._mood] || '';
    }

    updateStats() {
        const now = performance.now();

        // Reset diário de carinhos
        const daySys = getSystem('dayNight') || getSystem('weather');
        // weatherSystem expõe `day`; dayNightSystem expõe `dayCount` — aceitar ambos.
        const currentDay = daySys?.dayCount ?? daySys?.day;
        if (currentDay != null && currentDay !== this.lastPetDay) {
            this.lastPetDay = currentDay;
            this.petsToday = 0;
        }

        // Cada stat tem sua própria taxa efetiva. Moral inclui penalidades de
        // ferimento e de clima ruim (storm/blizzard/rain).
        const moralRate = MORAL_DECAY_PER_MIN
            + this._injuryMoralDecayExtra()
            + this._diseaseMoralDecayExtra()
            + this._weatherMoralPenaltyPerMin();

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
        // Multiplicador permanente do animal pra esse stat (metabolismo
        // individual). Sem ele, animais da mesma espécie decaem em
        // lockstep porque o jitter por tick converge na média.
        const animalMult = this._statRateMultipliers?.[key] ?? 1;
        const drop = ratePerMin * animalMult * minutes * magnitudeJitter;

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

    feed() {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            return { success: false, message: 'suspicious' };
        }

        const inv = getSystem('inventory');
        if (!inv) return { success: false, message: 'no_inventory' };

        let feedItem = null;

        if (typeof inv.findFirstItemInCategory === 'function') {
            feedItem = inv.findFirstItemInCategory('animal_food', item => item.quantity > 0);
        } else if (inv.categories && inv.categories.animal_food && inv.categories.animal_food.items) {
            feedItem = inv.categories.animal_food.items.find(item => item.quantity > 0);
        } else if (typeof inv.findItem === 'function') {
            feedItem = inv.findItem(item => item.type === 'animal_food' || item.id === 'animal_feed_basic' || item.category === 'animal_food');
        }

        if (!feedItem) {
            return { success: false, message: 'no_food' };
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
        const daySys = getSystem('weather');
        const day = daySys?.day ?? 0;
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
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            this._startFlee();
            return { success: false, message: 'suspicious_flee' };
        }
        if (this._mood === AnimalMood.ANGRY) {
            return { success: false, message: 'angry' };
        }

        // Animais gravemente feridos podem recusar seguir.
        // Só vale ao iniciar o follow (parar de seguir nunca recusa).
        if (!this.following) {
            const chance = this._injuryAcceptChance();
            if (chance < 1 && Math.random() > chance) {
                return { success: false, message: 'severe_refused' };
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
        if (this.__uiPaused && !this.following && this.state !== AnimalState.FLEE) return;

        const now = performance.now();

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

        if (now - this.stateTimer > this.stateDuration) {
            this.pickNewState();
            this.stateTimer = now;
        }

        if (this.state === AnimalState.MOVE) {
            this.move();
        }

        this.updateAnimation(now);
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
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
            } else {
                this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
            }
            return;
        }

        const speed = MOVEMENT.ANIMAL_SPEED * 1.2 * this._injurySpeedMult();
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
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
        }

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
                    }
                }
            }
        }
    }

    updateDirection() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
        }
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

        const speed = MOVEMENT.ANIMAL_SPEED * speedMult * this._injurySpeedMult();
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
        if (this._tryStep(vx, vy)) {
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
            if (yValid && this._tryStep(0, vy)) { this._lastEscapeAxis = 'y'; return true; }
            if (xValid && this._tryStep(vx, 0)) { this._lastEscapeAxis = 'x'; return true; }
        } else {
            if (xValid && this._tryStep(vx, 0)) { this._lastEscapeAxis = 'x'; return true; }
            if (yValid && this._tryStep(0, vy)) { this._lastEscapeAxis = 'y'; return true; }
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
            if (this._tryStep(vx * c - vy * s, vx * s + vy * c)) return true;
            if (this._tryStep(vx * c + vy * s, -vx * s + vy * c)) return true;
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
    _tryStep(dx, dy) {
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        const boxX = nextX + (this.collisionBox.offsetX || 0);
        const boxY = nextY + (this.collisionBox.offsetY || 0);

        const willCollide = (typeof collisionSystem.areaCollides === 'function')
            ? collisionSystem.areaCollides(
                boxX, boxY,
                this.collisionBox.width, this.collisionBox.height,
                this.id,
                { ignoreTypes: ['ANIMAL'] }
              )
            : false;

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
        if (!Array.isArray(animals)) return out;
        const myCx = this.x + this.width / 2;
        const myCy = this.y + this.height / 2;
        const minSq = minDist * minDist;
        for (const other of animals) {
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

    draw(ctx, camera) {
        if (!this.img || !camera) return;

        const screenPos = camera.worldToScreen(this.x, this.y);
        const zoomedWidth = this.width * camera.zoom;
        const zoomedHeight = this.height * camera.zoom;

        if (screenPos.x < -zoomedWidth || screenPos.x > camera.width ||
            screenPos.y < -zoomedHeight || screenPos.y > camera.height) return;

        const sx = this.frameIndex * this.frameWidth;
        const sy = this.direction * this.frameHeight;

        ctx.drawImage(
            this.img,
            sx, sy, this.frameWidth, this.frameHeight,
            Math.floor(screenPos.x), Math.floor(screenPos.y), zoomedWidth, zoomedHeight
        );

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
    }

    serialize() {
        return {
            assetName: this.assetName,
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            stats: { ...this.stats },
            isSuspicious: this._isSuspicious,
            injury: this.injury ? { ...this.injury } : null,
            disease: this.disease ? { ...this.disease } : null,
            statRateMultipliers: this._statRateMultipliers
                ? { ...this._statRateMultipliers } : null,
            petsToday: this.petsToday,
            petAttempts: this.petAttempts,
            lastPetDay: this.lastPetDay,
            following: this.following,
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
        this.recalcMood();
    }
}