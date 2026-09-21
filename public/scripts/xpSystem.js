/**
 * @file xpSystem.js - Sistema de experiência e níveis do jogador.
 * @description
 *   Gerencia XP acumulado, nível atual e progresso para o próximo nível.
 *   Foi desenhado para ser GENÉRICO: qualquer sistema (quests, achievements,
 *   conquistas diárias, etc.) pode chamar `grantXP(amount, source)` e o
 *   sistema trata overflow de nível, emite eventos e persiste no save.
 *
 *   Curva padrão de XP por nível (XP necessário para subir do nível N para N+1):
 *     Nível 1 → 2: 100
 *     Nível 2 → 3: 250
 *     Nível 3 → 4: 450
 *     Nível 4 → 5: 700
 *     Nível 5 → 6: 1000
 *     Nível N → N+1: 100 + 150·(N-1) + 50·(N-1)·(N-2)/2
 *
 *   A curva pode ser trocada via `setCurve(fn)` — útil para balancear ou
 *   carregar de um arquivo de configuração futuro.
 *
 *   Eventos emitidos em `document`:
 *     - `xpGained`   → { amount, source, xp, xpToNext, level, totalXp }
 *     - `levelUp`    → { level, previousLevel, carryXp, xpToNext }
 *
 * @module XPSystem
 */

import { registerSystem, getSystem } from './gameState.js';
import { logger } from './logger.js';

// ─── Curva padrão ────────────────────────────────────────────────────────────

/**
 * Quanto XP precisa para subir do nível `level` para `level + 1`.
 * Progressão quadrática suave: delta cresce +50 a cada nível.
 * @param {number} level - nível atual (>= 1)
 * @returns {number} XP necessário (sempre inteiro positivo)
 */
function defaultCurve(level) {
    const L = Math.max(1, Math.floor(level));
    return Math.round(100 + 150 * (L - 1) + 50 * (L - 1) * (L - 2) / 2);
}

// ─── Class ────────────────────────────────────────────────────────────────────

export class XPSystem {
    constructor() {
        /** Nível atual (>= 1) */
        this.level = 1;
        /** XP acumulado DENTRO do nível atual (não o total histórico). */
        this.xp = 0;
        /** Total histórico — útil pra achievements do tipo "ganhe 10k de XP". */
        this.totalXp = 0;
        /** Função de curva trocável (grant atual). */
        this._curve = defaultCurve;
    }

    // ── Curva ──

    /**
     * Troca a curva de XP por nível. A função deve receber `level` (>=1) e
     * retornar o XP necessário para subir ao próximo nível.
     * @param {(level:number) => number} fn
     */
    setCurve(fn) {
        if (typeof fn !== 'function') return;
        this._curve = fn;
    }

    /**
     * XP necessário pra sair do nível `level` para o próximo.
     * @param {number} [level=this.level]
     */
    xpForLevel(level = this.level) {
        const n = this._curve(level);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100;
    }

    // ── API pública ──

    /** @returns {number} nível atual */
    getLevel() { return this.level; }

    /** @returns {number} XP dentro do nível atual */
    getXP() { return this.xp; }

    /** @returns {number} total histórico de XP ganho */
    getTotalXP() { return this.totalXp; }

    /** @returns {number} XP necessário pra terminar o nível atual */
    getXPToNext() { return this.xpForLevel(this.level); }

    /**
     * Concede XP. Faz carry-over automático através de múltiplos níveis se
     * o valor for grande o suficiente.
     * @param {number} amount   - quantia de XP (positiva; valores inválidos são ignorados)
     * @param {string} [source] - identificador opcional da origem (ex: 'quest:lucas_secret')
     * @returns {{gained:number, level:number, xp:number, xpToNext:number, leveledUp:boolean, levelsGained:number}}
     */
    grantXP(amount, source = 'unknown') {
        if (!Number.isFinite(amount) || amount <= 0) {
            return {
                gained: 0,
                level: this.level,
                xp: this.xp,
                xpToNext: this.getXPToNext(),
                leveledUp: false,
                levelsGained: 0,
            };
        }
        const add = Math.floor(amount);
        this.xp += add;
        this.totalXp += add;

        let levelsGained = 0;
        const startingLevel = this.level;
        let needed = this.xpForLevel(this.level);
        // Carry-over: subir múltiplos níveis se o grant for grande
        while (this.xp >= needed) {
            this.xp -= needed;
            this.level += 1;
            levelsGained += 1;
            needed = this.xpForLevel(this.level);

            document.dispatchEvent(new CustomEvent('levelUp', {
                detail: {
                    level: this.level,
                    previousLevel: this.level - 1,
                    carryXp: this.xp,
                    xpToNext: needed,
                    source,
                },
            }));
            logger.info(`[XPSystem] Level up! ${this.level - 1} → ${this.level} (source: ${source})`);
        }

        const xpToNext = this.getXPToNext();
        document.dispatchEvent(new CustomEvent('xpGained', {
            detail: {
                amount: add,
                source,
                xp: this.xp,
                xpToNext,
                level: this.level,
                totalXp: this.totalXp,
                leveledUp: levelsGained > 0,
                levelsGained,
            },
        }));

        // Marca save como dirty para persistir o progresso.
        const save = getSystem('save');
        if (save?.markDirty) save.markDirty();

        return {
            gained: add,
            level: this.level,
            xp: this.xp,
            xpToNext,
            leveledUp: levelsGained > 0,
            levelsGained,
        };
    }

    // ── Save/Load ──

    /**
     * Snapshot serializável do estado.
     * @returns {{level:number, xp:number, totalXp:number}}
     */
    getState() {
        return {
            level: this.level,
            xp: this.xp,
            totalXp: this.totalXp,
        };
    }

    /**
     * Restaura estado a partir do save. Silencioso em entradas inválidas.
     * @param {{level?:number, xp?:number, totalXp?:number}} data
     */
    setState(data) {
        if (!data || typeof data !== 'object') return;
        const lvl = Number.isFinite(data.level) ? Math.max(1, Math.floor(data.level)) : 1;
        const xp  = Number.isFinite(data.xp)    ? Math.max(0, Math.floor(data.xp))    : 0;
        const tot = Number.isFinite(data.totalXp) ? Math.max(0, Math.floor(data.totalXp)) : xp;
        this.level = lvl;
        this.xp = xp;
        this.totalXp = tot;
        // Notifica HUD pra re-renderizar sem emitir xpGained (não é ganho de XP).
        document.dispatchEvent(new CustomEvent('xpRestored', {
            detail: {
                level: this.level,
                xp: this.xp,
                xpToNext: this.getXPToNext(),
                totalXp: this.totalXp,
            },
        }));
    }

    /** Reseta tudo pra um jogo novo. */
    reset() {
        this.level = 1;
        this.xp = 0;
        this.totalXp = 0;
        document.dispatchEvent(new CustomEvent('xpRestored', {
            detail: { level: 1, xp: 0, xpToNext: this.getXPToNext(), totalXp: 0 },
        }));
    }
}

// ─── Singleton ─────────────────────────────────────────────────────────────────

export const xpSystem = new XPSystem();

registerSystem('xp', xpSystem);

// Exposição legacy para que quests antigas/UIs possam chamar direto.
if (typeof window !== 'undefined') {
    window.xpSystem = xpSystem;
}

export default xpSystem;
