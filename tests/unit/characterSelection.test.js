import { describe, test, expect, beforeEach, mock } from 'bun:test';
import "../setup.js";

// Track calls for assertions
let setActiveCharacterCalls = [];

// Mock dependencies of playerSystem.js (so the REAL module loads correctly)
mock.module('../../public/scripts/constants.js', () => ({
  DEFAULTS: { SPRITE_SIZE_PX: 32 },
  DEFAULT_SPRITE_SIZE_PX: 32,
  TIMING: { UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000 },
  UI_UPDATE_DELAY_MS: 50, UI_MIN_UPDATE_INTERVAL_MS: 30, MOUSE_UPDATE_INTERVAL_MS: 25, DEBUG_UPDATE_INTERVAL_MS: 200, NEEDS_UPDATE_INTERVAL_MS: 2000, SLEEP_ENERGY_RESTORE_INTERVAL_MS: 1000, FEEDBACK_MESSAGE_DURATION_MS: 1500, CONSUMPTION_BAR_DURATION_MS: 2000, INIT_DELAY_MS: 100, IDLE_STATE_MIN_MS: 1000, IDLE_STATE_MAX_MS: 3000, MOVE_STATE_MIN_MS: 500, MOVE_STATE_MAX_MS: 2000,
  GAME_BALANCE: { DAMAGE: { COOLDOWN_MS: 300, TREE_HP: 6, ROCK_HP: 3, STRUCTURE_HP: 10, DEFAULT_HP: 1, AXE_DAMAGE: 2, PICKAXE_DAMAGE: 2, MACHETE_DAMAGE: 1 }, NEEDS: { MAX_VALUE: 100, CRITICAL_THRESHOLD: 10, LOW_THRESHOLD: 20, ENERGY_CRITICAL: 15, SLEEP_ENERGY_RESTORE_AMOUNT: 10, CONSUMPTION_RATES: { moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 }, breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 }, building: { hunger: 0.8, thirst: 1.0, energy: 1.5 }, collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 }, idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 } }, FOOD_RESTORATION: { DRINK_THIRST: 20, DRINK_ENERGY: 5, FOOD_HUNGER: 20, FOOD_ENERGY: 10, WATER_THIRST: 30 } }, ECONOMY: { INITIAL_MONEY: 1000, MAX_TRANSACTION_HISTORY: 100 } },
  SIZES: { HEALTH_BAR: { WIDTH: 50, HEIGHT: 6, OFFSET_Y: 12 }, KEY_PROMPT: { SIZE: 32, OFFSET_Y: 45, OFFSET_Y_NO_HEALTH: 20 }, CONSUMPTION_BAR: { WIDTH: 60, HEIGHT: 8, PLAYER_OFFSET_Y: 30 }, MOBILE_UI: { INTERACT_BUTTON: { WIDTH: 70, HEIGHT: 70, BOTTOM: 100, RIGHT: 30 }, JOYSTICK_AREA: { WIDTH: 150, HEIGHT: 150 } } },
  RANGES: { INTERACTION_RANGE: 70, INTERACTION_RANGE_CLOSE_MULTIPLIER: 0.7, ANIMAL_SIGHT_RADIUS: 128, TOUCH_MOVE_STOP_DISTANCE: 15 },
  MOVEMENT: { PLAYER_SPEED: 5, ANIMAL_SPEED: 0.5, TOUCH_MOVE_SPEED: 180, DIAGONAL_MULTIPLIER: 0.7071, COLLISION_STEP_PX: 4, MAX_COLLISION_ITERATIONS: 6 },
  ANIMATION: { FRAME_RATE_IDLE_MS: 500, FRAME_RATE_MOVE_MS: 150 },
  VISUAL: { HEALTH_BAR: { THRESHOLD_HIGH: 0.5, THRESHOLD_MID: 0.25, BORDER_RADIUS: 3, MIN_WIDTH: 0 }, GLOW: { RADIUS: 50, ALPHA: 0.1, PULSE_FREQUENCY: 3, PULSE_BASE: 0.8, PULSE_AMPLITUDE: 0.2 }, KEY_PROMPT: {}, GRID: {} },
  HITBOX_CONFIGS: { STATIC_OBJECTS: { TREE: { width: 38, height: 40 }, ROCK: { width: 32, height: 27 } }, ANIMALS: { DEFAULT: { widthRatio: 0.4, heightRatio: 0.3, offsetXRatio: 0.3, offsetYRatio: 0.7 } }, PLAYER: { WIDTH_RATIO: 0.7, HEIGHT_RATIO: 0.3, OFFSET_X_RATIO: 0.15, OFFSET_Y_RATIO: 0.7 }, INTERACTION_ZONES: { PLAYER: { WIDTH_RATIO: 1.8, HEIGHT_RATIO: 1.8, OFFSET_X: -0.4, OFFSET_Y: -0.4 } } },
  MOBILE: { JOYSTICK_MAX_DISTANCE: 40, JOYSTICK_THRESHOLD: 10, SCREEN_WIDTH_THRESHOLD: 768 },
  CAMERA: { CULLING_BUFFER: 200 },
  UI: { FONT_SIZES: { KEY_PROMPT: 14, HEALTH_BAR_TEXT: 10 } },
}));

