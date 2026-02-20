import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Mock cameraSystem.js
mock.module('../../public/scripts/thePlayer/cameraSystem.js', () => ({
  camera: {
    x: 0, y: 0, zoom: 1,
    worldToScreen: (x, y) => ({ x, y })
  }
}));

// Mock loadingScreen.js
mock.module('../../public/scripts/loadingScreen.js', () => ({
  showSleepLoading: () => {},
  hideSleepLoading: () => {},
  blockInteractions: () => {},
  unblockInteractions: () => {}
}));

// Mock i18n
mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key, params) => {
    if (key === 'time.weekdays') return ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    if (key === 'seasons.spring') return 'Primavera';
    if (key === 'seasons.summer') return 'Verão';
    if (key === 'seasons.autumn') return 'Outono';
    if (key === 'seasons.winter') return 'Inverno';
    if (key === 'time.dayLabel') return 'Dia';
    if (key === 'time.seasonLabel') return 'Estação';
    if (key === 'time.weatherLabel') return 'Clima';
    if (key === 'time.sleeping') return `Dormindo do dia ${params?.fromDay} para o dia ${params?.toDay}`;
    if (key === 'time.wait') return 'Aguarde...';
    if (key === 'time.sleepZzz') return 'Zzz...';
    return key;
  }
}));

// Import REAL WeatherSystem from production code
const { WeatherSystem } = await import('../../public/scripts/weather.js');

