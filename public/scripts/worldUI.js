/**
 * @file worldUI.js - World User Interface Manager
 * @description Manages in-world UI elements rendered on the game canvas.
 * Handles health bars, interaction prompts, consumption progress bars,
 * and visual feedback for player interactions with world objects.
 *
 * @module WorldUI
 * @author FarmXP Team
 *
 * @example
 * // Render world UI elements each frame
 * import { worldUI } from './worldUI.js';
 * worldUI.render(ctx, interactiveObjects, player);
 */

import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { assets } from "./assetManager.js";
import { SIZES, RANGES, VISUAL, UI } from './constants.js';

/**
 * Manages in-world user interface elements
 * Renders health bars, interaction prompts, and consumption progress
 * @class WorldUIManager
 */
class WorldUIManager {
    /**
     * Creates a WorldUIManager instance
     * Initializes style configurations, cache, and consumption state
     */
    constructor() {
        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        /**
         * Style configurations for UI elements
         * @type {Object}
         */
        this.styles = {
            hpBar: {
                width: 50,
                height: 6,
                offsetY: 12,
                bgColor: "#2e1c0f",
                borderColor: "#8b5a2b",
                highColor: "#4ecca3",
                midColor: "#FF9800",
                lowColor: "#F44336",
                gradientHigh: ["#4ecca3", "#3da58a"],
                gradientMid: ["#ff9a3c", "#ff6b6b"],
                gradientLow: ["#ff6b6b", "#c0392b"]
            },
            keyPrompt: {
                size: 32,
                offsetY: 45,
                bgGradient: ["#c9a463", "#e0bc87"],
                borderColor: "#8b5a2b",
                textColor: "#2e1c0f",
                shadowColor: "rgba(0, 0, 0, 0.3)",
                borderWidth: 2
            }
        };

        // cache de elementos reutilizáveis
        this.cache = {
            keyPromptCanvas: null
        };

        // controle de consumo com barra de progresso
        this.consumption = {
            isActive: false,
            progress: 0,
            item: null,
            player: null,
            startTime: 0,
            duration: 0
        };

        this.setupConsumptionListeners();
    }

    /**
     * Renders all world UI elements for the current frame
     * Processes interactive objects and draws health bars, prompts, and effects
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Map} interactiveObjects - Map of interactive world objects
     * @param {Object} player - Player object with position and dimensions
     * @returns {void}
     */
    render(ctx, interactiveObjects, player) {
        if (!interactiveObjects || !player) return;

        this.updateConsumptionBar();
        ctx.save();

        for (const obj of interactiveObjects.values()) {
            if (obj.destroyed) continue;
            if (!camera.isInViewport(obj.x, obj.y, obj.width, obj.height)) continue;

            if (obj.health < obj.maxHealth && obj.health > 0) {
                this.drawHealthBar(ctx, obj);
            }

            const typeLower = (obj.type || "").toLowerCase();
            const originalTypeLower = (obj.originalType || "").toLowerCase();
            const nameLower = (obj.name || "").toLowerCase();

            const isFence =
                typeLower.includes("fence") ||
                originalTypeLower.includes("fence") ||
                nameLower.includes("cerca") ||
                nameLower.includes("fence");

            const isWall =
                typeLower.includes("wall") ||
                originalTypeLower.includes("wall");

            const isExplicitlyNonInteractable = obj.interactable === false;

            if (!isFence && !isWall && !isExplicitlyNonInteractable) {
                this.checkAndDrawInteractionPrompt(ctx, obj, player);
            }
        }

        ctx.restore();
        this.drawConsumptionBar(ctx);
    }

    /**
     * Draws a health bar above an object
     * Uses gradient colors based on health percentage (green > yellow > red)
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} obj - World object with health properties
     * @param {number} obj.x - Object X position
     * @param {number} obj.y - Object Y position
     * @param {number} obj.width - Object width
     * @param {number} obj.height - Object height
     * @param {number} obj.health - Current health value
     * @param {number} obj.maxHealth - Maximum health value
     * @returns {void}
     */
    // fix: canvas context reset — isolate health bar state
    drawHealthBar(ctx, obj) {
        ctx.save();
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y
        );

        const width = SIZES.HEALTH_BAR.WIDTH * zoom;
        const height = SIZES.HEALTH_BAR.HEIGHT * zoom;

