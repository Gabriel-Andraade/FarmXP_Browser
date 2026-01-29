/**
 * @file constants.js - Game Constants
 * @description Centralized location for all magic numbers and configuration values.
 * Import from here instead of using hardcoded values.
 */

// ============================================================
// TIMING CONSTANTS (in milliseconds)
// ============================================================

export const DAMAGE_COOLDOWN_MS = 300;
export const UI_UPDATE_DELAY_MS = 50;
export const UI_MIN_UPDATE_INTERVAL_MS = 30;
export const MOUSE_UPDATE_INTERVAL_MS = 25;
export const DEBUG_UPDATE_INTERVAL_MS = 200;
export const NEEDS_UPDATE_INTERVAL_MS = 2000;
export const SLEEP_ENERGY_RESTORE_INTERVAL_MS = 1000;
export const FEEDBACK_MESSAGE_DURATION_MS = 1500;
export const CONSUMPTION_BAR_DURATION_MS = 2000;
export const INIT_DELAY_MS = 100;

// Animal AI timing
export const IDLE_STATE_MIN_MS = 1000;
export const IDLE_STATE_MAX_MS = 3000;
export const MOVE_STATE_MIN_MS = 500;
export const MOVE_STATE_MAX_MS = 2000;

// ============================================================
// GAME BALANCE CONSTANTS
// ============================================================

export const GAME_BALANCE = {
  DAMAGE: {
    COOLDOWN_MS: 300,
    TREE_HP: 6,
    ROCK_HP: 3,
    STRUCTURE_HP: 10,
    DEFAULT_HP: 1,
    AXE_DAMAGE: 2,
    PICKAXE_DAMAGE: 2,
    MACHETE_DAMAGE: 1
  },

  NEEDS: {
    MAX_VALUE: 100,
    CRITICAL_THRESHOLD: 10,
    LOW_THRESHOLD: 20,
    ENERGY_CRITICAL: 15,
    SLEEP_ENERGY_RESTORE_AMOUNT: 10,

    CONSUMPTION_RATES: {
      moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 },
      breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 },
      building: { hunger: 0.8, thirst: 1.0, energy: 1.5 },
      collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 },
      idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 }
    },

    FOOD_RESTORATION: {
      DRINK_THIRST: 20,
      DRINK_ENERGY: 5,
      FOOD_HUNGER: 20,
      FOOD_ENERGY: 10,
      WATER_THIRST: 30
    }
  },

  ECONOMY: {
    INITIAL_MONEY: 1000,
    MAX_TRANSACTION_HISTORY: 100
  }
};

// ============================================================
// SIZE CONSTANTS (in pixels)
// ============================================================

export const SIZES = {
  HEALTH_BAR: {
    WIDTH: 50,
    HEIGHT: 6,
    OFFSET_Y: 12
  },

  KEY_PROMPT: {
    SIZE: 32,
    OFFSET_Y: 45,
    OFFSET_Y_NO_HEALTH: 20
  },

  CONSUMPTION_BAR: {
    WIDTH: 60,
    HEIGHT: 8,
    PLAYER_OFFSET_Y: 30
  },

  MOBILE_UI: {
    INTERACT_BUTTON: {
      WIDTH: 70,
      HEIGHT: 70,
      BOTTOM: 100,
      RIGHT: 30
    },
    JOYSTICK_AREA: {
      WIDTH: 150,
      HEIGHT: 150
    }
  }
};

// ============================================================
// RANGE/DISTANCE CONSTANTS (in pixels)
// ============================================================

export const RANGES = {
  INTERACTION_RANGE: 70,
  INTERACTION_RANGE_CLOSE_MULTIPLIER: 0.7,
  ANIMAL_SIGHT_RADIUS: 128,
  TOUCH_MOVE_STOP_DISTANCE: 15
};

// ============================================================
// MOVEMENT CONSTANTS
// ============================================================

export const MOVEMENT = {
  PLAYER_SPEED: 5,
  ANIMAL_SPEED: 0.5,
  TOUCH_MOVE_SPEED: 180,
  DIAGONAL_MULTIPLIER: 0.7071,
  COLLISION_STEP_PX: 4,
  MAX_COLLISION_ITERATIONS: 6
};

// ============================================================
// ANIMATION CONSTANTS (in milliseconds)
// ============================================================

export const ANIMATION = {
  FRAME_RATE_IDLE_MS: 500,
  FRAME_RATE_MOVE_MS: 150
};

// ============================================================
// VISUAL EFFECT CONSTANTS
// ============================================================

export const VISUAL = {
  HEALTH_BAR: {
    THRESHOLD_HIGH: 0.5,
    THRESHOLD_MID: 0.25,
    MIN_WIDTH: 4,
    BORDER_RADIUS: 3
  },

  GLOW: {
    RADIUS: 50,
    ALPHA: 0.1,
    PULSE_FREQUENCY: 3,
    PULSE_BASE: 0.8,
    PULSE_AMPLITUDE: 0.2
  },

  KEY_PROMPT: {
    SHADOW_BLUR: 6
  },

  GRID: {
    ALPHA: 0.4
  }
};

// ============================================================
// HITBOX CONFIGURATIONS
// ============================================================

export const HITBOX_CONFIGS = {
  STATIC_OBJECTS: {
    TREE: { width: 38, height: 40, offsetY: 38, offsetX: 16 },
    ROCK: { width: 32, height: 27 },
    THICKET: { width: 30, height: 18, offsetY: 7, offsetX: 7 },
    CHEST: { width: 31, height: 31 },
    HOUSE_WALLS: { width: 1, height: 1, offsetX: 0.0, offsetY: 0.0 },
    WELL: { width: 63, height: 30, offsetY: 56 },
    FENCEX: { width: 28, height: 5, offsetX: 0, offsetY: 24 },
    FENCEY: { width: 4, height: 63, offsetX: 0, offsetY: 0 }
  },

  ANIMALS: {
    BULL: {
      widthRatio: 0.3,
      heightRatio: 0.3,
      offsetXRatio: 0.3,
      offsetYRatio: 0.5
    },
    TURKEY: {
      widthRatio: 0.4,
      heightRatio: 0.3,
      offsetXRatio: 0.3,
      offsetYRatio: 0.7
    },
    CHICK: {
      widthRatio: 0.4,
      heightRatio: 0.3,
      offsetXRatio: 0.3,
      offsetYRatio: 0.7
    },
    DEFAULT: {
      widthRatio: 0.4,
      heightRatio: 0.3,
      offsetXRatio: 0.3,
      offsetYRatio: 0.7
    }
  },

  PLAYER: {
    WIDTH_RATIO: 0.7,
    HEIGHT_RATIO: 0.3,
    OFFSET_X_RATIO: 0.15,
    OFFSET_Y_RATIO: 0.7
  },

  INTERACTION_ZONES: {
    PLAYER: {
      WIDTH_RATIO: 1.8,
      HEIGHT_RATIO: 1.8,
      OFFSET_X: -0.4,
      OFFSET_Y: -0.4
    }
  }
};

// ============================================================
// MOBILE/TOUCH CONTROLS
// ============================================================

export const MOBILE = {
  JOYSTICK_MAX_DISTANCE: 40,
  JOYSTICK_THRESHOLD: 10,
  SCREEN_WIDTH_THRESHOLD: 768
};

// ============================================================
// CAMERA CONSTANTS
// ============================================================

export const CAMERA = {
  CULLING_BUFFER: 200
};

// ============================================================
// UI CONSTANTS
// ============================================================

export const UI = {
  FONT_SIZES: {
    HEALTH_BAR_TEXT: 9,
    KEY_PROMPT: 14
  }
};
