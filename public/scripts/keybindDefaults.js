/**
 * @file keybindDefaults.js - Shared keybind constants
 * @description Single source of truth for keybind storage key and default bindings.
 * Imported by both settingsUI.js and thePlayer/control.js to avoid drift.
 */

export const CONTROLS_STORAGE_KEY = 'farmxp_controls';

export const DEFAULT_KEYBINDS = {
  moveUp: ['KeyW', 'ArrowUp'],
  moveDown: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  interact: ['KeyE'],
  jump: ['Space'],

  inventory: ['KeyI'],
  merchants: ['KeyU'],
  config: ['KeyO'],
};
