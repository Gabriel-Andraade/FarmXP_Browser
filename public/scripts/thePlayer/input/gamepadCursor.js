import { getPointerScreenPos } from '../control.js';
import { collisionSystem } from '../../collisionSystem.js';
import { camera } from '../cameraSystem.js';
/**
 * @file gamepadCursor.js - Aiming reticle driven by the right stick (#264).
 *
 * A web page cannot move the system pointer — there is no API for it — so the
 * game draws its own. Everything else is plumbing to make the rest of the game
 * believe it is the mouse:
 *
 *   - the position is written into the same `lastMouseScreenX/Y` the canvas code
 *     already reads, so aiming at a tree/animal/object needs no new code
 *   - RT and A dispatch real `click` / `mousedown` events at that position, so
 *     canvas handlers and HTML buttons both respond
 *   - it hides the moment the mouse moves, and comes back on stick input, so
 *     the player never sees two pointers
 *
 * Drawn rather than an image on purpose: no asset to wait on, and it stays
 * sharp at any size, which matters because the size is player-adjustable.
 */

/** Pixels per second at speed 1.0, before acceleration. */
const BASE_SPEED = 900;
/** How much faster a fully pushed stick goes with acceleration on. */
const ACCEL_FACTOR = 2.2;

class GamepadCursor {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.visible = false;
        this.el = null;
        this._lastFrame = 0;
    }

    init() {
        if (this._initialised) return;
        this._initialised = true;

        const canvas = document.getElementById('gameCanvas');
        const rect = canvas?.getBoundingClientRect();
        this.x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        this.y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

        // Real pointer wins: two cursors on screen is worse than none.
        // `isTrusted` is the whole point: _publishPosition dispatches a
        // synthetic mousemove to feed the game, and without this check the
        // reticle hid itself on the very frame it moved.
        document.addEventListener('mousemove', (e) => {
            if (e.isTrusted) this.hide();
        }, true);
    }

    _ensureElement() {
        if (this.el) return this.el;
        const el = document.createElement('div');
        el.id = 'gamepad-cursor';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = `
            <svg viewBox="0 0 48 48" width="48" height="48">
              <circle cx="24" cy="24" r="13" class="gpc-ring"></circle>
              <circle cx="24" cy="24" r="2.5" class="gpc-dot"></circle>
              <path d="M24 4v7M24 37v7M4 24h7M37 24h7" class="gpc-ticks"></path>
            </svg>`;
        document.body.appendChild(el);
        this.el = el;
        return el;
    }

    /**
     * @param {Gamepad} pad
     * @param {Object} settings - from gamepadSettings
     * @param {boolean} panelOpen - menus navigate by D-pad, not by pointer
     */
    update(pad, settings, panelOpen) {
        // The reticle belongs to the world. In any panel the player navigates
        // with the D-pad or the stick and confirms with A — pointing there only
        // created ways to click the wrong thing, like a backdrop that closes.
        if (panelOpen) {
            this.hide();
            return;
        }

        const now = performance.now();
        const dt = this._lastFrame ? Math.min(0.05, (now - this._lastFrame) / 1000) : 0;
        this._lastFrame = now;

        const rawX = pad.axes?.[2] ?? 0;
        const rawY = pad.axes?.[3] ?? 0;
        const magnitude = Math.hypot(rawX, rawY);
        if (magnitude < settings.deadZone) {
            if (this.visible) this._draw();
            return;
        }

        // Rescale past the dead zone so motion starts from zero.
        const scaled = (magnitude - settings.deadZone) / (1 - settings.deadZone);
        // Acceleration: a gentle push creeps for precision, a full push crosses
        // the screen. Without it one of the two is always wrong.
        const curve = settings.acceleration ? scaled * (1 + (ACCEL_FACTOR - 1) * scaled) : scaled;
        const step = BASE_SPEED * curve * dt;
        const nx = (rawX / magnitude) * step * settings.aimSpeedX;
        const ny = (rawY / magnitude) * step * settings.aimSpeedY * (settings.invertY ? -1 : 1);

        this.x = Math.max(0, Math.min(window.innerWidth, this.x + nx));
        this.y = Math.max(0, Math.min(window.innerHeight, this.y + ny));

        this.show();
        this._draw();
        this._publishPosition();
    }

    _draw() {
        const el = this._ensureElement();
        const scale = this._scale ?? 1;
        el.style.transform = `translate(${this.x}px, ${this.y}px) translate(-50%, -50%) scale(${scale})`;
    }

    /**
     * Make the rest of the game see the reticle as the mouse.
     *
     * A plain `mousemove` on the element under the reticle, rather than writing
     * coordinates anywhere: the canvas already has a handler that converts
     * client coordinates to world ones — including a DPR correction that took a
     * bug to get right — and reusing it means aiming behaves exactly like the
     * mouse, in build mode too.
     */
    _publishPosition() {
        const target = document.elementFromPoint(this.x, this.y) ?? document.body;
        target.dispatchEvent(new MouseEvent('mousemove', {
            clientX: this.x, clientY: this.y,
            bubbles: true, cancelable: true, view: window,
        }));
    }

    /** RT: use the equipped tool — a left click where the reticle is. */
    primaryAction() {
        this._clickAt(0);
    }

    /** LT in build mode: right click at the reticle, which picks a piece back up. */
    secondaryAction() {
        const target = document.elementFromPoint(this.x, this.y);
        if (!target) return;
        const init = {
            clientX: this.x, clientY: this.y, button: 2,
            bubbles: true, cancelable: true, view: window,
        };
        target.dispatchEvent(new MouseEvent('mousedown', init));
        target.dispatchEvent(new MouseEvent('mouseup', init));
        // `contextmenu` is the event the build system listens for.
        target.dispatchEvent(new MouseEvent('contextmenu', init));
    }

