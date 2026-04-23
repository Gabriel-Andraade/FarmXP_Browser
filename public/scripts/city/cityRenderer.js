/**
 * @file cityRenderer.js - Re-export shim.
 * @description The authoritative city renderer lives at public/scripts/cityRenderer.js.
 * This file used to hold a near-duplicate (~85% identical) implementation and was
 * not imported by anything, so it was collapsed into a pass-through re-export to
 * prevent divergence. Safe to delete if no build tool references this path.
 * @module CityRenderer
 */

export {
    loadCityAssets,
    ensureCityRendererReady,
    areCityAssetsLoaded,
    drawCityBackground,
    getCityObjects,
    invalidateCityCache,
} from '../cityRenderer.js';