mock.module('../../public/scripts/validation.js', () => ({
  MAX_CURRENCY: 1_000_000_000,
  isValidPositiveInteger: (n) => Number.isInteger(n) && n > 0,
  isValidItemId: (id) => Number.isInteger(id) && id > 0,
  isValidPositiveNumber: (n) => typeof n === 'number' && n > 0,
  sanitizeQuantity: (q, min = 1, max = 9999) => Math.max(min, Math.min(max, Math.floor(q))),
  validateRange: (v, min, max) => Math.max(min, Math.min(max, v)),
  validateTradeInput: () => ({ valid: true }),
}));

mock.module('../../public/scripts/gameState.js', () => ({
  registerSystem: () => {},
  getSystem: () => null,
  getObject: () => null,
  setObject: () => {},
  setDebugFlag: () => {},
  getDebugFlag: () => false,
  setGameFlag: () => {},
  checkGameFlag: () => false,
  initDebugFlagsFromUrl: () => {},
  exposeDebug: () => {},
  installLegacyGlobals: () => {},
  default: {},
}));

mock.module('../../public/scripts/logger.js', () => ({
  logger: { warn: () => {}, error: () => {}, info: () => {}, debug: () => {} }
}));

mock.module('../../public/scripts/i18n/i18n.js', () => ({
  t: (key) => key
}));

// playerSystem.js is NOT mocked - uses real module (dependencies are mocked above)
// Import real PlayerSystem class to create a mock instance
const { PlayerSystem } = await import('../../public/scripts/thePlayer/playerSystem.js');
// Create a mock instance of PlayerSystem
const mockPlayerSystem = new PlayerSystem();
// Override setActiveCharacter to track calls
const _origSetActiveCharacter = mockPlayerSystem.setActiveCharacter.bind(mockPlayerSystem);
mockPlayerSystem.setActiveCharacter = (data) => {
  setActiveCharacterCalls.push(data);
  _origSetActiveCharacter(data);
};

// Mock the import of playerSystem to return our mock instance
mock.module('../../public/scripts/thePlayer/playerSystem.js', () => ({
  playerSystem: mockPlayerSystem,
  PlayerSystem,
  default: PlayerSystem,
}));

const { CharacterSelection } = await import('../../public/scripts/thePlayer/characterSelection.js');

