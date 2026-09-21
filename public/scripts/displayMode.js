/**
 * @file displayMode.js - Preferência de modo de tela (tela cheia / janela).
 *
 * Fonte única pra config in-game (settingsUI) e do menu principal (mainMenu).
 * No shell (CEF) aplica via `cefQuery`, que não exige gesto do usuário — por
 * isso dá pra aplicar a preferência salva no boot. No navegador comum cai na
 * Fullscreen API, que só funciona dentro de um clique.
 */
const STORAGE_KEY = 'farmxp.displayMode';
const MODES = ['fullscreen', 'windowed'];

export const displayMode = {
  get pref() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return MODES.includes(v) ? v : 'fullscreen';
    } catch {
      return 'fullscreen';
    }
  },

  /** Salva e aplica. `fromUser` = veio de um clique (libera a Fullscreen API). */
  set(mode, { fromUser = false } = {}) {
    if (!MODES.includes(mode)) return;
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
    this.apply(mode, { fromUser });
  },

  apply(mode = this.pref, { fromUser = false } = {}) {
    const fullscreen = mode === 'fullscreen';
    if (typeof window.cefQuery === 'function') {
      window.cefQuery({
        request: `display:${fullscreen ? 'fullscreen' : 'windowed'}`,
        onSuccess() {},
        onFailure() {},
      });
      return;
    }
    if (!fromUser) return;
    try {
      if (fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else if (!fullscreen && document.fullscreenElement) document.exitFullscreen?.();
    } catch {}
  },
};

export default displayMode;
