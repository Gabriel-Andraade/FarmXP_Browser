/**
 * @file frames.js - Character sprite loader
 * @description Shared singleton that holds all loaded sprite images for the
 * active character. Resets and reloads when switching characters via loadImages().
 * Sprite naming convention: {prefix}_moving(R{i}).png, {prefix}_stand.png,
 * {prefix}_stand_Up.png, {prefix}_stand_Down.png
 * @module Frames
 */

/**
 * Shared frame store for the currently loaded character.
 * @type {{moving: HTMLImageElement[], idle: HTMLImageElement|null, idleUp: HTMLImageElement|null, idleDown: HTMLImageElement|null}}
 */
export const frames = {
    moving: [],
    idle: null,
    idleUp: null,
    idleDown: null
};

/** @constant {Object} Default config used when no config is provided (Stella) */
const DEFAULT_CONFIG = { folder: 'stella', prefix: 'Stella', movingFrames: 8 };

/**
 * Loads all sprite images for a character based on its config.
 * Resets the shared frames object before loading. Returns a promise
 * that resolves when every image is loaded.
 *
 * @param {Object} [config=DEFAULT_CONFIG] - Character config from CHARACTER_CONFIG
 * @param {string} config.folder - Asset subfolder name (e.g. 'ben')
 * @param {string} config.prefix - Sprite filename prefix (e.g. 'Ben')
 * @param {number} config.movingFrames - Number of moving frames to load (R0..Rn)
 * @param {string} [config.standFile] - Custom stand filename override (e.g. 'ben_stand.png')
 * @returns {Promise<void[]>} Resolves when all images are loaded
 */
export function loadImages(config = DEFAULT_CONFIG) {
    const { folder, prefix, movingFrames } = config;
    const promises = [];

    // Reset frames for new character
    frames.moving = [];
    frames.idle = null;
    frames.idleUp = null;
    frames.idleDown = null;

    for (let i = 0; i < movingFrames; i++) {
        const img = new Image();
        img.src = `assets/character/${folder}/${prefix}_moving(R${i}).png`;
        promises.push(new Promise((resolve, reject) => {
            img.onload = () => { frames.moving[i] = img; resolve(); };
            img.onerror = () => reject(`Error loading moving frame R${i} for ${prefix}`);
        }));
    }

    const idleImg = new Image();
    const standFile = config.standFile || `${prefix}_stand.png`;
    idleImg.src = `assets/character/${folder}/${standFile}`;
    promises.push(new Promise((resolve, reject) => {
        idleImg.onload = () => { frames.idle = idleImg; resolve(); };
        idleImg.onerror = () => reject(`Error loading idle frame for ${prefix}`);
    }));

    const idleUpImg = new Image();
    idleUpImg.src = `assets/character/${folder}/${prefix}_stand_Up.png`;
    promises.push(new Promise((resolve, reject) => {
        idleUpImg.onload = () => { frames.idleUp = idleUpImg; resolve(); };
        idleUpImg.onerror = () => reject(`Error loading idle Up frame for ${prefix}`);
    }));

    const idleDownImg = new Image();
    idleDownImg.src = `assets/character/${folder}/${prefix}_stand_Down.png`;
    promises.push(new Promise((resolve, reject) => {
        idleDownImg.onload = () => { frames.idleDown = idleDownImg; resolve(); };
        idleDownImg.onerror = () => reject(`Error loading idle Down frame for ${prefix}`);
    }));

    return Promise.all(promises);
}
