/**
 * @file qualityMode.js - Detecta capacidade do device + expõe nível de qualidade.
 *
 * Sinais de detecção (modo "auto"):
 *   - navigator.hardwareConcurrency — número de cores lógicos. < 4 = fraco.
 *   - navigator.deviceMemory        — RAM em GB. < 4 = fraco.
 *   - navigator.connection.saveData — usuário pediu economia de dados.
 *   - Frame budget (medido nos primeiros 60 frames) — se passa de 32ms
 *     em média, downgrade dinâmico de high → medium → low.
 *
 * Preferência do jogador (`pref`): 'auto' | 'high' | 'medium' | 'low',
 * persistida em localStorage. Em 'auto' o nível é detectado e pode cair
 * dinamicamente; num nível manual, o auto-downgrade é DESLIGADO (respeita a
 * escolha). A UI de settings troca via `setPreference()`.
 *
 * Cada sistema (weather, animal FX, etc.) lê `qualityMode.level` (ou os
 * getters particleMult/enableHeavyFX/fpsCap) e ajusta sua carga.
 *
 * Override de sessão via URL: `?quality=high|medium|low` (debug — não altera
 * a preferência salva). Devtools: `qualityMode.setPreference('low')`.
 */

const QUALITY_LEVELS = ['high', 'medium', 'low'];
const PREF_OPTIONS = ['auto', 'high', 'medium', 'low'];
const STORAGE_KEY = 'farmxp_quality';
const STORAGE_KEY_FPS = 'farmxp_fpscap';

/** Lê o toggle "limitar FPS a 30" (persistido). */
function _readCapFps() {
    try { return localStorage.getItem(STORAGE_KEY_FPS) === '1'; }
    catch { return false; }
}

/** Force de sessão via `?quality=` (só debug; não persiste). */
function _urlOverride() {
    try {
        const q = new URLSearchParams(window.location.search).get('quality');
        if (q && QUALITY_LEVELS.includes(q)) return q;
    } catch { /* SSR / no window */ }
    return null;
}

/** Lê a preferência salva; default 'auto'. */
function _readPref() {
    try {
        const p = localStorage.getItem(STORAGE_KEY);
        if (p && PREF_OPTIONS.includes(p)) return p;
    } catch { /* storage bloqueado */ }
    return 'auto';
}

/** Score de hardware → nível inicial no modo 'auto'. */
function _detectLevel() {
    let score = 100;
    // navigator pode não existir em SSR / import de teste.
    const nav = typeof navigator !== 'undefined' ? navigator : {};

    const cores = nav.hardwareConcurrency || 4;
    if (cores <= 2) score -= 40;
    else if (cores <= 4) score -= 15;

    const mem = nav.deviceMemory || 4;
    if (mem <= 2) score -= 30;
    else if (mem <= 4) score -= 10;

    try { if (nav.connection?.saveData) score -= 20; } catch { /* no NetInfo */ }
    try {
        const eff = nav.connection?.effectiveType;
        if (eff === '2g' || eff === 'slow-2g') score -= 15;
    } catch { /* no NetInfo */ }

    if (score < 50) return 'low';
    if (score < 80) return 'medium';
    return 'high';
}

const _listeners = new Set();
const _urlForced = _urlOverride();
const _initialPref = _readPref();

