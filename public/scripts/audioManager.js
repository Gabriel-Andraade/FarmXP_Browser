/**
 * @file audioManager.js - Sistema de áudio do FarmingXP
 * @description Gerencia música de fundo (day-theme / night-theme) com fade in/out
 * suave via requestAnimationFrame + curva ease, volume ajustável via configurações
 * e troca automática baseada no horário do jogo.
 *
 * Durações conhecidas:
 *   day-theme  ≈ 61 s
 *   night-theme ≈ 43 s

 */

import { registerSystem, getSystem } from './gameState.js';
import { logger } from './logger.js';

const STORAGE_KEY = 'farmxp_musicVolume';
const AMBIENT_VOLUME_KEY = 'farmxp_ambientVolume';
const ANIMAL_VOLUME_KEY = 'farmxp_animalVolume';
const DEFAULT_VOLUME = 0.5;

/**
 * Fração da duração total da track usada para fade in e fade out.
 * Ex.: 0.18 = 18 % do áudio é fade in e 18 % é fade out.
 */
const FADE_RATIO = 0.18;

/** Limites de segurança para a duração do fade (segundos) */
const FADE_MIN_SEC = 4;
const FADE_MAX_SEC = 12;

/* ── SFX 3D (WebAudio) ────────────────────────── */
const SFX_BASE_PATH = './assets/audio/sfx/';
const SFX_FILES = {
  wood_hit: 'wood_hit.mp3',
  stone_hit: 'stone_hit.mp3',
  thick_hit: 'thick_hit.mp3',
  bull_bellow: 'bull_bellow.mp3',
  light_rain: 'light_rain.mp3',
  thunder: 'thunder.mp3',
  fog: 'fog.mp3',
};

/**
 * Horários de início das músicas (em minutos desde meia-noite)
 * day-theme: 06:10 = 370 min
 * night-theme: 18:10 = 1090 min
 */
const DAY_THEME_START = 6 * 60 + 10;
const NIGHT_THEME_START = 18 * 60 + 10;

// Variantes de trilha (rotaciona no fim da música)
const DAY_THEME_TRACKS = ['day-theme', 'day-theme-2'];
const NIGHT_THEME_TRACKS = ['night-theme', 'night-theme-2'];

/** Chance (0-1) de alternar para a variante ao terminar a track */
const THEME_VARIANT_SWAP_CHANCE = 0.35;

/* ────────────────────────────────────────────
 * Easing helpers
 * ──────────────────────────────────────────── */

/**
 * Ease-in (quadrática) — começa lento, acelera.
 * Usada no fade in para o volume subir gradualmente.
 * @param {number} t - Progresso normalizado 0-1
 * @returns {number}
 */
function easeIn(t) {
  return t * t;
}

/**
 * Ease-out (quadrática) — começa rápido, desacelera.
 * Usada no fade out para o volume cair suavemente.
 * @param {number} t - Progresso normalizado 0-1
 * @returns {number}
 */
function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

/* ────────────────────────────────────────────
 * audioManager
 * ──────────────────────────────────────────── */

