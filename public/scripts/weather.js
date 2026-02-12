/**
 * @file weather.js - Sistema de clima e tempo do jogo
 * @description Gerencia ciclo dia/noite, clima (chuva, neve, neblina, tempestade),
 * estações do ano, sistema de dormir e iluminação ambiente.
 * @module WeatherSystem
 */

import { camera } from "./thePlayer/cameraSystem.js";
import { showSleepLoading, hideSleepLoading, blockInteractions, unblockInteractions } from "./loadingScreen.js";
import { t } from './i18n/i18n.js';

const WEATHER_UI_ID = "weather-ui-panel";

function ensureWeatherUIPanel() {
  if (typeof document === "undefined") return null;

  // Painel agora fica fora do canvas, como o HUD do player.
  // Ancoramos no container principal do jogo para manter a mesma "camada" de UI.
  const container = document.querySelector(".theGame") || document.body;

  let el = document.getElementById(WEATHER_UI_ID);
  if (!el) {
    _wuiCache = null; // invalidar cache ao recriar painel
    el = document.createElement("div");
    el.id = WEATHER_UI_ID;
    el.innerHTML = `
      <div class="wui-time" data-role="time">00:00</div>
      <div class="wui-weekday" data-role="weekday">-</div>
      <div class="wui-row"><span data-role="dayLabel">${t('time.dayLabel')}:</span><span data-role="day">1</span></div>
      <div class="wui-row"><span data-role="seasonLabel">${t('time.seasonLabel')}:</span><span data-role="season">-</span></div>
      <div class="wui-row"><span data-role="weatherLabel">${t('time.weatherLabel')}:</span><span data-role="weather">-</span></div>
    `;
    container.appendChild(el);
  } else if (el.parentElement !== container) {
    // Se já existia em outro lugar (ex.: body), move pro container correto
    container.appendChild(el);
  }

  //  deixa o CSS controlar posição (remove inline style antigo que ancorava no canvas)
  el.style.left = "";
  el.style.top = "";

  return el;
}

function updateWeatherUIPanelPosition() {
  ensureWeatherUIPanel();
}

// Cache de elementos DOM do painel de weather
let _wuiCache = null;

function _getWuiElements() {
  // Verificar se cache ainda é válido (painel pode ter sido removido do DOM)
  if (_wuiCache && _wuiCache.panel.isConnected) return _wuiCache;
  _wuiCache = null;
  const panel = ensureWeatherUIPanel();
  if (!panel) return null;
  _wuiCache = {
    panel,
    time: panel.querySelector('[data-role="time"]'),
    weekday: panel.querySelector('[data-role="weekday"]'),
    day: panel.querySelector('[data-role="day"]'),
    season: panel.querySelector('[data-role="season"]'),
    weather: panel.querySelector('[data-role="weather"]'),
    dayLabel: panel.querySelector('[data-role="dayLabel"]'),
    seasonLabel: panel.querySelector('[data-role="seasonLabel"]'),
    weatherLabel: panel.querySelector('[data-role="weatherLabel"]'),
  };
  return _wuiCache;
}

function updateWeatherUIPanelContent() {
  const els = _getWuiElements();
  if (!els) return;

  if (els.time) els.time.textContent = WeatherSystem.getTimeString();
  if (els.weekday) els.weekday.textContent = WeatherSystem.getWeekday();
  if (els.day) els.day.textContent = String(WeatherSystem.day);
  if (els.season) els.season.textContent = WeatherSystem.getSeasonName();

  // Update labels for language changes
  if (els.dayLabel) els.dayLabel.textContent = `${t('time.dayLabel')}:`;
  if (els.seasonLabel) els.seasonLabel.textContent = `${t('time.seasonLabel')}:`;
  if (els.weatherLabel) els.weatherLabel.textContent = `${t('time.weatherLabel')}:`;

  let icon = "☀️";
  if (WeatherSystem.weatherType === "rain") icon = "🌧️";
  if (WeatherSystem.weatherType === "storm") icon = "⛈️";
  if (WeatherSystem.weatherType === "fog") icon = "🌫️";
  if (WeatherSystem.weatherType === "blizzard") icon = "❄️";
  if (els.weather) els.weather.textContent = icon;
}