/**
     * Is the reticle actually over something the player could act on?
     *
     * The reticle stays on screen after the stick stops, so "visible" is not the
     * same as "aiming at something". Treating the two as equal meant A was
     * swallowed by empty ground forever after the first nudge of the right
     * stick — standing at the door, it stopped opening.
     *
     * Asked of the game's own hit test, at the position its own hover handler
     * worked out, so this agrees with the mouse by construction. Out of reach
     * counts as nothing: there is nothing the player could do with it from here,
     * and falling through to what they are standing next to is more use.
     */
    _aimedAtSomething() {
        const at = getPointerScreenPos();
        if (!at) return false;
        return collisionSystem.getObjectAtMouse(at.x, at.y, camera, { requirePlayerInRange: true }) != null;
    }

    /** A: interact with whatever is under the reticle; callers fall back to proximity. */
    confirmAction() {
        const target = this.visible ? document.elementFromPoint(this.x, this.y) : null;
        // An HTML control takes the click; the canvas gets a click event the
        // game's own handlers already understand.
        if (target && target !== document.body && typeof target.click === 'function'
            && target.tagName !== 'CANVAS') {
            target.click();
            return true;
        }
        if (this.visible && this._aimedAtSomething()) { this._clickAt(0); return true; }
        return false;   // nothing aimed at — the caller uses proximity instead
    }

    _clickAt(button) {
        const target = document.elementFromPoint(this.x, this.y);
        if (!target) return;
        const init = {
            clientX: this.x, clientY: this.y, button,
            bubbles: true, cancelable: true, view: window,
        };
        target.dispatchEvent(new MouseEvent('mousedown', init));
        target.dispatchEvent(new MouseEvent('mouseup', init));
        target.dispatchEvent(new MouseEvent('click', init));
    }

    setScale(scale) {
        this._scale = scale;
        if (this.visible) this._draw();
    }

    show() {
        if (this.visible) return;
        this.visible = true;
        this._ensureElement().classList.add('visible');
    }

    hide() {
        if (!this.visible) return;
        this.visible = false;
        this.el?.classList.remove('visible');
    }
}

export const gamepadCursor = new GamepadCursor();
export default gamepadCursor;
