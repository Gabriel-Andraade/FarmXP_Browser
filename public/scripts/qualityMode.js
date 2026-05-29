/**
 * @file qualityMode.js - Detecta capacidade do device + expõe nível de qualidade.
 *
 * Sinais de detecção:
 *   - navigator.hardwareConcurrency — número de cores lógicos. < 4 = fraco.
 *   - navigator.deviceMemory        — RAM em GB. < 4 = fraco.
 *   - navigator.connection.saveData — usuário pediu economia de dados.
 *   - Frame budget (medido nos primeiros 60 frames) — se passa de 25ms
 *     em média, downgrade dinâmico de high → medium → low.
 *
 * Cada sistema (weather, animal FX, etc.) lê `qualityMode.level` e
 * ajusta sua carga: menos partículas, menos sparkles, sem halos no chão.
 *
 * Override manual via URL: `?quality=high|medium|low` ou devtools:
 * `qualityMode.setLevel('low')`.
 */

const QUALITY_LEVELS = ['high', 'medium', 'low'];

function _detectInitialLevel() {
  // Override via URL pra debug / forçar.
  try {
    const q = new URLSearchParams(window.location.search).get('quality');
    if (q && QUALITY_LEVELS.includes(q)) return q;
  } catch {}

  let score = 100;

  // CPU cores: <4 muito penalizado, 4 OK, >6 bonus.
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) score -= 40;
  else if (cores <= 4) score -= 15;

  // RAM: navigator.deviceMemory disponível em Chromium-based.
  const mem = navigator.deviceMemory || 4;
  if (mem <= 2) score -= 30;
  else if (mem <= 4) score -= 10;

  // Save-Data hint (4G econômica, browser flag de poupar dados).
  try {
    if (navigator.connection?.saveData) score -= 20;
  } catch {}

  // Effective network type — slow-2g/2g indicam ambiente apertado.
  try {
    const eff = navigator.connection?.effectiveType;
    if (eff === '2g' || eff === 'slow-2g') score -= 15;
  } catch {}

  if (score < 50) return 'low';
  if (score < 80) return 'medium';
  return 'high';
}

const _listeners = new Set();

export const qualityMode = {
  level: _detectInitialLevel(),

  /** Multiplicadores aplicados pelos sistemas. Lê uma vez e usa. */
  get particleMult() {
    switch (this.level) {
      case 'low':    return 0.35;  // 1/3 das partículas
      case 'medium': return 0.7;
      default:       return 1.0;
    }
  },

  /** Liga/desliga FX caros (halo radial, shine animado, bolhas). */
  get enableHeavyFX() {
    return this.level !== 'low';
  },

  /** Cap de FPS — em low, força 30fps pra dar respiro ao CPU. */
  get fpsCap() {
    return this.level === 'low' ? 30 : 60;
  },

  /** Permite trocar manualmente (debug / config no futuro). */
  setLevel(level) {
    if (!QUALITY_LEVELS.includes(level)) return;
    if (level === this.level) return;
    this.level = level;
    for (const fn of _listeners) {
      try { fn(level); } catch {}
    }
  },

  /** Inscreve-se em mudanças (pra hot-reload de partículas, etc). */
  onChange(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
};

// Auto-downgrade dinâmico: monitora frame budget pelos primeiros 60 frames
// VÁLIDOS. Frames com tab em background são SKIPADOS — browser throttla rAF
// pra ~1Hz quando tab oculta, o que faria o probe achar que o device é
// fraco mesmo num PC potente.
if (typeof window !== 'undefined') {
  let frameCount = 0;
  let frameSum = 0;
  let lastT = 0;
  const probeFrame = (t) => {
    // Reset se tab oculta — não confia em medições com rAF throttlado.
    if (typeof document !== 'undefined' && document.hidden) {
      frameCount = 0;
      frameSum = 0;
      lastT = 0;
      requestAnimationFrame(probeFrame);
      return;
    }
    if (lastT) {
      const dt = t - lastT;
      // Outlier guard: dt > 100ms quase certo é tab switch / GC pause /
      // ou rAF throttle. Ignora pra não poluir a média.
      if (dt < 100) {
        frameSum += dt;
        frameCount++;
      }
      if (frameCount >= 60) {
        const avg = frameSum / frameCount;
        if (avg > 32 && qualityMode.level === 'high') qualityMode.setLevel('medium');
        else if (avg > 50 && qualityMode.level === 'medium') qualityMode.setLevel('low');
        return;  // para de medir
      }
    }
    lastT = t;
    requestAnimationFrame(probeFrame);
  };
  // Espera o primeiro paint estabilizar (game loop arrancar, animais
  // carregados) antes de começar a medir. Frames iniciais costumam ser
  // 50-100ms só pela carga de init, não representam o steady state.
  setTimeout(() => requestAnimationFrame(probeFrame), 3000);

  // Expor pra devtools.
  window.qualityMode = qualityMode;
}

export default qualityMode;