        const x = Math.floor(screenPos.x - width / 2);
        const y = Math.floor(screenPos.y - SIZES.HEALTH_BAR.OFFSET_Y * zoom);

        const percent = Math.max(0, obj.health / obj.maxHealth);

        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        this.drawRoundedRect(ctx, x, y, width, height, 3, this.styles.hpBar.bgColor);

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        let gradient;
        if (percent > VISUAL.HEALTH_BAR.THRESHOLD_HIGH) {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientHigh[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientHigh[1]);
        } else if (percent > VISUAL.HEALTH_BAR.THRESHOLD_MID) {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientMid[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientMid[1]);
        } else {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientLow[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientLow[1]);
        }

        const minFillWidth = Number.isFinite(VISUAL.HEALTH_BAR.MIN_WIDTH) ? VISUAL.HEALTH_BAR.MIN_WIDTH : 0;
        const fillWidth = Math.max(minFillWidth, width * percent);

        this.drawRoundedRect(ctx, x, y, fillWidth, height, 3, gradient);

        ctx.strokeStyle = this.styles.hpBar.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);

        if (zoom > 0.8 && width > 60) {
            const healthFontSize = Number.isFinite(UI.FONT_SIZES.HEALTH_BAR_TEXT) ? UI.FONT_SIZES.HEALTH_BAR_TEXT : 10;
            ctx.font = `bold ${healthFontSize * zoom}px Arial`;
            ctx.fillStyle = "#f5e9d3";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
                `${Math.floor(obj.health)}/${Math.floor(obj.maxHealth)}`,
                x + width / 2,
                y + height / 2
            );
        }
        ctx.restore();
    }

    /**
     * Checks distance between player and object, draws interaction prompt if in range
     * Draws "E" key prompt when within 70 units, adds glow effect when closer
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} obj - World object to check interaction with
     * @param {Object} player - Player object with position
     * @returns {void}
     */
    checkAndDrawInteractionPrompt(ctx, obj, player) {
        const centerObjX = obj.x + obj.width / 2;
        const centerObjY = obj.y + obj.height / 2;
        const centerPlayerX = player.x + player.width / 2;
        const centerPlayerY = player.y + player.height / 2;

        const dist = Math.hypot(
            centerObjX - centerPlayerX,
            centerObjY - centerPlayerY
        );

        if (dist <= RANGES.INTERACTION_RANGE) {
            this.drawKeyPrompt(ctx, obj, "E");

            if (dist <= RANGES.INTERACTION_RANGE * RANGES.INTERACTION_RANGE_CLOSE_MULTIPLIER) {
                this.drawInteractionGlow(ctx, obj);
            }
        }
    }

    /**
     * Draws a key prompt (e.g., "E") above an object
     * Styled as a rounded square with gradient background
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} obj - World object to draw prompt above
     * @param {string} key - Key character to display (e.g., "E")
     * @returns {void}
     */
    // fix: canvas context reset — isolate key prompt state
    drawKeyPrompt(ctx, obj, key) {
        ctx.save();
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y
        );

        const hasHealthBar = obj.health < obj.maxHealth && obj.health > 0;
        const offsetY = hasHealthBar
            ? (SIZES.HEALTH_BAR.OFFSET_Y + SIZES.HEALTH_BAR.HEIGHT + 15) * zoom
            : SIZES.KEY_PROMPT.OFFSET_Y_NO_HEALTH * zoom;

        const x = screenPos.x;
        const y = screenPos.y - offsetY;
        const size = SIZES.KEY_PROMPT.SIZE * zoom;

        ctx.shadowColor = this.styles.keyPrompt.shadowColor;
        ctx.shadowBlur = Number.isFinite(VISUAL.KEY_PROMPT.SHADOW_BLUR) ? VISUAL.KEY_PROMPT.SHADOW_BLUR : 0;
        ctx.shadowOffsetY = 2;

        const gradient = ctx.createRadialGradient(
            x, y, size * 0.3,
            x, y, size * 0.8
        );
        gradient.addColorStop(0, this.styles.keyPrompt.bgGradient[0]);
        gradient.addColorStop(1, this.styles.keyPrompt.bgGradient[1]);

        this.drawRoundedRect(
            ctx,
            x - size / 2,
            y - size / 2,
            size,
            size,
            8,
            gradient
        );

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = this.styles.keyPrompt.borderColor;
        ctx.lineWidth = this.styles.keyPrompt.borderWidth;
        ctx.stroke();

        ctx.fillStyle = this.styles.keyPrompt.textColor;
        ctx.font = `bold ${UI.FONT_SIZES.KEY_PROMPT * zoom}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(key, x, y + 1);
        ctx.restore();
    }

    /**
     * Draws a pulsing glow effect around an object when player is very close
     * Creates radial gradient that pulses using sine wave animation
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {Object} obj - World object to draw glow around
     * @returns {void}
     */
    drawInteractionGlow(ctx, obj) {
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2
        );

        const time = Date.now() / 1000;
        const pulse = Math.sin(time * VISUAL.GLOW.PULSE_FREQUENCY) * VISUAL.GLOW.PULSE_AMPLITUDE + VISUAL.GLOW.PULSE_BASE;

        ctx.save();
        ctx.globalAlpha = VISUAL.GLOW.ALPHA * pulse;

        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, VISUAL.GLOW.RADIUS * zoom
        );
        gradient.addColorStop(0, "#c9a463");
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, VISUAL.GLOW.RADIUS * zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Sets up event listeners for item consumption events
     * Listens to startConsumption and consumptionCancelled events
     *
     * @returns {void}
     * @listens startConsumption - When player starts consuming an item
     * @listens consumptionCancelled - When consumption is interrupted
     */
    setupConsumptionListeners() {
        const { signal } = this.abortController;

        document.addEventListener("startConsumption", (e) => {
            const { item, player, duration } = e.detail;
            this.consumption = {
                isActive: true,
                progress: 0,
                item,
                player,
                startTime: Date.now(),
                duration
            };
        }, { signal });

        document.addEventListener("consumptionCancelled", () => {
            this.consumption.isActive = false;
        }, { signal });
    }

    /**
     * Updates the consumption progress based on elapsed time
     * Dispatches consumptionCompleted event when progress reaches 100%
     *
     * @returns {void}
     * @fires consumptionCompleted - When consumption finishes successfully
     */
    updateConsumptionBar() {
        if (!this.consumption.isActive) return;

        const elapsed = Date.now() - this.consumption.startTime;
        this.consumption.progress = Math.min(
            1,
            elapsed / this.consumption.duration
        );

        if (this.consumption.progress >= 1) {
            document.dispatchEvent(
                new CustomEvent("consumptionCompleted", {
                    detail: {
                        item: this.consumption.item,
                        fillUp: this.consumption.item.fillUp
                    }
                })
            );
            this.consumption.isActive = false;
        }
    }

    /**
     * Draws the consumption progress bar above the player
     * Shows progress while player is eating/drinking items
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @returns {void}
     */
    drawConsumptionBar(ctx) {
        if (!this.consumption.isActive || !this.consumption.player) return;

        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            this.consumption.player.x + this.consumption.player.width / 2,
            this.consumption.player.y - SIZES.CONSUMPTION_BAR.PLAYER_OFFSET_Y
        );

        const width = SIZES.CONSUMPTION_BAR.WIDTH * zoom;
        const height = SIZES.CONSUMPTION_BAR.HEIGHT * zoom;
        const x = screenPos.x - width / 2;
        const y = screenPos.y;

        ctx.fillStyle = "#2e1c0f";
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = "#4ecca3";
        ctx.fillRect(x, y, width * this.consumption.progress, height);
    }

    /**
     * Utility function to draw a rounded rectangle
     * Automatically adjusts radius if larger than dimensions allow
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @param {number} x - X position of rectangle
     * @param {number} y - Y position of rectangle
     * @param {number} width - Width of rectangle
     * @param {number} height - Height of rectangle
     * @param {number} radius - Corner radius
     * @param {string|CanvasGradient} [fillStyle] - Optional fill color or gradient
     * @returns {void}
     */
    drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
    }

    /**
     * Limpa todos os event listeners e recursos do sistema
     * Remove todos os listeners registrados via AbortController
     * @returns {void}
     */
    destroy() {
        // Remove todos os event listeners
        this.abortController.abort();

        // Reset consumption state e limpar referências para permitir GC
        this.consumption.isActive = false;
        this.consumption.item = null;
        this.consumption.player = null;
    }
}

/**
 * Singleton instance of the WorldUIManager
 * @type {WorldUIManager}
 * @exports worldUI
 */
export const worldUI = new WorldUIManager();
