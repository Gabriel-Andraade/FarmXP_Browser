/**
 * @file fluidContainer.js - Shared 0..capacity fluid volume.
 * @description The bucket and the watering can are the same tank: a level
 * from 0 to `capacity`, filled at the well and spent while used. This factory
 * owns that shared state + operations so the two systems don't duplicate them.
 * The watering can layers its tool-specific bits (equip check, cursor) on top.
 * @module fluidContainer
 */

/**
 * @param {number} [capacity=100] - full level (percent volume).
 * @returns {object} a fresh container with level state + fill/drain/save ops.
 */
export function createFluidContainer(capacity = 100) {
    return {
        _level: 0,
        capacity,

        /** Current fill, 0..capacity. */
        getLevel() { return this._level; },
        hasWater() { return this._level > 0; },

        /** Fill to capacity (legacy full-fill, e.g. the well's default button). */
        fill() { this._level = this.capacity; },

        /**
         * Fill up toward a target percent (for the well's choose-amount slider).
         * Never lowers the level. @returns {number} percent actually added.
         */
        fillTo(targetPercent) {
            const target = Math.max(0, Math.min(this.capacity, Number(targetPercent) || 0));
            if (target <= this._level) return 0;
            const added = target - this._level;
            this._level = target;
            return added;
        },

        /** Drain up to `amount`. @returns {number} amount actually drained. */
        drain(amount) {
            const take = Math.max(0, Math.min(this._level, Number(amount) || 0));
            this._level -= take;
            return take;
        },

        /** Save: current level (0..capacity). */
        serialize() { return this._level; },

        /**
         * Load: restore level, clamped to 0..capacity. Pre-volume saves stored a
         * small charge count; those load as a near-empty tank — harmless, the
         * player just refills. Not worth a migration given the tiny window.
         */
        restore(value) {
            this._level = (typeof value === 'number' && value > 0)
                ? Math.min(Math.round(value), this.capacity)
                : 0;
        },
    };
}