/**
 * Sistema principal de clima e tempo
 * Controla ciclo dia/noite, estações, clima e efeitos visuais
 * @type {Object}
 * @property {number} currentTime - Tempo atual em minutos (0-1439)
 * @property {number} day - Dia atual do mês
 * @property {string[]} daysOfWeek - Nomes dos dias da semana
 * @property {number} month - Mês atual (1-12)
 * @property {number} year - Ano atual
 * @property {string} season - Estação atual (Primavera, Verão, Outono, Inverno)
 * @property {number} timeSpeed - Velocidade de passagem do tempo
 * @property {number} ambientDarkness - Nível de escuridão ambiente (0-1)
 * @property {string} weatherType - Tipo de clima atual (clear, rain, storm, fog, blizzard)
 */
export const WeatherSystem = {
  /** Tempo atual em minutos desde meia-noite (6*60 = 06:00) */
  currentTime: 6 * 60,
  /** Dia atual do mês */
  day: 1,

  /** Chaves internas das estações (não traduzidas) */
  seasonKeys: ["spring", "summer", "autumn", "winter"],
  /** Estação atual (chave interna) */
  seasonKey: "spring",

  month: 1,
  year: 1,

  timeSpeed: (24 * 60) / (12 * 60),
  ambientDarkness: 1,

  weatherType: "clear",
  weatherTimer: 0,
  nextWeatherChange: 60 * 2,

  isSleeping: false,
  sleepTransitionProgress: 0,

  sleepPhase: null,
  sleepTimerAcc: 0,
  sleepTargetDay: null,
  sleepMessage: "",
  isPaused: false,

  sleepDurations: {
    fadeOut: 1500,
    hold: 5000,
    fadeIn: 1500
  },

  rainParticles: [],
  fogLayers: [],
  snowParticles: [],
  lightningFlashes: [],
  lastParticleUpdate: 0,

  init() {
    this.randomizeWeather();

    if (typeof window !== "undefined") {
      ensureWeatherUIPanel();
      updateWeatherUIPanelPosition();
      updateWeatherUIPanelContent();

      window.addEventListener("resize", () => {
        updateWeatherUIPanelPosition();
      });

      document.addEventListener("timeChanged", () => {
        updateWeatherUIPanelContent();
      });

      document.addEventListener("dayChanged", () => {
        updateWeatherUIPanelContent();
      });

      document.addEventListener("languageChanged", () => {
        updateWeatherUIPanelContent();
      });
    }
  },

  getWeekday() {
    const index = (this.day - 1) % 7;
    const weekdays = t('time.weekdays');
    if (Array.isArray(weekdays) && weekdays[index]) {
      return weekdays[index];
    }
    // Fallback to index if translation unavailable
    return `Day ${index + 1}`;
  },

  getSeasonName() {
    return t(`seasons.${this.seasonKey}`);
  },

  pause() {
    this.isPaused = true;
  },

  resume() {
    this.isPaused = false;
  },

  update(deltaTime) {
    if (this.isPaused) return;
    if (this.isSleeping) {
      this._updateSleepTransition(deltaTime * 1000);
      return;
    }

    const oldTime = this.currentTime;
    this.currentTime += deltaTime * this.timeSpeed;

    if (Math.floor(oldTime) !== Math.floor(this.currentTime)) {
      document.dispatchEvent(
        new CustomEvent("timeChanged", {
          detail: { day: this.day, time: this.currentTime, weekday: this.getWeekday() }
        })
      );
    }

    if (this.currentTime >= 24 * 60) {
      this.currentTime -= 24 * 60;
      this.advanceDate();
    }

    this.updateAmbientLight();

    this.weatherTimer += deltaTime;
    if (this.weatherTimer >= this.nextWeatherChange) {
      this.weatherTimer = 0;
      this.randomizeWeather();
      this.nextWeatherChange = 60 * (Math.random() * 4 + 3);
    }

    this.lastParticleUpdate += deltaTime;
    if (this.lastParticleUpdate > 0.016) {
      const steps = Math.floor(this.lastParticleUpdate / 0.016);
      for (let i = 0; i < steps; i++) {
        this.updateRainParticles();
        this.updateFogLayers();
        this.updateSnowParticles();
        this.updateLightningFlashes(0.016);
      }
      this.lastParticleUpdate -= steps * 0.016;
    }

    if (this.weatherType === "storm" && Math.random() < 0.008) {
      this.addLightningFlash();
    }
  },

  _updateSleepTransition(dtMs) {
    this.sleepTimerAcc += dtMs;

    if (this.sleepPhase === "fadingOut") {
      const p = Math.min(1, this.sleepTimerAcc / this.sleepDurations.fadeOut);
      this.sleepTransitionProgress = p;

      if (p >= 1) {
        this.sleepPhase = "holding";
        this.sleepTimerAcc = 0;

        this.currentTime = 6 * 60;
        this.advanceDate();
        this.randomizeWeather();

        this.sleepMessage = t('time.sleeping', { fromDay: this.day - 1, toDay: this.day, weekday: this.getWeekday() });

        document.dispatchEvent(new CustomEvent("dayChanged", { detail: { day: this.day } }));
      }
      return;
    }

    if (this.sleepPhase === "holding") {
      this.sleepTransitionProgress = 1;
      if (this.sleepTimerAcc >= this.sleepDurations.hold) {
        this.sleepPhase = "fadingIn";
        this.sleepTimerAcc = 0;
        return;
      }
      return;
    }

    if (this.sleepPhase === "fadingIn") {
      const p = Math.min(1, this.sleepTimerAcc / this.sleepDurations.fadeIn);
      this.sleepTransitionProgress = 1 - p;
      this.updateAmbientLight();

      if (p >= 1) {
        this.sleepPhase = null;
        this.sleepTimerAcc = 0;
        this.isSleeping = false;
        this.sleepTransitionProgress = 0;
        this.sleepMessage = "";
      }
      return;
    }
  },

  sleep() {
    if (this.isSleeping) return;
    this.isSleeping = true;
    this.sleepPhase = "fadingOut";
    this.sleepTimerAcc = 0;
    this.sleepTransitionProgress = 0;
  },

  updateAmbientLight() {
    const cyclePoints = [
      { hour: 0, darkness: 1.0 },
      { hour: 4, darkness: 1.0 },
      { hour: 5, darkness: 0.95 },
      { hour: 6, darkness: 0.85 },
      { hour: 7, darkness: 0.6 },
      { hour: 8, darkness: 0.0 },
      { hour: 16, darkness: 0.0 },
      { hour: 17, darkness: 0.5 },
      { hour: 18, darkness: 0.8 },
      { hour: 19, darkness: 0.95 },
      { hour: 20, darkness: 1.0 },
      { hour: 24, darkness: 1.0 }
    ];

    const currentHour = this.currentTime / 60;

    for (let i = 0; i < cyclePoints.length - 1; i++) {
      const start = cyclePoints[i];
      const end = cyclePoints[i + 1];

      if (currentHour >= start.hour && currentHour < end.hour) {
        const range = end.hour - start.hour;
        const progress = (currentHour - start.hour) / range;
        this.ambientDarkness = start.darkness + (end.darkness - start.darkness) * progress;
        return;
      }
    }
  },

  advanceDate() {
    const oldDay = this.day;
    this.day++;

    if (this.day > 30) {
      this.day = 1;
      this.month++;
      if (this.month > 12) {
        this.month = 1;
        this.year++;
      }
    }

    this.updateSeason();
    this.sleepTargetDay = this.day;

    document.dispatchEvent(
      new CustomEvent("timeChanged", {
        detail: { day: this.day, time: this.currentTime, weekday: this.getWeekday() }
      })
    );
  },

  updateSeason() {
    if (this.month >= 3 && this.month <= 5) this.seasonKey = "spring";
    else if (this.month >= 6 && this.month <= 8) this.seasonKey = "summer";
    else if (this.month >= 9 && this.month <= 11) this.seasonKey = "autumn";
    else this.seasonKey = "winter";
  },

  randomizeWeather() {
    const rand = Math.random();

    if (this.seasonKey === "winter") {
      this.weatherType = rand < 0.4 ? "clear" : "blizzard";
    } else {
      if (rand < 0.30) this.weatherType = "clear";
      else if (rand < 0.70) this.weatherType = "rain";
      else if (rand < 0.90) this.weatherType = "storm";
      else this.weatherType = "fog";
    }

    this.rainParticles = [];
    this.fogLayers = [];
    this.snowParticles = [];
    this.lightningFlashes = [];

    if (this.weatherType === "rain" || this.weatherType === "storm") this.generateRainParticles();
    if (this.weatherType === "fog") this.generateFogLayers();
    if (this.weatherType === "blizzard") this.generateSnowParticles();

    updateWeatherUIPanelContent();

    document.dispatchEvent(new CustomEvent('weatherChanged', {
      detail: { type: this.weatherType }
    }));
  },

  generateRainParticles() {
    const total = this.weatherType === "storm" ? 1600 : 900;
    const wind = this.weatherType === "storm" ? 12 : 5;
    const angle = Math.PI * 0.45;

    for (let i = 0; i < total; i++) {
      const depth = Math.random();
      this.rainParticles.push({
        x: Math.random() * 2500 - 500,
        y: Math.random() * 1500 - 500,
        depth,
        speed: 1500 + depth * 500,
        wind,
        angle,
        length: 30 + depth * 20,
        opacity: 0.2 + depth * 0.4
      });
    }
  },

  generateFogLayers() {
    for (let i = 0; i < 6; i++) {
      this.fogLayers.push({
        x: Math.random() * 200,
        y: Math.random() * 200,
        speed: 0.2 + Math.random() * 0.3,
        density: 0.3 + Math.random() * 0.2,
        time: Math.random() * 100
      });
    }
  },

  generateSnowParticles() {
    for (let i = 0; i < 500; i++) {
      this.snowParticles.push({
        x: Math.random() * 2500 - 500,
        y: Math.random() * 1500 - 500,
        size: Math.random() * 3 + 1,
        speedY: Math.random() * 100 + 50,
        speedX: Math.random() * 40 - 20,
        opacity: Math.random() * 0.8 + 0.2
      });
    }
  },

  addLightningFlash() {
    this.lightningFlashes.push({
      opacity: 0,
      maxOpacity: 0.6 + Math.random() * 0.4,
      duration: 0.1 + Math.random() * 0.2,
      phase: "in",
      timer: 0
    });

    document.dispatchEvent(new CustomEvent('lightningFlash'));
  },

  updateRainParticles() {
    const viewW = 1920 / camera.zoom;
    const viewH = 1080 / camera.zoom;
    const pad = 300;
    const particles = this.rainParticles;

    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];
      p.x -= p.wind * (1 + p.depth);
      p.y += p.speed * 0.016;

      if (p.y > camera.y + viewH + pad) {
        p.y = camera.y - pad;
        p.x = camera.x - pad + Math.random() * (viewW + pad * 2);
      }

      if (p.x < camera.x - pad) {
        p.x += viewW + pad * 2;
      }
    }
  },

  updateFogLayers() {
    const layers = this.fogLayers;
    for (let i = 0, len = layers.length; i < len; i++) {
      layers[i].time += 0.01;
    }
  },

  updateSnowParticles() {
    const viewH = 1080 / camera.zoom;
    const particles = this.snowParticles;
    const timeFactor = Math.sin(this.currentTime * 0.05) * 0.5;

    for (let i = 0, len = particles.length; i < len; i++) {
      const p = particles[i];
      p.y += p.speedY * 0.016;
      p.x += p.speedX * 0.016 + timeFactor;

      if (p.y > camera.y + viewH + 100) {
        p.y = camera.y - 100;
        p.x = camera.x - 500 + Math.random() * 2500;
      }
    }
  },

  updateLightningFlashes(dt) {
    for (let i = this.lightningFlashes.length - 1; i >= 0; i--) {
      const f = this.lightningFlashes[i];
      f.timer += dt;

      if (f.phase === "in") {
        f.opacity = (f.timer / (f.duration * 0.2)) * f.maxOpacity;
        if (f.timer >= f.duration * 0.2) {
          f.phase = "hold";
          f.opacity = f.maxOpacity;
        }
      } else if (f.phase === "hold") {
        if (f.timer >= f.duration * 0.4) f.phase = "out";
      } else if (f.phase === "out") {
        const remaining = f.duration - f.timer;
        f.opacity = (remaining / (f.duration * 0.6)) * f.maxOpacity;
        if (f.timer >= f.duration) {
          this.lightningFlashes.splice(i, 1);
        }
      }
    }
  },

  getTimeString() {
    const h = Math.floor(this.currentTime / 60);
    const m = Math.floor(this.currentTime % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
};

/**
 * Renderiza efeitos visuais de clima no canvas
 * Inclui escuridão ambiente, chuva, neve, neblina, relâmpagos e transição de sono
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
 * @param {Object} player - Objeto do jogador (necessário para posicionar luz)
 * @param {HTMLCanvasElement} canvas - Elemento canvas do jogo
 * @returns {void}
 */
export function drawWeatherEffects(ctx, player, canvas) {
  if (!player) return;

  const width = canvas.width;
  const height = canvas.height;

  if (WeatherSystem.ambientDarkness > 0) {
    ctx.save();
    const playerScreen = camera.worldToScreen(player.x, player.y);
    const px = Math.max(-2000, Math.min(width + 2000, playerScreen.x));
    const py = Math.max(-2000, Math.min(height + 2000, playerScreen.y));

    const gradient = ctx.createRadialGradient(px, py, 1 * camera.zoom, px, py, 80 * camera.zoom);
    const d = WeatherSystem.ambientDarkness;

    gradient.addColorStop(0, `rgba(10, 10, 25, ${d * 0.3})`);
    gradient.addColorStop(1, `rgba(5, 5, 15, ${d * 0.95})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  {
    const flashes = WeatherSystem.lightningFlashes;
    for (let i = 0, len = flashes.length; i < len; i++) {
      ctx.fillStyle = `rgba(255, 255, 230, ${flashes[i].opacity})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  if (WeatherSystem.rainParticles.length > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(180, 200, 255, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();

    const rainP = WeatherSystem.rainParticles;
    const camX = camera.x;
    const camY = camera.y;
    for (let i = 0, len = rainP.length; i < len; i++) {
      const p = rainP[i];
      const screenX = p.x - camX;
      const screenY = p.y - camY;

      if (screenX > -100 && screenX < width + 100 && screenY > -100 && screenY < height + 100) {
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - Math.cos(p.angle) * p.length, screenY + Math.sin(p.angle) * p.length);
      }
    }

    ctx.stroke();
    ctx.restore();
  }

  if (WeatherSystem.snowParticles.length > 0) {
    ctx.fillStyle = "white";
    ctx.beginPath();

    const snowP = WeatherSystem.snowParticles;
    const camX = camera.x;
    const camY = camera.y;
    for (let i = 0, len = snowP.length; i < len; i++) {
      const p = snowP[i];
      const screenX = p.x - camX;
      const screenY = p.y - camY;
      ctx.moveTo(screenX, screenY);
      ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
    }

    ctx.fill();
  }

  if (WeatherSystem.weatherType === "fog") {
    ctx.fillStyle = `rgba(200, 210, 220, 0.2)`;
    ctx.fillRect(0, 0, width, height);
  }

  if (WeatherSystem.sleepTransitionProgress > 0) {
    ctx.fillStyle = `rgba(0,0,0,${WeatherSystem.sleepTransitionProgress})`;
    ctx.fillRect(0, 0, width, height);
  }

  if (WeatherSystem.sleepPhase === "holding" && WeatherSystem.sleepMessage) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const boxW = 520;
    const boxH = 120;
    const bx = (width - boxW) / 2;
    const by = (height - boxH) / 2;

    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.fillRect(bx, by, boxW, boxH);

    ctx.fillStyle = "#ffffff";
    ctx.font = "20px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(WeatherSystem.sleepMessage, width / 2, height / 2 - 10);

    ctx.font = "14px 'Courier New', monospace";
    ctx.fillText(t('time.wait'), width / 2, height / 2 + 28);

    ctx.restore();
  }

  if (WeatherSystem.sleepTransitionProgress > 0.8 && WeatherSystem.sleepPhase !== "holding") {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "white";
    ctx.font = "30px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Zzz...", width / 2, height / 2);
    ctx.restore();
  }
}

/**
 * Atualiza o painel de UI de clima (posição e conteúdo)
 * O painel é um elemento HTML overlay ancorado no canto do canvas
 * @param {CanvasRenderingContext2D} ctx - Contexto do canvas (não utilizado, mantido por compatibilidade)
 * @returns {void}
 */
export function drawWeatherUI(ctx) {
  // O painel agora é overlay HTML ancorado no canto do canvas
  updateWeatherUIPanelPosition();
  updateWeatherUIPanelContent();
}