export const qualityMode = {
    /** Preferência do jogador: 'auto' | 'high' | 'medium' | 'low'. */
    pref: _initialPref,

    /** Nível efetivo atual: 'high' | 'medium' | 'low'. */
    level: _urlForced || (_initialPref === 'auto' ? _detectLevel() : _initialPref),

    /** Multiplicador de CONTAGEM de partículas (menos volume em hardware fraco). */
    get particleMult() {
        switch (this.level) {
            case 'low':    return 0.25;  // 1/4 das partículas
            case 'medium': return 0.7;
            default:       return 1.0;
        }
    },

    /**
     * Máximo de sub-steps de física de partículas por frame. O update usa um
     * acumulador de timestep fixo (0.016s); sem teto, um frame lento roda
     * VÁRIOS sub-steps pra "recuperar" a velocidade — mais custo justo quando o
     * CPU já está afogado (espiral de morte). Capando (e descartando o excesso),
     * as partículas rodam no ritmo do frame: menos fluidas no low, mas baratas.
     */
    get maxParticleSteps() {
        switch (this.level) {
            case 'low':    return 1;
            case 'medium': return 2;
            default:       return 4;
        }
    },

    /**
     * Fator de resolução do canvas principal. No low renderiza num backing
     * store menor (menos pixels = grande alívio de GPU/fill-rate) e o CSS
     * estica pra caber — imagem um pouco mais suave, câmera/coords intactas.
     */
    get renderScale() {
        return this.level === 'low' ? 0.75 : 1.0;
    },

    /** Liga/desliga FX caros (halo radial, shine animado, bolhas). */
    get enableHeavyFX() {
        return this.level !== 'low';
    },

    /** Toggle manual "limitar FPS a 30" (independente do nível). */
    _capFps: _readCapFps(),
    get capFps() { return this._capFps; },

    /** Cap de FPS — 30 no nível low OU se o jogador ligou o limite manual. */
    get fpsCap() {
        return (this.level === 'low' || this._capFps) ? 30 : 60;
    },

    /**
     * Liga/desliga o limite manual de FPS (persistido). NÃO dispara onChange —
     * o game loop lê fpsCap a cada frame, e o nível/renderScale/partículas não
     * mudam. Evita resize de canvas + reset de partículas à toa.
     */
    setCapFps(on) {
        const val = !!on;
        if (val === this._capFps) return;
        this._capFps = val;
        try { localStorage.setItem(STORAGE_KEY_FPS, val ? '1' : '0'); } catch { /* storage bloqueado */ }
    },

    /**
     * Troca o nível EFETIVO (uso interno: probe de auto-downgrade e
     * setPreference). Não mexe na preferência salva. Dispara onChange.
     */
    setLevel(level) {
        if (!QUALITY_LEVELS.includes(level)) return;
        if (level === this.level) return;
        this.level = level;
        for (const fn of _listeners) {
            try { fn(level); } catch { /* listener não pode derrubar os outros */ }
        }
    },

    /**
     * Troca a PREFERÊNCIA do jogador (persistida). 'auto' re-detecta e
     * religa o auto-downgrade; um nível manual desliga o auto-downgrade.
     */
    setPreference(pref) {
        if (!PREF_OPTIONS.includes(pref)) return;
        this.pref = pref;
        try { localStorage.setItem(STORAGE_KEY, pref); } catch { /* storage bloqueado */ }

        if (pref === 'auto') {
            this.setLevel(_detectLevel());
            _startProbe(); // religa o monitoramento dinâmico
        } else {
            this.setLevel(pref);
            _stopProbe();  // respeita a escolha manual — sem downgrade automático
        }
    },

    /** Inscreve-se em mudanças de nível (ex: regenerar partículas). */
    onChange(fn) {
        _listeners.add(fn);
        return () => _listeners.delete(fn);
    },
};

// ── Auto-downgrade dinâmico (só no modo 'auto') ───────────────────────────
// Monitora frame budget pelos primeiros 60 frames VÁLIDOS. Frames com a tab
// em background são SKIPADOS — o browser throttla rAF pra ~1Hz quando a tab
// está oculta, o que faria o probe achar que o device é fraco num PC potente.
let _probeToken = 0;

function _stopProbe() { _probeToken++; }

function _startProbe() {
    if (typeof window === 'undefined') return;
    if (qualityMode.pref !== 'auto' || _urlForced) return;

    const token = ++_probeToken;
    let frameCount = 0;
    let frameSum = 0;
    let lastT = 0;

    const probeFrame = (t) => {
        if (token !== _probeToken) return; // preferência mudou → aborta este probe
        if (typeof document !== 'undefined' && document.hidden) {
            frameCount = 0; frameSum = 0; lastT = 0;
            requestAnimationFrame(probeFrame);
            return;
        }
        if (lastT) {
            const dt = t - lastT;
            // Outlier guard: dt > 100ms quase certo é tab switch / GC / throttle.
            if (dt < 100) { frameSum += dt; frameCount++; }
            if (frameCount >= 60) {
                const avg = frameSum / frameCount;
                // Severo (>50ms) cai direto pra low, mesmo vindo de high — senão
                // um device muito lento pararia em medium (o probe é one-shot).
                if (avg > 50 && qualityMode.level !== 'low') qualityMode.setLevel('low');
                else if (avg > 32 && qualityMode.level === 'high') qualityMode.setLevel('medium');
                return; // para de medir
            }
        }
        lastT = t;
        requestAnimationFrame(probeFrame);
    };

    // Espera o primeiro paint estabilizar (game loop arrancar, animais
    // carregados) antes de medir — frames iniciais são 50-100ms só de init.
    setTimeout(() => requestAnimationFrame(probeFrame), 3000);
}

if (typeof window !== 'undefined') {
    if (_initialPref === 'auto' && !_urlForced) _startProbe();
    window.qualityMode = qualityMode; // devtools
}

/**
 * Escala efetiva do canvas principal = DPR do device × renderScale do nível.
 * Fonte ÚNICA pra dimensionar o backing store, o ctx.setTransform e a
 * conversão de coordenadas (mouse/touch → mundo) — todos precisam concordar,
 * senão os cliques desalinham.
 */
export function deviceScale() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    return dpr * qualityMode.renderScale;
}

export default qualityMode;