const audioManager = {
  /** @type {HTMLAudioElement|null} */
  _currentAudio: null,

  /** @type {string|null} */
  _currentTrack: null,

  /** Volume alvo (0-1) definido pelo jogador */
  _targetVolume: DEFAULT_VOLUME,

  _initialized: false,
  _userInteracted: false,
  _isSleeping: false,
  _destroyed: false,

  /** @type {number|null} rAF id do fade ativo */
  _fadeRafId: null,

  /** Se está trocando de track (fade out -> fade in) */
  _switching: false,

  /** @type {string|null} */
  _pendingTrack: null,

  /** Duração do fade em segundos (calculada ao carregar cada track) */
  _fadeDurationSec: 8,

  /**
   * Fase atual do áudio:
   *   'idle'      → nada tocando
   *   'fading-in' → subindo volume
   *   'playing'   → volume estável no alvo
   *   'fading-out'→ descendo volume
   */
  _phase: 'idle',

  // ── SFX (WebAudio) ──────────────────────────
  /** @type {AudioContext|null} */
  _sfxCtx: null,
  /** @type {GainNode|null} */
  _sfxMaster: null,
  /** @type {Map<string, Promise<AudioBuffer>>} */
  _sfxBufferPromises: new Map(),
  /** @type {Map<string, AudioBuffer>} cache síncrono dos buffers já decodificados */
  _sfxBuffers: new Map(),
  _listenerX: 0,
  _listenerY: 0,
  _listenerFacingRad: 0,
  /** Volume independente para SFX ambiente (0-1) */
  _ambientVolume: DEFAULT_VOLUME,
  /** Volume independente para SFX de animais (0-1) */
  _animalVolume: DEFAULT_VOLUME,

  // ── Rain/Thunder (ambient loop) ────────────
  /** @type {AudioBufferSourceNode|null} */
  _rainSource: null,
  /** @type {GainNode|null} */
  _rainGain: null,
  _isRainPlaying: false,

  // ── Fog (layered ambient) ─────────────────
  /** @type {Array<{src: AudioBufferSourceNode, gain: GainNode}>} */
  _fogLayers: [],
  _isFogPlaying: false,

  /* ── inicialização ────────────────────────── */

  init() {
    if (this._initialized) return;

    this._destroyed = false;
    this._loadVolume();
    this._setupEventListeners();
    this._setupUserInteraction();

    registerSystem('audio', this);
    this._initialized = true;

    logger.info('AudioManager inicializado');
  },

  /* ── volume / persistência ────────────────── */

  _loadVolume() {
    const load = (key, fallback) => {
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0 && val <= 1) return val;
        }
      } catch { /* localStorage indisponível */ }
      return fallback;
    };

    this._targetVolume = load(STORAGE_KEY, DEFAULT_VOLUME);
    this._ambientVolume = load(AMBIENT_VOLUME_KEY, DEFAULT_VOLUME);
    this._animalVolume = load(ANIMAL_VOLUME_KEY, DEFAULT_VOLUME);
  },

  _persistVolume() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._targetVolume));
    } catch { /* localStorage indisponível */ }
  },

  setVolume(value) {
    this._targetVolume = Math.max(0, Math.min(1, value));
    this._persistVolume();

    // Atualiza volume em tempo real se estável (não em fade)
    if (this._currentAudio && this._phase === 'playing') {
      this._currentAudio.volume = this._targetVolume;
    }
  },

  getVolume() {
    return this._targetVolume;
  },

  setAmbientVolume(value) {
    this._ambientVolume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(AMBIENT_VOLUME_KEY, String(this._ambientVolume)); } catch {}

    if (this._sfxCtx) {
      if (this._rainGain) {
        this._rainGain.gain.setValueAtTime(this._ambientVolume, this._sfxCtx.currentTime);
      }
      for (const layer of this._fogLayers) {
        layer.gain.gain.setValueAtTime(this._ambientVolume, this._sfxCtx.currentTime);
      }
    }
  },

  getAmbientVolume() {
    return this._ambientVolume;
  },

  setAnimalVolume(value) {
    this._animalVolume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(ANIMAL_VOLUME_KEY, String(this._animalVolume)); } catch {}
  },

  getAnimalVolume() {
    return this._animalVolume;
  },

  /* ── listeners ────────────────────────────── */

  _setupEventListeners() {
    this._evtHandlers = {
      timeChanged: (e) => {
        this._onTimeChanged(e.detail.time);
      },
      sleepStarted: () => {
        this._isSleeping = true;
        this._stopCurrentTrack();
        this._stopRain();
        this._stopFog();
      },
      sleepEnded: () => {
        this._isSleeping = false;
        const weather = getSystem('weather');
        if (weather) {
          this._onTimeChanged(weather.currentTime);
          if (weather.weatherType === 'rain' || weather.weatherType === 'storm') {
            this._startRain();
          } else if (weather.weatherType === 'fog') {
            this._startFog();
          }
        }
      },
      musicVolumeChanged: (e) => {
        this.setVolume(e.detail.volume);
      },
      ambientVolumeChanged: (e) => {
        this.setAmbientVolume(e.detail.volume);
      },
      animalVolumeChanged: (e) => {
        this.setAnimalVolume(e.detail.volume);
      },
      weatherChanged: (e) => {
        const { type } = e.detail;
        if (type === 'rain' || type === 'storm') {
          this._startRain();
          this._stopFog();
        } else if (type === 'fog') {
          this._stopRain();
          this._startFog();
        } else {
          this._stopRain();
          this._stopFog();
        }
      },
      lightningFlash: () => {
        this._playThunder();
      },
      objectDamaged: (e) => {
        const { type, x, y } = e.detail;
        if (type === 'tree') this.playSfx3D('wood_hit', x, y, { category: 'ambient' });
        else if (type === 'rock') this.playSfx3D('stone_hit', x, y, { category: 'ambient' });
        else if (type === 'thicket') this.playSfx3D('thick_hit', x, y, { category: 'ambient' });
      },
    };
    for (const [evt, fn] of Object.entries(this._evtHandlers)) {
      document.addEventListener(evt, fn);
    }
  },

  _setupUserInteraction() {
    this._unlockFn = () => {
      if (this._userInteracted) return;
      this._userInteracted = true;

      this._ensureSfx();
      this.preloadSfx();

      const weather = getSystem('weather');
      if (weather) {
        this._onTimeChanged(weather.currentTime);
        if (weather.weatherType === 'rain' || weather.weatherType === 'storm') {
          this._startRain();
        } else if (weather.weatherType === 'fog') {
          this._startFog();
        }
      }

      document.removeEventListener('click', this._unlockFn);
      document.removeEventListener('keydown', this._unlockFn);
      document.removeEventListener('pointerdown', this._unlockFn);
    };

    document.addEventListener('click', this._unlockFn, { once: false });
    document.addEventListener('keydown', this._unlockFn, { once: false });
    document.addEventListener('pointerdown', this._unlockFn, { once: false });
  },

  /* ── lógica de troca de track ────────────── */

  _onTimeChanged(gameTime) {
    if (!this._userInteracted) return;
    if (this._isSleeping) return;

    const targetTheme = this._getThemeForTime(gameTime);
    const currentTheme = this._currentTrack ? this._getThemeForTrack(this._currentTrack) : null;

    // Já está tocando alguma variante do tema correto
    if (currentTheme === targetTheme) return;

    const targetTrack = this._getBaseTrackForTheme(targetTheme);

    // Já está em processo de troca para esse tema?
    if (this._switching && this._pendingTrack && this._getThemeForTrack(this._pendingTrack) === targetTheme) return;

    if (this._currentAudio && this._currentTrack) {
      this._pendingTrack = targetTrack;
      this._switching = true;
      this._startFadeOut(() => {
        this._switching = false;
        if (this._pendingTrack) {
          this._playTrack(this._pendingTrack);
          this._pendingTrack = null;
        }
      });
    } else {
      this._playTrack(targetTrack);
    }
  },

  _getThemeForTime(gameTime) {
    if (gameTime >= DAY_THEME_START && gameTime < NIGHT_THEME_START) return 'day';
    return 'night';
  },

  _getThemeForTrack(trackName) {
    if (DAY_THEME_TRACKS.includes(trackName)) return 'day';
    if (NIGHT_THEME_TRACKS.includes(trackName)) return 'night';
    return null;
  },

  _getBaseTrackForTheme(theme) {
    return theme === 'day' ? DAY_THEME_TRACKS[0] : NIGHT_THEME_TRACKS[0];
  },

  _getNextVariantTrack(theme, currentTrack) {
    const tracks = theme === 'day' ? DAY_THEME_TRACKS : NIGHT_THEME_TRACKS;
    if (tracks.length < 2) return tracks[0];

    // Se não reconhece a track atual, volta pra base
    if (!tracks.includes(currentTrack)) return tracks[0];

    const other = tracks[0] === currentTrack ? tracks[1] : tracks[0];
    return Math.random() < THEME_VARIANT_SWAP_CHANCE ? other : currentTrack;
  },

  _continueThemeAfterTrackEnd(finishedTrack) {
    if (!this._userInteracted) return;
    if (this._isSleeping) return;

    // Se estamos trocando de tema (timeChanged), não interfere
    if (this._switching || this._pendingTrack) return;

    const weather = getSystem('weather');
    if (!weather) return;

    const themeNow = this._getThemeForTime(weather.currentTime);
    const finishedTheme = finishedTrack ? this._getThemeForTrack(finishedTrack) : null;

    const nextTrack =
      finishedTheme === themeNow
        ? this._getNextVariantTrack(themeNow, finishedTrack)
        : this._getBaseTrackForTheme(themeNow);

    if (nextTrack) this._playTrack(nextTrack);
  },

  /* ── reprodução ───────────────────────────── */

  _playTrack(trackName) {
    this._stopCurrentTrack();

    const audio = new Audio(`./assets/audio/music/${trackName}.mp3`);
    audio.volume = 0;
    audio.loop = false;

    this._currentAudio = audio;
    this._currentTrack = trackName;
    this._phase = 'idle';

    // Quando metadados carregarem, calcula fade proporcional e inicia
    audio.addEventListener('loadedmetadata', () => {
      if (this._currentAudio !== audio) return;
      if (this._phase !== 'idle') return; // já iniciou via canplaythrough

      const duration = audio.duration;
      this._fadeDurationSec = Math.min(
        FADE_MAX_SEC,
        Math.max(FADE_MIN_SEC, duration * FADE_RATIO)
      );

      this._startFadeIn();
      this._startEndMonitor(audio);
    });

    // Fallback: se loadedmetadata não disparar (raro), tenta com canplaythrough
    audio.addEventListener('canplaythrough', () => {
      if (this._currentAudio !== audio) return;
      if (this._phase !== 'idle') return; // já iniciou via loadedmetadata

      const duration = audio.duration || 60;
      this._fadeDurationSec = Math.min(
        FADE_MAX_SEC,
        Math.max(FADE_MIN_SEC, duration * FADE_RATIO)
      );

      this._startFadeIn();
      this._startEndMonitor(audio);
    }, { once: true });

    // Quando termina naturalmente (fallback: caso o monitor não dispare)
    audio.addEventListener('ended', () => {
      if (this._currentAudio === audio) {
        const finishedTrack = this._currentTrack;
        this._currentAudio = null;
        this._currentTrack = null;
        this._phase = 'idle';
        this._continueThemeAfterTrackEnd(finishedTrack);
      }
    });

    const playPromise = audio.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch((err) => {
        if (this._currentAudio !== audio) return; // new track
        logger.warn('AudioManager: autoplay bloqueado', err.message);
        this._currentAudio = null;
        this._currentTrack = null;
        this._phase = 'idle';
      });
    }
  },

  /**
   * Monitora continuamente o currentTime do áudio para iniciar
   * o fade out no momento exato antes do final.
   * @param {HTMLAudioElement} audio
   */
  _startEndMonitor(audio) {
    // Limpa monitor anterior (defesa contra double-init)
    if (this._endMonitorCleanup) {
      this._endMonitorCleanup();
      this._endMonitorCleanup = null;
    }

    // Usa evento timeupdate ao invés de rAF polling (~4 eventos/s vs 60/s)
    const onTimeUpdate = () => {
      if (this._currentAudio !== audio) {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        return;
      }

      const duration = audio.duration;
      if (!duration || isNaN(duration)) return;

      const remaining = duration - audio.currentTime;

      if (remaining <= this._fadeDurationSec && this._phase === 'playing') {
        audio.removeEventListener('timeupdate', onTimeUpdate);
        const finishedTrack = this._currentTrack;
        this._startFadeOut(() => {
          if (this._currentAudio === audio) {
            audio.pause();
            this._currentAudio = null;
            this._currentTrack = null;
            this._phase = 'idle';
          }
          this._continueThemeAfterTrackEnd(finishedTrack);
        });
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);

    // Guardar referência para cleanup
    this._endMonitorCleanup = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  },

  _stopCurrentTrack() {
    this._cancelFade();

    if (this._endMonitorCleanup) {
      this._endMonitorCleanup();
      this._endMonitorCleanup = null;
    }

    if (this._currentAudio) {
      try {
        this._currentAudio.pause();
        this._currentAudio.currentTime = 0;
      } catch { /* ignorar */ }
      this._currentAudio = null;
    }
    this._currentTrack = null;
    this._phase = 'idle';
    this._switching = false;
    this._pendingTrack = null;
  },

  /* ── fade via requestAnimationFrame + easing ── */

  /**
   * Fade in: 0 → targetVolume usando curva ease-in (sobe gradualmente)
   */
  _startFadeIn() {
    this._cancelFade();
    if (!this._currentAudio) return;

    this._phase = 'fading-in';
    this._currentAudio.volume = 0;

    const startTime = performance.now();
    const durationMs = this._fadeDurationSec * 1000;

    const step = (now) => {
      if (!this._currentAudio || this._phase !== 'fading-in') return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // ease-in: começa devagar, acelera no final
      this._currentAudio.volume = easeIn(progress) * this._targetVolume;

      if (progress < 1) {
        this._fadeRafId = requestAnimationFrame(step);
      } else {
        this._currentAudio.volume = this._targetVolume;
        this._fadeRafId = null;
        this._phase = 'playing';
      }
    };

    this._fadeRafId = requestAnimationFrame(step);
  },

  /**
   * Fade out: volume atual → 0 usando curva ease-out (desce suavemente)
   * @param {Function} [onComplete]
   */
  _startFadeOut(onComplete) {
    this._cancelFade();

    if (!this._currentAudio) {
      if (onComplete) onComplete();
      return;
    }

    this._phase = 'fading-out';
    const startVolume = this._currentAudio.volume;
    const startTime = performance.now();
    const durationMs = this._fadeDurationSec * 1000;

    const step = (now) => {
      if (!this._currentAudio || this._phase !== 'fading-out') {
        if (onComplete) onComplete();
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      // ease-out invertido: começa descendo devagar, acelera pra 0
      // easeOut(progress) vai de 0→1 rápido no início, desacelera no fim
      // queremos o inverso: descer devagar no início, acelerar pro silêncio
      // então: volume = startVolume * (1 - easeOut(progress))
      this._currentAudio.volume = startVolume * (1 - easeOut(progress));

      if (progress < 1) {
        this._fadeRafId = requestAnimationFrame(step);
      } else {
        this._currentAudio.volume = 0;
        this._fadeRafId = null;
        this._phase = 'idle';
        if (onComplete) onComplete();
      }
    };

    this._fadeRafId = requestAnimationFrame(step);
  },

  _cancelFade() {
    if (this._fadeRafId) {
      cancelAnimationFrame(this._fadeRafId);
      this._fadeRafId = null;
    }
  },

  /* ── SFX 3D (WebAudio API) ────────────────── */

  _ensureSfx() {
    if (this._sfxCtx) {
      if (this._sfxCtx.state === 'suspended') this._sfxCtx.resume().catch(() => {});
      return;
    }

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      logger.warn('AudioManager: WebAudio indisponível (sem SFX 3D)');
      return;
    }

    this._sfxCtx = new Ctx();
    this._sfxMaster = this._sfxCtx.createGain();
    this._sfxMaster.gain.value = 1.0;
    this._sfxMaster.connect(this._sfxCtx.destination);

    this._applyListener();
  },

  _applyListener() {
    if (!this._sfxCtx) return;

    const L = this._sfxCtx.listener;
    const fx = Math.cos(this._listenerFacingRad);
    const fz = Math.sin(this._listenerFacingRad);

    if (L.positionX && 'value' in L.positionX) {
      L.positionX.value = this._listenerX;
      L.positionY.value = 0;
      L.positionZ.value = this._listenerY;
      L.forwardX.value = fx;
      L.forwardY.value = 0;
      L.forwardZ.value = fz;
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else if (L.setPosition) {
      L.setPosition(this._listenerX, 0, this._listenerY);
      L.setOrientation(fx, 0, fz, 0, 1, 0);
    }
  },

  /**
   * Atualiza posição do listener (chamar no game loop com coords do player)
   * @param {number} x - Posição X no mundo
   * @param {number} y - Posição Y no mundo
   * @param {number} [facingRad=0] - Direção em radianos
   */
  setListenerPosition(x, y, facingRad = 0) {
    this._listenerX = x;
    this._listenerY = y;
    this._listenerFacingRad = facingRad;
    this._applyListener();
  },

  /** Pré-carrega todos os SFX definidos em SFX_FILES */
  preloadSfx() {
    for (const name of Object.keys(SFX_FILES)) {
      this._getSfxBuffer(name);
    }
  },

  _getSfxBuffer(name) {
    if (!this._sfxCtx) return Promise.reject(new Error('SFX ctx not ready'));
    if (this._sfxBufferPromises.has(name)) return this._sfxBufferPromises.get(name);

    const file = SFX_FILES[name];
    if (!file) return Promise.reject(new Error(`Unknown SFX: ${name}`));

    const url = `${SFX_BASE_PATH}${file}`;

    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch ${url}`);
        return r.arrayBuffer();
      })
      .then((ab) => this._sfxCtx.decodeAudioData(ab))
      .then((buffer) => {
        if (!this._destroyed) this._sfxBuffers.set(name, buffer);
        return buffer;
      })
      .catch((err) => {
        this._sfxBufferPromises.delete(name);
        throw err;
      });

    this._sfxBufferPromises.set(name, p);
    return p;
  },

  /**
   * Monta o grafo WebAudio e dispara o som imediatamente (síncrono).
   * @param {AudioBuffer} buffer
   * @param {number} x
   * @param {number} y
   * @param {Object} opts
   */
  _fireSfx(buffer, x, y, { volume, playbackRate, refDistance, maxDistance, rolloffFactor, categoryVolume }) {
    const src = this._sfxCtx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;

    const gain = this._sfxCtx.createGain();
    gain.gain.value = Math.max(0, volume * categoryVolume);

    const panner = this._sfxCtx.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'linear';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloffFactor;

    // posição do emissor (2D -> 3D em XZ)
    panner.positionX.value = x;
    panner.positionY.value = 0;
    panner.positionZ.value = y;

    // chain: src -> panner -> gain -> master -> destination
    src.connect(panner);
    panner.connect(gain);
    gain.connect(this._sfxMaster);

    src.start();

    src.onended = () => {
      try { src.disconnect(); } catch { /* cleanup */ }
      try { panner.disconnect(); } catch { /* cleanup */ }
      try { gain.disconnect(); } catch { /* cleanup */ }
    };
  },

  /**
   * Plays a positional SFX in 3D space.
   * @returns {boolean} true if the sound was fired (or scheduled), false if
   *   it was skipped (no user interaction yet, AudioContext unavailable, etc.).
   *   Note: when the buffer isn't yet cached, true means the fetch was
   *   *scheduled* — if the fetch or decode subsequently fails the sound will
   *   not play, but the caller will not be notified.
   */
  playSfx3D(name, x, y, {
    volume = 1.0,
    playbackRate = 1.0,
    refDistance = 90,
    maxDistance = 700,
    rolloffFactor = 1.0,
    category = 'ambient',
  } = {}) {
    if (!this._userInteracted) return false;
    this._ensureSfx();
    if (!this._sfxCtx || !this._sfxMaster) return false;

    const categoryVolume = category === 'animal' ? this._animalVolume : this._ambientVolume;
    const opts = { volume, playbackRate, refDistance, maxDistance, rolloffFactor, categoryVolume };

    // Cache síncrono: toca imediatamente sem atraso de microtask
    const cached = this._sfxBuffers.get(name);
    if (cached) {
      this._fireSfx(cached, x, y, opts);
      return true;
    }

    // Fallback assíncrono (primeira vez antes do preload terminar)
    this._getSfxBuffer(name)
      .then((buffer) => {
        if (!this._sfxCtx || !this._sfxMaster) return;
        this._fireSfx(buffer, x, y, opts);
      })
      .catch((err) => {
        logger.warn(`AudioManager: SFX "${name}" falhou`, err.message);
      });
    return true;
  },

  /* ── Rain / Thunder (ambient loop) ─────────── */

  /**
   * Inicia loop de light_rain.mp3 via WebAudio.
   * Primeira execução: começa do 0s (fade natural do arquivo).
   * Loops seguintes: pula 0.5s para manter som contínuo sem fade.
   */
  _startRain() {
    if (this._isRainPlaying) return;
    if (!this._userInteracted) return;
    this._ensureSfx();
    if (!this._sfxCtx || !this._sfxMaster) return;

    const buffer = this._sfxBuffers.get('light_rain');
    if (!buffer) {
      this._getSfxBuffer('light_rain')
        .then(() => this._startRain())
        .catch(() => {});
      return;
    }

    this._isRainPlaying = true;

    const src = this._sfxCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.loopStart = 0.5; // pula o fade natural ao reiniciar o loop

    const gain = this._sfxCtx.createGain();
    // Fade in suave (~1s) sincronizado com o início visual da chuva
    gain.gain.setValueAtTime(0, this._sfxCtx.currentTime);
    gain.gain.linearRampToValueAtTime(this._ambientVolume, this._sfxCtx.currentTime + 1.0);

    src.connect(gain);
    gain.connect(this._sfxMaster);
    src.start(0, 0); // começa do início (inclui fade natural)

    this._rainSource = src;
    this._rainGain = gain;
  },

  /** Para a chuva com fade out de 1.5s */
  _stopRain() {
    if (!this._rainSource) {
      this._isRainPlaying = false;
      return;
    }

    const gain = this._rainGain;
    const src = this._rainSource;
    const ctx = this._sfxCtx;

    // Limpa referências para permitir _startRain() imediato se necessário
    this._rainSource = null;
    this._rainGain = null;
    this._isRainPlaying = false;

    if (!ctx) return;

    try {
      gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      src.stop(ctx.currentTime + 1.6);
    } catch { /* source may already be stopped */ }

    src.onended = () => {
      try { src.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
  },

  /** Toca thunder.mp3 uma vez (sincronizado com o flash de raio) */
  _playThunder() {
    if (!this._userInteracted) return;
    this._ensureSfx();
    if (!this._sfxCtx || !this._sfxMaster) return;

    const buffer = this._sfxBuffers.get('thunder');
    if (!buffer) {
      this._getSfxBuffer('thunder')
        .then((buf) => this._fireThunder(buf))
        .catch(() => {});
      return;
    }

    this._fireThunder(buffer);
  },

  _fireThunder(buffer) {
    if (!this._sfxCtx || !this._sfxMaster) return;

    const src = this._sfxCtx.createBufferSource();
    src.buffer = buffer;

    const gain = this._sfxCtx.createGain();
    gain.gain.value = this._ambientVolume;

    src.connect(gain);
    gain.connect(this._sfxMaster);
    src.start();

    src.onended = () => {
      try { src.disconnect(); } catch {}
      try { gain.disconnect(); } catch {}
    };
  },

  /* ── Fog (layered ambient) ───────────────────── */

  /**
   * Inicia camadas de fog.mp3 sobrepostas.
   * Sorteia 1-3 camadas; cada camada extra começa com delay aleatório
   * para criar sobreposição natural. Cada camada faz loop independente.
   */
  _startFog() {
    if (this._isFogPlaying) return;
    if (!this._userInteracted) return;
    this._ensureSfx();
    if (!this._sfxCtx || !this._sfxMaster) return;

    const buffer = this._sfxBuffers.get('fog');
    if (!buffer) {
      this._getSfxBuffer('fog')
        .then(() => this._startFog())
        .catch(() => {});
      return;
    }

    this._isFogPlaying = true;

    const layerCount = 1 + Math.floor(Math.random() * 3); // 1, 2 ou 3
    const fadeInSec = 2.0;
    const now = this._sfxCtx.currentTime;
    const perLayerVolume = this._ambientVolume / layerCount;

    for (let i = 0; i < layerCount; i++) {
      const src = this._sfxCtx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = 0.3;

      const gain = this._sfxCtx.createGain();
      gain.gain.setValueAtTime(0, now);

      src.connect(gain);
      gain.connect(this._sfxMaster);

      // Camada 0 começa imediato; extras com delay aleatório (30%-80% da duração)
      const delay = i === 0 ? 0 : buffer.duration * (0.3 + Math.random() * 0.5);
      const startTime = now + delay;

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(perLayerVolume, startTime + fadeInSec);
      src.start(startTime, 0);

      this._fogLayers.push({ src, gain });
    }
  },

  /** Para todas as camadas de fog com fade out de 2s */
  _stopFog() {
    if (this._fogLayers.length === 0) {
      this._isFogPlaying = false;
      return;
    }

    const layers = [...this._fogLayers];
    this._fogLayers = [];
    this._isFogPlaying = false;

    if (!this._sfxCtx) return;

    const now = this._sfxCtx.currentTime;
    const fadeOutSec = 2.0;

    for (const { src, gain } of layers) {
      try {
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
        src.stop(now + fadeOutSec + 0.1);
      } catch {}

      src.onended = () => {
        try { src.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      };
    }
  },

  /* ── save / load ──────────────────────────── */

  getSaveData() {
    return {
      volume: this._targetVolume,
      ambientVolume: this._ambientVolume,
      animalVolume: this._animalVolume,
    };
  },

  applySaveData(data) {
    if (!data) return;
    if (typeof data.volume === 'number') this.setVolume(data.volume);
    if (typeof data.ambientVolume === 'number') this.setAmbientVolume(data.ambientVolume);
    if (typeof data.animalVolume === 'number') this.setAnimalVolume(data.animalVolume);
  },

  destroy() {
    this._stopCurrentTrack();
    this._stopRain();
    this._stopFog();

    // Remove document event listeners
    if (this._evtHandlers) {
      for (const [evt, fn] of Object.entries(this._evtHandlers)) {
        document.removeEventListener(evt, fn);
      }
      this._evtHandlers = null;
    }

    // Remove interaction-unlock listeners
    if (this._unlockFn) {
      document.removeEventListener('click', this._unlockFn);
      document.removeEventListener('keydown', this._unlockFn);
      document.removeEventListener('pointerdown', this._unlockFn);
      this._unlockFn = null;
    }

    if (this._sfxCtx && this._sfxCtx.state !== 'closed') {
      this._sfxCtx.close().catch(() => {});
    }
    this._sfxCtx = null;
    this._sfxMaster = null;
    this._sfxBuffers.clear();
    this._sfxBufferPromises.clear();

    this._initialized = false;
    this._userInteracted = false;
    this._isSleeping = false;
    this._destroyed = true;
  }
};

export { audioManager };
