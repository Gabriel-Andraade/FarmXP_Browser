/**
 * @file touch.js - The touch half of the input layer (#264).
 *
 * Whether this is a touch device, and walking the player to where they tapped.
 * Its movement reaches the game the same way every other source does, through
 * the action table in keyboard.js — the on-screen joystick writes straight into
 * it, so nothing downstream has to know a finger was involved.
 *
 * The on-screen joystick itself is still built by PlayerInteractionSystem in
 * control.js: it is created and torn down with that system's own DOM, and
 * splitting it off would have meant moving that lifecycle too. Left where it
 * is, deliberately, rather than half-moved.
 */
import { camera } from '../cameraSystem.js';
import { MOVEMENT, RANGES, MOBILE } from '../../constants.js';
import { deviceScale } from '../../qualityMode.js';
import { isSleeping } from './sleepState.js';
import { BuildSystem } from '../../buildSystem.js';

// Device detection
export const isMobile = () => {
    try {
        const hasTouch = navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0 || ('ontouchstart' in window);
        const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "");
        const coarsePointer = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const smallScreen = window.innerWidth <= MOBILE.SCREEN_WIDTH_THRESHOLD;
        return hasTouch && (uaMobile || coarsePointer || smallScreen);
    } catch (err) {
        return false;
    }
};

// Touch movement system for mobile devices
export class TouchMoveSystem {
    /**
     * @param {{ getSignal?: () => AbortSignal|undefined }} [deps]
     *   The abort signal is read through a getter rather than captured: the
     *   controller it belongs to lives in control.js and is replaced whenever
     *   the controls are torn down, so a copy taken here would go stale.
     */
    constructor({ getSignal } = {}) {
        this._getSignal = getSignal ?? (() => undefined);
        this.destination = null;
        this.isMovingToTouch = false;
        this.moveSpeed = MOVEMENT.TOUCH_MOVE_SPEED;
        this.stopDistance = RANGES.TOUCH_MOVE_STOP_DISTANCE;
        this.canvas = document.getElementById("gameCanvas");
        this.mobile = isMobile();

        if (this.mobile && this.canvas && !isSleeping()) {
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        if (!this.mobile || !this.canvas || isSleeping()) return;

        this.canvas.addEventListener("pointerdown", (ev) => {
            if (isSleeping()) { ev.preventDefault(); ev.stopPropagation(); return; }
            if (BuildSystem.active) return;
            ev.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            // Bug fix: dividir por DPR (ver comment no setupMouseInteraction).
            const dpr = deviceScale();
            const scaleX = this.canvas.width / rect.width / dpr;
            const scaleY = this.canvas.height / rect.height / dpr;

            const canvasX = (ev.clientX - rect.left) * scaleX;
            const canvasY = (ev.clientY - rect.top) * scaleY;

            const worldPos = camera.screenToWorld(canvasX, canvasY);
            this.setDestination(worldPos.x, worldPos.y);
        }, { signal: this._getSignal() });
    }

    setDestination(x, y) {
        if (isSleeping()) return;
        this.destination = { x, y };
        this.isMovingToTouch = true;
    }

    clearDestination() {
        this.destination = null;
        this.isMovingToTouch = false;
    }

    update(player, deltaTime) {
        if (isSleeping()) { this.clearDestination(); return; }
        if (!this.mobile || !this.isMovingToTouch || !this.destination || !player) return;

        const dx = this.destination.x - player.x;
        const dy = this.destination.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.stopDistance) {
            this.clearDestination();
            player.isMoving = false;
            return;
        }

        const directionX = dx / distance;
        const directionY = dy / distance;
        const moveAmount = this.moveSpeed * deltaTime;

        player.x += directionX * moveAmount;
        player.y += directionY * moveAmount;

        if (Math.abs(directionX) > Math.abs(directionY)) {
            player.direction = directionX > 0 ? 'right' : 'left';
        } else {
            player.direction = directionY > 0 ? 'down' : 'up';
        }

        player.isMoving = true;
    }

    isActive() { return this.isMovingToTouch && this.mobile && !isSleeping(); }
}