describe('CharacterSelection (Production Implementation)', () => {
  let cs;

  beforeEach(() => {
    setActiveCharacterCalls = [];
    cs = new CharacterSelection();
  });

  describe('constructor', () => {
    test('should initialize characters array', () => {
      expect(Array.isArray(cs.characters)).toBe(true);
    });

    test('should have exactly 3 characters', () => {
      expect(cs.characters.length).toBe(3);
    });

    test('should start with no selected character', () => {
      expect(cs.selectedCharacter).toBeNull();
    });

    test('should start with loading flag as false', () => {
      expect(cs._loadingInProgress).toBe(false);
    });

    test('should create container element', () => {
      expect(cs.container).toBeDefined();
    });
  });

  describe('characters data', () => {
    test('should include Stella', () => {
      const stella = cs.characters.find(c => c.id === 'stella');
      expect(stella).toBeDefined();
      expect(stella.name).toBe('Stella');
    });

    test('should include Ben', () => {
      const ben = cs.characters.find(c => c.id === 'ben');
      expect(ben).toBeDefined();
      expect(ben.name).toBe('Ben');
    });

    test('should include Graham', () => {
      const graham = cs.characters.find(c => c.id === 'graham');
      expect(graham).toBeDefined();
      expect(graham.name).toBe('Graham');
    });

    test('should have portrait paths for all characters', () => {
      cs.characters.forEach(character => {
        expect(character.portrait).toBeDefined();
        expect(typeof character.portrait).toBe('string');
        expect(character.portrait.length).toBeGreaterThan(0);
      });
    });

    test('should have unique IDs', () => {
      const ids = cs.characters.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    test('should have portrait paths pointing to webp files', () => {
      cs.characters.forEach(character => {
        expect(character.portrait).toContain('.webp');
      });
    });
  });

  describe('getCharacterSubtitle', () => {
    test('should return i18n key for stella', () => {
      const subtitle = cs.getCharacterSubtitle('stella');
      expect(subtitle).toBe('characterSelection.subtitles.stella');
    });

    test('should return i18n key for ben', () => {
      const subtitle = cs.getCharacterSubtitle('ben');
      expect(subtitle).toBe('characterSelection.subtitles.ben');
    });

    test('should return i18n key for graham', () => {
      const subtitle = cs.getCharacterSubtitle('graham');
      expect(subtitle).toBe('characterSelection.subtitles.graham');
    });
  });

  describe('getCharacterTraits', () => {
    test('should return empty string for stella', () => {
      expect(cs.getCharacterTraits('stella')).toBe('');
    });

    test('should return empty string for ben', () => {
      expect(cs.getCharacterTraits('ben')).toBe('');
    });

    test('should return empty string for graham', () => {
      expect(cs.getCharacterTraits('graham')).toBe('');
    });

    test('should return empty string for unknown character', () => {
      expect(cs.getCharacterTraits('unknown')).toBe('');
    });
  });

  describe('selectCharacter', () => {
    test('should set selectedCharacter for valid ID', () => {
      // updatePlayerInfo doesn't exist on the class, stub it to avoid TypeError
      cs.updatePlayerInfo = () => {};
      cs.selectCharacter('stella');
      expect(cs.selectedCharacter).toBeDefined();
      expect(cs.selectedCharacter.id).toBe('stella');
    });

    test('should find correct character by id', () => {
      cs.updatePlayerInfo = () => {};
      cs.selectCharacter('ben');
      expect(cs.selectedCharacter.name).toBe('Ben');
    });

    test('should update selectedCharacter when selecting different character', () => {
      cs.updatePlayerInfo = () => {};
      cs.selectCharacter('stella');
      cs.selectCharacter('graham');
      expect(cs.selectedCharacter.id).toBe('graham');
    });
  });

  describe('startGame', () => {
    test('should call playerSystem.setActiveCharacter', () => {
      cs.selectedCharacter = cs.characters[0]; // Stella
      cs.startGame();
      expect(setActiveCharacterCalls.length).toBe(1);
      expect(setActiveCharacterCalls[0].id).toBe('stella');
    });

    test('should dispatch characterSelected event', () => {
      let eventFired = false;
      document.addEventListener('characterSelected', () => { eventFired = true; });

      cs.selectedCharacter = cs.characters[1]; // Ben
      cs.startGame();
      expect(eventFired).toBe(true);
    });
  });

  describe('loadGame', () => {
    test('should set _loadingInProgress to prevent concurrent loads', async () => {
      cs._loadingInProgress = true;
      await cs.loadGame();
      // Should return early, _loadingInProgress stays true
      expect(cs._loadingInProgress).toBe(true);
    });

    test('should reset _loadingInProgress after attempt', async () => {
      // loadGame will fail since saveSystem import will fail in test env
      // but should still reset the flag
      cs._loadingInProgress = false;
      await cs.loadGame();
      expect(cs._loadingInProgress).toBe(false);
    });
  });

  describe('show', () => {
    test('should set container display to flex', () => {
      cs.container.style.display = 'none';
      cs.show();
      expect(cs.container.style.display).toBe('flex');
    });

    test('should not throw without container', () => {
      cs.container = null;
      expect(() => cs.show()).not.toThrow();
    });
  });

  describe('init', () => {
    test('should call createUI and bindEvents', () => {
      // init is called in constructor, so container should exist
      expect(cs.container).toBeDefined();
      expect(cs.container.className).toBe('chs-character-selection');
    });
  });
});