describe('WeatherSystem (Production Implementation)', () => {

  beforeEach(() => {
    // Reset to default state
    WeatherSystem.currentTime = 6 * 60; // 06:00
    WeatherSystem.day = 1;
    WeatherSystem.month = 1;
    WeatherSystem.year = 1;
    WeatherSystem.seasonKey = 'spring';
    WeatherSystem.weatherType = 'clear';
    WeatherSystem.weatherTimer = 0;
    WeatherSystem.nextWeatherChange = 60 * 2;
    WeatherSystem.ambientDarkness = 1;
    WeatherSystem.isSleeping = false;
    WeatherSystem.sleepTransitionProgress = 0;
    WeatherSystem.sleepPhase = null;
    WeatherSystem.sleepTimerAcc = 0;
    WeatherSystem.sleepTargetDay = null;
    WeatherSystem.sleepMessage = '';
    WeatherSystem.isPaused = false;
    WeatherSystem.rainParticles = [];
    WeatherSystem.fogLayers = [];
    WeatherSystem.snowParticles = [];
    WeatherSystem.lightningFlashes = [];
    WeatherSystem.lastParticleUpdate = 0;
    WeatherSystem.timeSpeed = (24 * 60) / (12 * 60);
  });

  describe('initialization defaults', () => {
    test('should start at 06:00', () => {
      expect(WeatherSystem.currentTime).toBe(360);
    });

    test('should start on day 1', () => {
      expect(WeatherSystem.day).toBe(1);
    });

    test('should start in spring', () => {
      expect(WeatherSystem.seasonKey).toBe('spring');
    });

    test('should start with clear weather', () => {
      expect(WeatherSystem.weatherType).toBe('clear');
    });

    test('should start not sleeping', () => {
      expect(WeatherSystem.isSleeping).toBe(false);
    });

    test('should start not paused', () => {
      expect(WeatherSystem.isPaused).toBe(false);
    });

    test('should have empty particle arrays', () => {
      expect(WeatherSystem.rainParticles).toEqual([]);
      expect(WeatherSystem.fogLayers).toEqual([]);
      expect(WeatherSystem.snowParticles).toEqual([]);
      expect(WeatherSystem.lightningFlashes).toEqual([]);
    });
  });

  describe('getTimeString', () => {
    test('should format 06:00 correctly', () => {
      WeatherSystem.currentTime = 6 * 60;
      expect(WeatherSystem.getTimeString()).toBe('06:00');
    });

    test('should format midnight correctly', () => {
      WeatherSystem.currentTime = 0;
      expect(WeatherSystem.getTimeString()).toBe('00:00');
    });

    test('should format noon correctly', () => {
      WeatherSystem.currentTime = 12 * 60;
      expect(WeatherSystem.getTimeString()).toBe('12:00');
    });

    test('should format 23:59 correctly', () => {
      WeatherSystem.currentTime = 23 * 60 + 59;
      expect(WeatherSystem.getTimeString()).toBe('23:59');
    });

    test('should pad single digit hours', () => {
      WeatherSystem.currentTime = 3 * 60 + 5;
      expect(WeatherSystem.getTimeString()).toBe('03:05');
    });

    test('should handle fractional minutes', () => {
      WeatherSystem.currentTime = 6 * 60 + 30.7;
      expect(WeatherSystem.getTimeString()).toBe('06:30');
    });
  });

  describe('getWeekday', () => {
    test('should return Monday for day 1', () => {
      WeatherSystem.day = 1;
      expect(WeatherSystem.getWeekday()).toBe('Segunda');
    });

    test('should return Tuesday for day 2', () => {
      WeatherSystem.day = 2;
      expect(WeatherSystem.getWeekday()).toBe('Terça');
    });

    test('should return Sunday for day 7', () => {
      WeatherSystem.day = 7;
      expect(WeatherSystem.getWeekday()).toBe('Domingo');
    });

    test('should cycle back to Monday on day 8', () => {
      WeatherSystem.day = 8;
      expect(WeatherSystem.getWeekday()).toBe('Segunda');
    });

    test('should handle large day numbers', () => {
      WeatherSystem.day = 15; // (15-1) % 7 = 0 -> Monday
      expect(WeatherSystem.getWeekday()).toBe('Segunda');
    });
  });

  describe('getSeasonName', () => {
    test('should return translated spring', () => {
      WeatherSystem.seasonKey = 'spring';
      expect(WeatherSystem.getSeasonName()).toBe('Primavera');
    });

    test('should return translated summer', () => {
      WeatherSystem.seasonKey = 'summer';
      expect(WeatherSystem.getSeasonName()).toBe('Verão');
    });

    test('should return translated autumn', () => {
      WeatherSystem.seasonKey = 'autumn';
      expect(WeatherSystem.getSeasonName()).toBe('Outono');
    });

    test('should return translated winter', () => {
      WeatherSystem.seasonKey = 'winter';
      expect(WeatherSystem.getSeasonName()).toBe('Inverno');
    });
  });

  describe('pause and resume', () => {
    test('should pause the system', () => {
      WeatherSystem.pause();
      expect(WeatherSystem.isPaused).toBe(true);
    });

    test('should resume the system', () => {
      WeatherSystem.pause();
      WeatherSystem.resume();
      expect(WeatherSystem.isPaused).toBe(false);
    });

    test('update should not advance time when paused', () => {
      WeatherSystem.pause();
      const timeBefore = WeatherSystem.currentTime;

      WeatherSystem.update(1);

      expect(WeatherSystem.currentTime).toBe(timeBefore);
    });
  });

  describe('update', () => {
    test('should advance time based on deltaTime and timeSpeed', () => {
      const timeBefore = WeatherSystem.currentTime;
      WeatherSystem.update(1); // 1 second

      expect(WeatherSystem.currentTime).toBeGreaterThan(timeBefore);
      expect(WeatherSystem.currentTime).toBe(timeBefore + WeatherSystem.timeSpeed);
    });

    test('should advance weather timer', () => {
      WeatherSystem.weatherTimer = 0;
      WeatherSystem.update(10);

      expect(WeatherSystem.weatherTimer).toBe(10);
    });

    test('should trigger day change when time exceeds 24 hours', () => {
      WeatherSystem.currentTime = 24 * 60 - 1; // 23:59
      WeatherSystem.day = 1;

      // Advance enough to cross midnight
      WeatherSystem.update(60 / WeatherSystem.timeSpeed);

      expect(WeatherSystem.day).toBe(2);
      expect(WeatherSystem.currentTime).toBeLessThan(24 * 60);
    });

    test('should not update when sleeping', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'fadingOut';
      const timeBefore = WeatherSystem.currentTime;

      WeatherSystem.update(1);

      // Time should not advance normally when sleeping
      // (sleep transition handles its own time logic)
      expect(WeatherSystem.currentTime).toBe(timeBefore);
    });

    test('should randomize weather when timer exceeds nextWeatherChange', () => {
      WeatherSystem.weatherTimer = 0;
      WeatherSystem.nextWeatherChange = 5;

      WeatherSystem.update(6); // Exceeds 5

      // Weather timer should be reset
      expect(WeatherSystem.weatherTimer).toBe(0);
      // nextWeatherChange should have a new value
      expect(WeatherSystem.nextWeatherChange).toBeDefined();
    });
  });

  describe('advanceDate', () => {
    test('should increment day by 1', () => {
      WeatherSystem.day = 1;
      WeatherSystem.advanceDate();
      expect(WeatherSystem.day).toBe(2);
    });

    test('should advance month after day 30', () => {
      WeatherSystem.day = 30;
      WeatherSystem.month = 1;
      WeatherSystem.advanceDate();

      expect(WeatherSystem.day).toBe(1);
      expect(WeatherSystem.month).toBe(2);
    });

    test('should advance year after month 12', () => {
      WeatherSystem.day = 30;
      WeatherSystem.month = 12;
      WeatherSystem.year = 1;

      WeatherSystem.advanceDate();

      expect(WeatherSystem.day).toBe(1);
      expect(WeatherSystem.month).toBe(1);
      expect(WeatherSystem.year).toBe(2);
    });

    test('should not advance month before day 31', () => {
      WeatherSystem.day = 15;
      WeatherSystem.month = 3;
      WeatherSystem.advanceDate();

      expect(WeatherSystem.day).toBe(16);
      expect(WeatherSystem.month).toBe(3);
    });

    test('should update season after date change', () => {
      WeatherSystem.day = 30;
      WeatherSystem.month = 5; // May -> will advance to June
      WeatherSystem.seasonKey = 'spring';

      WeatherSystem.advanceDate();

      expect(WeatherSystem.month).toBe(6);
      expect(WeatherSystem.seasonKey).toBe('summer');
    });

    test('should set sleepTargetDay', () => {
      WeatherSystem.day = 5;
      WeatherSystem.advanceDate();
      expect(WeatherSystem.sleepTargetDay).toBe(6);
    });
  });

  describe('updateSeason', () => {
    test('should set spring for months 3-5', () => {
      WeatherSystem.month = 3;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('spring');

      WeatherSystem.month = 5;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('spring');
    });

    test('should set summer for months 6-8', () => {
      WeatherSystem.month = 6;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('summer');

      WeatherSystem.month = 8;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('summer');
    });

    test('should set autumn for months 9-11', () => {
      WeatherSystem.month = 9;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('autumn');

      WeatherSystem.month = 11;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('autumn');
    });

    test('should set winter for months 12, 1, 2', () => {
      WeatherSystem.month = 12;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('winter');

      WeatherSystem.month = 1;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('winter');

      WeatherSystem.month = 2;
      WeatherSystem.updateSeason();
      expect(WeatherSystem.seasonKey).toBe('winter');
    });
  });

  describe('updateAmbientLight', () => {
    test('should be fully dark at midnight', () => {
      WeatherSystem.currentTime = 0;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(1.0);
    });

    test('should be fully dark at 4:00 AM', () => {
      WeatherSystem.currentTime = 4 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(1.0);
    });

    test('should be fully bright at noon', () => {
      WeatherSystem.currentTime = 12 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(0.0);
    });

    test('should be fully bright at 8:00 AM', () => {
      WeatherSystem.currentTime = 8 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(0.0);
    });

    test('should be fully bright at 16:00', () => {
      WeatherSystem.currentTime = 16 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(0.0);
    });

    test('should be fully dark at 20:00', () => {
      WeatherSystem.currentTime = 20 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBe(1.0);
    });

    test('should have partial darkness at dawn (6:00)', () => {
      WeatherSystem.currentTime = 6 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBeGreaterThan(0);
      expect(WeatherSystem.ambientDarkness).toBeLessThan(1);
    });

    test('should have partial darkness at dusk (17:00)', () => {
      WeatherSystem.currentTime = 17 * 60;
      WeatherSystem.updateAmbientLight();
      expect(WeatherSystem.ambientDarkness).toBeGreaterThan(0);
      expect(WeatherSystem.ambientDarkness).toBeLessThan(1);
    });

    test('should transition smoothly between periods', () => {
      // Check that 7:00 is between 6:00 and 8:00 values
      WeatherSystem.currentTime = 6 * 60;
      WeatherSystem.updateAmbientLight();
      const at6 = WeatherSystem.ambientDarkness;

      WeatherSystem.currentTime = 7 * 60;
      WeatherSystem.updateAmbientLight();
      const at7 = WeatherSystem.ambientDarkness;

      WeatherSystem.currentTime = 8 * 60;
      WeatherSystem.updateAmbientLight();
      const at8 = WeatherSystem.ambientDarkness;

      expect(at7).toBeLessThan(at6);
      expect(at7).toBeGreaterThan(at8);
    });
  });

  describe('randomizeWeather', () => {
    test('should set a valid weather type', () => {
      WeatherSystem.randomizeWeather();
      expect(['clear', 'rain', 'storm', 'fog', 'blizzard']).toContain(WeatherSystem.weatherType);
    });

    test('should clear all particle arrays before generating new ones', () => {
      WeatherSystem.rainParticles = [{ x: 1 }];
      WeatherSystem.fogLayers = [{ x: 1 }];
      WeatherSystem.snowParticles = [{ x: 1 }];
      WeatherSystem.lightningFlashes = [{ x: 1 }];

      WeatherSystem.randomizeWeather();

      // After randomizeWeather, arrays should have been cleared and regenerated
      const hasOldEntry = (arr) => arr.some(p => p.x === 1 && Object.keys(p).length === 1);
      expect(hasOldEntry(WeatherSystem.rainParticles)).toBe(false);
      expect(hasOldEntry(WeatherSystem.fogLayers)).toBe(false);
      expect(hasOldEntry(WeatherSystem.snowParticles)).toBe(false);
      expect(hasOldEntry(WeatherSystem.lightningFlashes)).toBe(false);
    });

    test('should generate rain particles for rain weather', () => {
      // Force rain by mocking, then test generateRainParticles
      WeatherSystem.weatherType = 'rain';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();

      expect(WeatherSystem.rainParticles.length).toBeGreaterThan(0);
    });

    test('should generate more particles for storm than rain', () => {
      WeatherSystem.weatherType = 'rain';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();
      const rainCount = WeatherSystem.rainParticles.length;

      WeatherSystem.weatherType = 'storm';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();
      const stormCount = WeatherSystem.rainParticles.length;

      expect(stormCount).toBeGreaterThan(rainCount);
    });

    test('in winter should only produce clear or blizzard', () => {
      WeatherSystem.seasonKey = 'winter';

      // Run many times to check distribution
      const results = new Set();
      for (let i = 0; i < 100; i++) {
        WeatherSystem.randomizeWeather();
        results.add(WeatherSystem.weatherType);
      }

      // Should only contain clear and/or blizzard
      for (const type of results) {
        expect(['clear', 'blizzard']).toContain(type);
      }
    });

    test('in non-winter should produce clear, rain, storm, or fog', () => {
      WeatherSystem.seasonKey = 'summer';

      const results = new Set();
      for (let i = 0; i < 200; i++) {
        WeatherSystem.randomizeWeather();
        results.add(WeatherSystem.weatherType);
      }

      // Should not contain blizzard
      expect(results.has('blizzard')).toBe(false);
      // Should have at least some variety
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('generateRainParticles', () => {
    test('should generate 900 particles for rain', () => {
      WeatherSystem.weatherType = 'rain';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();
      expect(WeatherSystem.rainParticles).toHaveLength(900);
    });

    test('should generate 1600 particles for storm', () => {
      WeatherSystem.weatherType = 'storm';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();
      expect(WeatherSystem.rainParticles).toHaveLength(1600);
    });

    test('rain particles should have required properties', () => {
      WeatherSystem.weatherType = 'rain';
      WeatherSystem.rainParticles = [];
      WeatherSystem.generateRainParticles();

      const p = WeatherSystem.rainParticles[0];
      expect(p).toHaveProperty('x');
      expect(p).toHaveProperty('y');
      expect(p).toHaveProperty('depth');
      expect(p).toHaveProperty('speed');
      expect(p).toHaveProperty('wind');
      expect(p).toHaveProperty('angle');
      expect(p).toHaveProperty('length');
      expect(p).toHaveProperty('opacity');
    });
  });

  describe('generateFogLayers', () => {
    test('should generate 6 fog layers', () => {
      WeatherSystem.fogLayers = [];
      WeatherSystem.generateFogLayers();
      expect(WeatherSystem.fogLayers).toHaveLength(6);
    });

    test('fog layers should have required properties', () => {
      WeatherSystem.fogLayers = [];
      WeatherSystem.generateFogLayers();

      const layer = WeatherSystem.fogLayers[0];
      expect(layer).toHaveProperty('x');
      expect(layer).toHaveProperty('y');
      expect(layer).toHaveProperty('speed');
      expect(layer).toHaveProperty('density');
      expect(layer).toHaveProperty('time');
    });
  });

  describe('generateSnowParticles', () => {
    test('should generate 500 snow particles', () => {
      WeatherSystem.snowParticles = [];
      WeatherSystem.generateSnowParticles();
      expect(WeatherSystem.snowParticles).toHaveLength(500);
    });

    test('snow particles should have required properties', () => {
      WeatherSystem.snowParticles = [];
      WeatherSystem.generateSnowParticles();

      const p = WeatherSystem.snowParticles[0];
      expect(p).toHaveProperty('x');
      expect(p).toHaveProperty('y');
      expect(p).toHaveProperty('size');
      expect(p).toHaveProperty('speedY');
      expect(p).toHaveProperty('speedX');
      expect(p).toHaveProperty('opacity');
    });
  });

  describe('addLightningFlash', () => {
    test('should add a lightning flash', () => {
      WeatherSystem.lightningFlashes = [];
      WeatherSystem.addLightningFlash();
      expect(WeatherSystem.lightningFlashes).toHaveLength(1);
    });

    test('lightning flash should have correct structure', () => {
      WeatherSystem.lightningFlashes = [];
      WeatherSystem.addLightningFlash();

      const flash = WeatherSystem.lightningFlashes[0];
      expect(flash.opacity).toBe(0);
      expect(flash.maxOpacity).toBeGreaterThan(0);
      expect(flash.duration).toBeGreaterThan(0);
      expect(flash.phase).toBe('in');
      expect(flash.timer).toBe(0);
    });
  });

  describe('updateLightningFlashes', () => {
    test('should advance flash timer', () => {
      WeatherSystem.lightningFlashes = [{
        opacity: 0,
        maxOpacity: 1,
        duration: 0.3,
        phase: 'in',
        timer: 0
      }];

      WeatherSystem.updateLightningFlashes(0.016);
      expect(WeatherSystem.lightningFlashes[0].timer).toBe(0.016);
    });

    test('should transition through phases: in -> hold -> out', () => {
      const flash = {
        opacity: 0,
        maxOpacity: 1,
        duration: 0.3,
        phase: 'in',
        timer: 0
      };
      WeatherSystem.lightningFlashes = [flash];

      // Phase "in": 0 to 20% of duration = 0.06
      WeatherSystem.updateLightningFlashes(0.07);
      expect(flash.phase).toBe('hold');

      // Phase "hold": 20% to 40% of duration
      WeatherSystem.updateLightningFlashes(0.07);
      expect(flash.phase).toBe('out');
    });

    test('should remove flash when finished', () => {
      WeatherSystem.lightningFlashes = [{
        opacity: 0.5,
        maxOpacity: 1,
        duration: 0.1,
        phase: 'out',
        timer: 0.09
      }];

      WeatherSystem.updateLightningFlashes(0.02); // timer = 0.11 > duration 0.1
      expect(WeatherSystem.lightningFlashes).toHaveLength(0);
    });
  });

  describe('sleep', () => {
    test('should start sleep transition', () => {
      WeatherSystem.sleep();

      expect(WeatherSystem.isSleeping).toBe(true);
      expect(WeatherSystem.sleepPhase).toBe('fadingOut');
      expect(WeatherSystem.sleepTimerAcc).toBe(0);
      expect(WeatherSystem.sleepTransitionProgress).toBe(0);
    });

    test('should not restart sleep if already sleeping', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'holding';
      WeatherSystem.sleepTimerAcc = 1000;

      WeatherSystem.sleep();

      // Should not reset
      expect(WeatherSystem.sleepPhase).toBe('holding');
      expect(WeatherSystem.sleepTimerAcc).toBe(1000);
    });
  });

  describe('_updateSleepTransition', () => {
    test('should progress through fadingOut phase', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'fadingOut';
      WeatherSystem.sleepTimerAcc = 0;

      WeatherSystem._updateSleepTransition(750); // Half of fadeOut (1500ms)

      expect(WeatherSystem.sleepTransitionProgress).toBeCloseTo(0.5, 1);
    });

    test('should transition from fadingOut to holding', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'fadingOut';
      WeatherSystem.sleepTimerAcc = 0;
      WeatherSystem.day = 5;

      WeatherSystem._updateSleepTransition(1600); // Exceeds fadeOut (1500ms)

      expect(WeatherSystem.sleepPhase).toBe('holding');
      expect(WeatherSystem.sleepTimerAcc).toBe(0);
      expect(WeatherSystem.currentTime).toBe(6 * 60); // Reset to 06:00
      expect(WeatherSystem.day).toBe(6); // Advanced by 1 (advanceDate: 5 -> 6)
    });

    test('should transition from holding to fadingIn', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'holding';
      WeatherSystem.sleepTimerAcc = 0;

      WeatherSystem._updateSleepTransition(5100); // Exceeds hold (5000ms)

      expect(WeatherSystem.sleepPhase).toBe('fadingIn');
      expect(WeatherSystem.sleepTimerAcc).toBe(0);
    });

    test('should complete sleep cycle in fadingIn phase', () => {
      WeatherSystem.isSleeping = true;
      WeatherSystem.sleepPhase = 'fadingIn';
      WeatherSystem.sleepTimerAcc = 0;

      WeatherSystem._updateSleepTransition(1600); // Exceeds fadeIn (1500ms)

      expect(WeatherSystem.isSleeping).toBe(false);
      expect(WeatherSystem.sleepPhase).toBeNull();
      expect(WeatherSystem.sleepTransitionProgress).toBe(0);
      expect(WeatherSystem.sleepMessage).toBe('');
    });
  });

  describe('full day cycle', () => {
    test('should complete a full 30-day month cycle', () => {
      WeatherSystem.day = 1;
      WeatherSystem.month = 1;

      for (let i = 0; i < 30; i++) {
        WeatherSystem.advanceDate();
      }

      expect(WeatherSystem.day).toBe(1);
      expect(WeatherSystem.month).toBe(2);
    });

    test('should complete a full year cycle', () => {
      WeatherSystem.day = 1;
      WeatherSystem.month = 1;
      WeatherSystem.year = 1;

      // 12 months * 30 days = 360 advances
      for (let i = 0; i < 360; i++) {
        WeatherSystem.advanceDate();
      }

      expect(WeatherSystem.day).toBe(1);
      expect(WeatherSystem.month).toBe(1);
      expect(WeatherSystem.year).toBe(2);
    });

    test('seasons should follow correct cycle through a year', () => {
      WeatherSystem.day = 30;
      const seasonCycle = [];

      for (let m = 1; m <= 12; m++) {
        WeatherSystem.month = m;
        WeatherSystem.updateSeason();
        seasonCycle.push(WeatherSystem.seasonKey);
      }

      expect(seasonCycle).toEqual([
        'winter', 'winter',       // Jan, Feb
        'spring', 'spring', 'spring', // Mar, Apr, May
        'summer', 'summer', 'summer', // Jun, Jul, Aug
        'autumn', 'autumn', 'autumn', // Sep, Oct, Nov
        'winter'                       // Dec
      ]);
    });
  });

  describe('timeSpeed', () => {
    test('should have correct default time speed', () => {
      // 24*60 / (12*60) = 2 game-minutes per real-second
      expect(WeatherSystem.timeSpeed).toBe(2);
    });

    test('time should advance proportionally to timeSpeed', () => {
      const startTime = WeatherSystem.currentTime;
      WeatherSystem.update(1); // 1 real second

      const elapsed = WeatherSystem.currentTime - startTime;
      expect(elapsed).toBeCloseTo(WeatherSystem.timeSpeed, 2);
    });
  });

  describe('sleepDurations', () => {
    test('should have correct default durations', () => {
      expect(WeatherSystem.sleepDurations.fadeOut).toBe(1500);
      expect(WeatherSystem.sleepDurations.hold).toBe(5000);
      expect(WeatherSystem.sleepDurations.fadeIn).toBe(1500);
    });
  });

  describe('edge cases', () => {
    test('should handle multiple rapid weather changes', () => {
      for (let i = 0; i < 50; i++) {
        WeatherSystem.randomizeWeather();
      }
      expect(['clear', 'rain', 'storm', 'fog', 'blizzard']).toContain(WeatherSystem.weatherType);
    });

    test('should handle year overflow correctly', () => {
      WeatherSystem.day = 30;
      WeatherSystem.month = 12;
      WeatherSystem.year = 999;

      WeatherSystem.advanceDate();

      expect(WeatherSystem.year).toBe(1000);
      expect(WeatherSystem.month).toBe(1);
      expect(WeatherSystem.day).toBe(1);
    });
  });
});
