import { camera } from "./cameraSystem.js";
import { collisionSystem } from "../collisionSystem.js";
import { BuildSystem } from "../buildSystem.js";
import { animals } from "../theWorld.js";
import { MOVEMENT, RANGES, MOBILE, HITBOX_CONFIGS } from '../constants.js';
import { CONTROLS_STORAGE_KEY, DEFAULT_KEYBINDS } from '../keybindDefaults.js';
import { getSystem, getDebugFlag } from '../gameState.js';

// AbortController global para cleanup de todos os listeners do módulo
let controlsAbortController = new AbortController();

// Key configuration
export const keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    KeyA: false, KeyW: false, KeyS: false, KeyD: false,
    KeyE: false, Space: false
};

// ─────────────────────────────────────────────
// Remap (Config) -> farmxp_controls
// ─────────────────────────────────────────────
// tenta ler binds também do config/settings geral (se teu configUI usar outra key)
const CONFIG_STORAGE_KEYS = ["farmxp_config", "farmxp_settings", "farmxp_options"];

// caminho do configUI.js (control/control.js -> ../configUI.js)
const CONFIG_UI_MODULE_PATH = "../settingsUI.js";

function extractKeybindsFromConfig(candidate) {
    if (!candidate || typeof candidate !== "object") return null;

    // formatos mais comuns:
    if (candidate.keybinds && typeof candidate.keybinds === "object") return candidate.keybinds;
    if (candidate.controls && typeof candidate.controls === "object") return candidate.controls;

    // às vezes vem dentro de settings / config
    if (candidate.settings && typeof candidate.settings === "object") {
        if (candidate.settings.keybinds && typeof candidate.settings.keybinds === "object") return candidate.settings.keybinds;
        if (candidate.settings.controls && typeof candidate.settings.controls === "object") return candidate.settings.controls;
    }

    if (candidate.config && typeof candidate.config === "object") {
        if (candidate.config.keybinds && typeof candidate.config.keybinds === "object") return candidate.config.keybinds;
        if (candidate.config.controls && typeof candidate.config.controls === "object") return candidate.config.controls;
    }

    return null;
}

function tryReadKeybindsFromOtherStorage() {
    for (const k of CONFIG_STORAGE_KEYS) {
        try {
            const raw = localStorage.getItem(k);
            if (!raw) continue;
            const parsed = JSON.parse(raw);
            const extracted = extractKeybindsFromConfig(parsed);
            if (extracted) return extracted;
        } catch {}
    }
    return null;
}

// API pública (útil pro configUI chamar também, se quiser)
export function getKeybinds() {
    try { return JSON.parse(JSON.stringify(keybinds)); } catch { return sanitizeKeybinds(keybinds); }
}

export function setKeybinds(next, { persist = true, clearState = false } = {}) {
    keybinds = sanitizeKeybinds(next);
    if (persist) saveKeybinds(keybinds);
    if (clearState) clearAllInputState();
    recalcActions();
}

// tenta puxar do configUI.js (sem depender de nomes fixos de export)
async function bootstrapKeybindsFromConfigUI() {
    // 1) window (se configUI expõe algo global)
    try {
        const w = window;
        const fromWindow =
            extractKeybindsFromConfig(w?.FarmXPConfig) ||
            extractKeybindsFromConfig(w?.gameConfig) ||
            extractKeybindsFromConfig(w?.config) ||
            extractKeybindsFromConfig(w?.settings);

        if (fromWindow) {
            setKeybinds(fromWindow, { persist: true });
            return;
        }
    } catch {}

    // 2) módulo configUI (caminho: ../configUI.js)
    try {
        const mod = await import(CONFIG_UI_MODULE_PATH);

        // tenta achar binds em exports comuns (sem exigir que exista)
        const fromExports =
            (typeof mod.getKeybinds === "function" ? mod.getKeybinds() : null) ||
            (typeof mod.getControlsKeybinds === "function" ? mod.getControlsKeybinds() : null) ||
            (typeof mod.getConfig === "function" ? mod.getConfig() : null) ||
            mod.keybinds ||
            mod.controls ||
            mod.config ||
            mod.settings ||
            mod.default;

        const extracted = extractKeybindsFromConfig(fromExports) || (fromExports && typeof fromExports === "object" ? fromExports : null);
        if (extracted) {
            setKeybinds(extracted, { persist: true });
            return;
        }
    } catch {
        // ignore: não quebra o jogo se configUI não estiver pronto ainda
    }

    // 3) fallback: tenta ler de uma storage “geral” (se existir)
    const fromOtherStorage = tryReadKeybindsFromOtherStorage();
    if (fromOtherStorage) setKeybinds(fromOtherStorage, { persist: true });
}

// deixa acessível pra debug/ponte rápida (sem poluir muito)
window.FarmXPControls = window.FarmXPControls || {};
window.FarmXPControls.getKeybinds = getKeybinds;
window.FarmXPControls.setKeybinds = setKeybinds;


let keybinds = loadKeybinds();

// pressed state por CODE (KeyW, ArrowLeft, Space, etc)
const pressed = Object.create(null);

// estado final por ação (já considerando joystick também)
const actions = {
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    interact: false,
    inventory: false,
    merchants: false,
    config: false,
};

// estado de movimento vindo do joystick (pra não quebrar mobile)
const joystickActions = { moveUp: false, moveDown: false, moveLeft: false, moveRight: false };

function sanitizeKeybinds(raw) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    if (!raw || typeof raw !== "object") return merged;

    for (const action of Object.keys(merged)) {
        if (Array.isArray(raw[action]) && raw[action].length) {
            merged[action] = raw[action]
                .slice(0, 2)
                .map(String)
                .filter(Boolean);
        }
    }
    return merged;
}

function loadKeybinds() {
    // prioridade 1: storage dedicada dos controles
    try {
        const raw = localStorage.getItem(CONTROLS_STORAGE_KEY);
        if (raw) return sanitizeKeybinds(JSON.parse(raw));
    } catch {}

    // prioridade 2: algum storage “geral” 
    const fromOther = tryReadKeybindsFromOtherStorage();
    if (fromOther) return sanitizeKeybinds(fromOther);

    // fallback
    return sanitizeKeybinds(null);
}


function saveKeybinds(next) {
    try {
        localStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
}

function getEventCode(e) {
    return e.code || e.key; // prefer e.code
}

function isActionKeyEvent(e, action) {
    const code = getEventCode(e);
    return (keybinds[action] || []).includes(code);
}

function recalcActions() {
    for (const action of Object.keys(actions)) {
        const binds = keybinds[action] || [];
        let down = false;
        for (const code of binds) {
            if (pressed[code]) { down = true; break; }
        }

        // OR com joystick apenas para movimento
        if (action in joystickActions) {
            down = down || joystickActions[action];
        }

        actions[action] = down;
    }
}

function clearAllInputState() {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(pressed)) pressed[k] = false;
    for (const k of Object.keys(actions)) actions[k] = false;
    joystickActions.moveUp = joystickActions.moveDown = joystickActions.moveLeft = joystickActions.moveRight = false;
}

function setPressedFromEvent(e, isDown) {
    const code = getEventCode(e);
    if (!code) return;

    pressed[code] = isDown;

    // compat: manter teu objeto keys atualizado pros codes que ele já conhece
    if (code in keys) keys[code] = isDown;
    if (e.key in keys) keys[e.key] = isDown;

    recalcActions();
}

// Sleep state that blocks all inputs
let isSleeping = false;
let isSleepingGlobal = false;

document.addEventListener("sleepStarted", () => {
    isSleeping = true;
    isSleepingGlobal = true;

    Object.keys(keys).forEach(key => { keys[key] = false; });
    clearAllInputState();

    const mobileBtn = document.getElementById('mobile-interact-btn');
    const joystickArea = document.getElementById('joystick-area');
    if (mobileBtn) mobileBtn.style.display = 'none';
    if (joystickArea) joystickArea.style.display = 'none';
}, { signal: controlsAbortController.signal });

document.addEventListener("sleepEnded", () => {
    isSleeping = false;
    isSleepingGlobal = false;

    if (isMobile()) {
        const joystickArea = document.getElementById('joystick-area');
        if (joystickArea) joystickArea.style.display = 'block';
    }
}, { signal: controlsAbortController.signal });

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
    constructor() {
        this.destination = null;
        this.isMovingToTouch = false;
        this.moveSpeed = MOVEMENT.TOUCH_MOVE_SPEED;
        this.stopDistance = RANGES.TOUCH_MOVE_STOP_DISTANCE;
        this.canvas = document.getElementById("gameCanvas");
        this.mobile = isMobile();

        if (this.mobile && this.canvas && !isSleeping) {
            this.setupTouchControls();
        }
    }

    setupTouchControls() {
        if (!this.mobile || !this.canvas || isSleeping) return;

        this.canvas.style.touchAction = "none";

        this.canvas.addEventListener("pointerdown", (ev) => {
            if (isSleeping) { ev.preventDefault(); ev.stopPropagation(); return; }
            if (BuildSystem.active) return;
            ev.preventDefault();

            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;

            const canvasX = (ev.clientX - rect.left) * scaleX;
            const canvasY = (ev.clientY - rect.top) * scaleY;

            const worldPos = camera.screenToWorld(canvasX, canvasY);
            this.setDestination(worldPos.x, worldPos.y);
        }, { signal: controlsAbortController.signal });
    }

    setDestination(x, y) {
        if (isSleeping) return;
        this.destination = { x, y };
        this.isMovingToTouch = true;
    }

    clearDestination() {
        this.destination = null;
        this.isMovingToTouch = false;
    }

    update(player, deltaTime) {
        if (isSleeping) { this.clearDestination(); return; }
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

    isActive() { return this.isMovingToTouch && this.mobile && !isSleeping; }
}

// Player interaction system
export class PlayerInteractionSystem {
    constructor() {
        this.interactionRange = null;
        this.nearbyObjects = new Set();
        this.mobile = isMobile();
        this.touchMoveSystem = new TouchMoveSystem();
        this.lastMouseScreenX = null;
        this.lastMouseScreenY = null;

        this.setupInteractionListeners();

        if (this.mobile && !isSleeping) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupMobileControls());
            } else {
                this.setupMobileControls();
            }
        }
    }

    updateInteractionRange(playerX, playerY, playerWidth, playerHeight) {
        if (isSleeping) {
            this.nearbyObjects.clear();
            return;
        }

        const cfg = PLAYER_INTERACTION_CONFIG;
        this.interactionRange = {
            x: playerX + (playerWidth * cfg.offsetX),
            y: playerY + (playerHeight * cfg.offsetY),
            width: playerWidth * cfg.widthRatio,
            height: playerWidth * cfg.heightRatio,
            type: 'PLAYER_INTERACTION_ZONE'
        };

        collisionSystem.updatePlayerInteractionRange(this.interactionRange);
        this.checkNearbyObjects();
    }

    checkNearbyObjects() {
        if (isSleeping || !this.interactionRange) return;

        this.nearbyObjects.clear();
        const nearby = collisionSystem.getObjectsInInteractionRange(this.interactionRange);

        nearby.forEach(objectId => this.nearbyObjects.add(objectId));

        if (this.mobile) this.updateMobileInteractionUI();
    }

    updateMobileInteractionUI() {
        if (isSleeping) {
            const eButton = document.getElementById('mobile-interact-btn');
            if (eButton) eButton.style.display = 'none';
            return;
        }

        const hasObjects = this.nearbyObjects.size > 0;
        const eButton = document.getElementById('mobile-interact-btn');
        if (eButton) eButton.style.display = hasObjects ? 'block' : 'none';
    }

    setupInteractionListeners() {
        const self = this;
        const { signal } = controlsAbortController;

        document.addEventListener('keydown', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

            if (isActionKeyEvent(e, "interact") && !e.repeat) {
                this.handleInteraction();
            }

            if ((e.key === 'k' || e.key === 'K')) {
                const animalUI = getSystem('animalUI');
                if (self.lastMouseScreenX !== null && self.lastMouseScreenY !== null) {
                    const obj = collisionSystem.getObjectAtMouse(
                        self.lastMouseScreenX,
                        self.lastMouseScreenY,
                        camera,
                        { requirePlayerInRange: true }
                    );

                    if (obj && obj.originalType === 'animal') {
                        if (animalUI?.selectAnimal) {
                            animalUI.selectAnimal(obj.object);
                        } else if (animalUI?.showStats) {
                            animalUI.showStats(obj.object);
                        }
                    } else {
                        animalUI?.inspectAnimal?.();
                    }
                } else {
                    animalUI?.inspectAnimal?.();
                }
            }
        }, { signal });

        if (!this.mobile) {
            this.setupMouseInteraction();
        }
    }

    setupMouseInteraction() {
        const canvas = document.getElementById("gameCanvas");
        if (!canvas) return;

        canvas.addEventListener("click", (ev) => {
            if (isSleeping) { ev.preventDefault(); ev.stopPropagation(); return; }

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const canvasX = (ev.clientX - rect.left) * scaleX;
            const canvasY = (ev.clientY - rect.top) * scaleY;
            const worldPos = camera.screenToWorld(canvasX, canvasY);

            if (BuildSystem.active) {
                BuildSystem.placeObject();
                return;
            }

            this.handleCanvasClick(worldPos.x, worldPos.y, canvasX, canvasY);
        }, { signal: controlsAbortController.signal });

        canvas.addEventListener("mousemove", (ev) => {
            if (isSleeping) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const canvasX = (ev.clientX - rect.left) * scaleX;
            const canvasY = (ev.clientY - rect.top) * scaleY;
            const worldPos = camera.screenToWorld(canvasX, canvasY);

            this.lastMouseScreenX = canvasX;
            this.lastMouseScreenY = canvasY;

            if (BuildSystem.active) {
                BuildSystem.updateMousePosition(worldPos.x, worldPos.y);
            }
        }, { signal: controlsAbortController.signal });
    }

    setupMobileControls() {
        if (isSleeping) return;

        const button = document.createElement('button');
        button.id = 'mobile-interact-btn';
        button.textContent = 'E'; // fix: innerHTML → textContent
        button.addEventListener('touchstart', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            button.style.transform = 'scale(0.95)';
            this.handleInteraction();
        }, { signal: controlsAbortController.signal });

        button.addEventListener('touchend', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            button.style.transform = 'scale(1)';
        }, { signal: controlsAbortController.signal });

        document.body.appendChild(button);

        this.setupVirtualJoystick();
    }

    setupVirtualJoystick() {
        if (isSleeping) return;

        const joystickArea = document.createElement('div');
        joystickArea.id = 'joystick-area';
        const joystick = document.createElement('div');
        joystick.id = 'joystick';
        joystickArea.appendChild(joystick);
        document.body.appendChild(joystickArea);

        if (this.mobile && !isSleeping) {
            this.activateVirtualJoystick(joystickArea, joystick);
        }
    }

    activateVirtualJoystick(area, joystick) {
        let isTouching = false;
        let startX = 0, startY = 0;
        const maxDistance = MOBILE.JOYSTICK_MAX_DISTANCE;

        area.addEventListener('touchstart', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            isTouching = true;
            const rect = area.getBoundingClientRect();
            startX = rect.left + rect.width / 2;
            startY = rect.top + rect.height / 2;
            this.updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY, joystick, maxDistance, startX, startY);
        }, { signal: controlsAbortController.signal });

        area.addEventListener('touchmove', (e) => {
            if (isSleeping || !isTouching) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            this.updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY, joystick, maxDistance, startX, startY);
        }, { signal: controlsAbortController.signal });

        area.addEventListener('touchend', (e) => {
            if (isSleeping || !isTouching) return;
            isTouching = false;
            this.resetJoystick(joystick);
        }, { signal: controlsAbortController.signal });
    }

    updateJoystickPosition(touchX, touchY, joystick, maxDistance, startX, startY) {
        const dx = touchX - startX;
        const dy = touchY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let joystickX = dx;
        let joystickY = dy;

        if (distance > maxDistance) {
            joystickX = (dx / distance) * maxDistance;
            joystickY = (dy / distance) * maxDistance;
        }

        joystick.style.left = `calc(50% + ${joystickX}px)`;
        joystick.style.top = `calc(50% + ${joystickY}px)`;

        this.updateKeysFromJoystick(joystickX, joystickY);
    }

    resetJoystick(joystick) {
        joystick.style.left = '50%';
        joystick.style.top = '50%';

        // legado
        keys.ArrowLeft = keys.KeyA = false;
        keys.ArrowRight = keys.KeyD = false;
        keys.ArrowUp = keys.KeyW = false;
        keys.ArrowDown = keys.KeyS = false;

        // novo (remap-friendly)
        joystickActions.moveLeft = false;
        joystickActions.moveRight = false;
        joystickActions.moveUp = false;
        joystickActions.moveDown = false;

        recalcActions();
    }

    updateKeysFromJoystick(x, y) {
        if (isSleeping) return;

        const threshold = MOBILE.JOYSTICK_THRESHOLD;

        const left  = Math.abs(x) > threshold && x < 0;
        const right = Math.abs(x) > threshold && x > 0;
        const up    = Math.abs(y) > threshold && y < 0;
        const down  = Math.abs(y) > threshold && y > 0;

        // legado (pra não quebrar nada existente)
        keys.ArrowLeft = keys.KeyA = left;
        keys.ArrowRight = keys.KeyD = right;
        keys.ArrowUp = keys.KeyW = up;
        keys.ArrowDown = keys.KeyS = down;

        // novo (remap)
        joystickActions.moveLeft = left;
        joystickActions.moveRight = right;
        joystickActions.moveUp = up;
        joystickActions.moveDown = down;

        recalcActions();
    }

    handleCanvasClick(worldX, worldY, screenX, screenY) {
        if (isSleeping || BuildSystem.active) return;

        const clickedAny = collisionSystem.getObjectAtMouse(
            screenX,
            screenY,
            camera,
            { requirePlayerInRange: false }
        );

        if (clickedAny && clickedAny.originalType === 'animal') {
            const animal = clickedAny.object;
            const animalUI = getSystem('animalUI');

            if (animalUI?.selectAnimal) {
                animalUI.selectAnimal(animal, camera);
            } else if (animalUI?.showStats) {
                animalUI.showStats(animal);
            }
            return;
        }

        if (clickedAny) {
            const objectHitbox = collisionSystem.getInteractionObject(clickedAny.objectId);
            const isInRange = objectHitbox && collisionSystem.checkPlayerInteraction(objectHitbox);

            if (isInRange) {
                this.interactWithObject(clickedAny);
            }
            return;
        }

        if (Array.isArray(animals)) {
            const clickedAnimal = animals.find(a => {
                if (!a) return false;
                const ax = a.x || 0;
                const ay = a.y || 0;
                const aw = a.width || a.frameWidth || 32;
                const ah = a.height || a.frameHeight || 32;
                return worldX >= ax && worldX <= ax + aw && worldY >= ay && worldY <= ay + ah;
            });

            if (clickedAnimal) {
                const animalUI = getSystem('animalUI');
                if (animalUI?.selectAnimal) {
                    animalUI.selectAnimal(clickedAnimal, camera);
                } else if (animalUI?.showStats) {
                    animalUI.showStats(clickedAnimal);
                } else if (animalUI?.showById) {
                    animalUI.showById(clickedAnimal.id);
                }
                return;
            }

        }

        const animalUI = getSystem('animalUI');
        animalUI?.closeAll?.();

        if (this.mobile) {
            this.touchMoveSystem.setDestination(worldX, worldY);
        }
    }

    checkCollisionWithRange(hitbox) {
        if (isSleeping || !this.interactionRange || !hitbox) return false;
        return collisionSystem.checkCollision(this.interactionRange, hitbox);
    }

    handleInteraction() {
        if (isSleeping || this.nearbyObjects.size === 0) return;
        const interactable = this.findClosestInteractable();
        if (interactable) this.interactWithObject(interactable);
    }

    findClosestInteractable() {
        if (isSleeping || !this.interactionRange) return null;

        let closest = null;
        let minDistance = Infinity;

        this.nearbyObjects.forEach(objectId => {
            const object = collisionSystem.getAnyObjectById(objectId);
            if (!object) return;
            const objectCenterX = object.x + object.width / 2;
            const objectCenterY = object.y + object.height / 2;
            const playerCenterX = this.interactionRange.x + this.interactionRange.width / 2;
            const playerCenterY = this.interactionRange.y + this.interactionRange.height / 2;
            const distance = Math.hypot(objectCenterX - playerCenterX, objectCenterY - playerCenterY);
            if (distance < minDistance) {
                minDistance = distance;
                closest = {
                    objectId,
                    object,
                    distance,
                    type: object.type,
                    originalType: object.originalType
                };
            }
        });

        return closest;
    }

    interactWithObject(target) {
        if (isSleeping) return;
        const event = new CustomEvent('playerInteract', {
            detail: {
                objectId: target.objectId || target.id,
                objectType: target.type || target.object?.type,
                originalType: target.originalType || target.object?.originalType
            }
        });
        document.dispatchEvent(event);
    }

    drawInteractionRange(ctx, camera) {
        if (isSleeping || !this.interactionRange || !getDebugFlag('hitboxes')) return;

        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        const screenPos = camera.worldToScreen(this.interactionRange.x, this.interactionRange.y);

        ctx.strokeRect(
            screenPos.x,
            screenPos.y,
            this.interactionRange.width * camera.zoom,
            this.interactionRange.height * camera.zoom
        );

        ctx.setLineDash([]);
    }

    update(player, deltaTime) {
        if (isSleeping) return;
        this.touchMoveSystem.update(player, deltaTime);
    }
}

// Player interaction zone configuration
export const PLAYER_INTERACTION_CONFIG = {
    widthRatio: HITBOX_CONFIGS.INTERACTION_ZONES.PLAYER.WIDTH_RATIO,
    heightRatio: HITBOX_CONFIGS.INTERACTION_ZONES.PLAYER.HEIGHT_RATIO,
    offsetX: HITBOX_CONFIGS.INTERACTION_ZONES.PLAYER.OFFSET_X,
    offsetY: HITBOX_CONFIGS.INTERACTION_ZONES.PLAYER.OFFSET_Y
};

// Main keyboard controls setup
export function setupControls(player) {
    const { signal } = controlsAbortController;

    // aplica remap quando o Config salva/aplica
    document.addEventListener("controlsChanged", (e) => {
        const next = e?.detail?.keybinds || e?.detail?.controls || e?.detail;
        const extracted = extractKeybindsFromConfig(next) || next;
        if (!extracted) return;
        setKeybinds(extracted, { persist: true });
    }, { signal });

    // bônus: se configUI disparar algo mais genérico
    document.addEventListener("configChanged", (e) => {
        const extracted = extractKeybindsFromConfig(e?.detail);
        if (!extracted) return;
        setKeybinds(extracted, { persist: true });
    }, { signal });


    document.addEventListener('keydown', (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        setPressedFromEvent(e, true);

        if (player) {
            const isMovement =
                actions.moveLeft || actions.moveRight || actions.moveUp || actions.moveDown;

            if (isMovement && !player.isMoving) {
                player.isMoving = true;
                player.wasMoving = true;
                player.frame = 0;
            }
        }
    }, { signal });

    document.addEventListener('keyup', (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        setPressedFromEvent(e, false);

        const anyMovement =
            actions.moveLeft || actions.moveRight || actions.moveUp || actions.moveDown;

        if (!anyMovement && player) {
            player.isMoving = false;
            player.wasMoving = false;
        }
    }, { signal });
}

// Inventory controls (i key)
function setupInventoryControls() {
    const { signal } = controlsAbortController;

    document.addEventListener("keydown", (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        const active = document.activeElement;
        const isInputActive = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        if (e.key === 'Escape') {
            const host = document.getElementById('inventory-ui-host');
            const modal = host?.shadowRoot?.getElementById('inventoryModal');
            if (modal?.classList.contains('open')) { e.preventDefault(); window.closeInventory?.(); return; }
        }

        if (isActionKeyEvent(e, "inventory") && !isInputActive && !e.repeat) {
            e.preventDefault();
            const host = document.getElementById('inventory-ui-host');
            const modal = host?.shadowRoot?.getElementById('inventoryModal');
            if (modal?.classList.contains('open')) window.closeInventory?.();
            else window.openInventory?.();
            return;
        }
    }, { signal });
}

// Ui shortcuts (u for commerce, o for config)
function setupUIShortcuts() {
    const { signal } = controlsAbortController;

    document.addEventListener("keydown", (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        const active = document.activeElement;
        const isInputActive = !!(active && (
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable
        ));
        if (isInputActive) return;

        const key = (e.key || "").toLowerCase();

        if (key === 'escape') {
            const configModal = document.getElementById('configModal');
            if (configModal?.classList?.contains('active')) {
                e.preventDefault();
                configModal.classList.remove('active');
                return;
            }

            const merchantsList = document.getElementById('merchantsListModal');
            const commerceModal = document.getElementById('commerceModal');
            const tradeConfirm = document.getElementById('tradeConfirmModal');
            const commerceOpen = !!(
                merchantsList?.classList?.contains('active') ||
                commerceModal?.classList?.contains('active') ||
                tradeConfirm?.classList?.contains('active')
            );
            if (commerceOpen) {
                e.preventDefault();
                if (typeof window.closeCommerceSystem === 'function') {
                    window.closeCommerceSystem();
                } else {
                    merchantsList?.classList?.remove('active');
                    commerceModal?.classList?.remove('active');
                    tradeConfirm?.classList?.remove('active');
                }
                return;
            }
        }

        if (isActionKeyEvent(e, "merchants") && !e.repeat) {
            if (BuildSystem?.active) return;

            e.preventDefault();

            const merchantsList = document.getElementById('merchantsListModal');
            const commerceModal = document.getElementById('commerceModal');
            const tradeConfirm = document.getElementById('tradeConfirmModal');

            const commerceOpen = !!(
                merchantsList?.classList?.contains('active') ||
                commerceModal?.classList?.contains('active') ||
                tradeConfirm?.classList?.contains('active')
            );

            if (commerceOpen) {
                if (typeof window.closeCommerceSystem === 'function') {
                    window.closeCommerceSystem();
                } else {
                    merchantsList?.classList?.remove('active');
                    commerceModal?.classList?.remove('active');
                    tradeConfirm?.classList?.remove('active');
                }
                return;
            }

            const merchant = getSystem('merchant');
            if (merchant && typeof merchant.openMerchantsList === 'function') {
                merchant.openMerchantsList();
                return;
            }

            merchantsList?.classList?.add('active');
            return;
        }

        if (isActionKeyEvent(e, "config") && !e.repeat) {
            e.preventDefault();

            const modal = document.getElementById('configModal');
            if (!modal) return;
            
            const closeBtn = modal.querySelector?.('.modal-close');
            if (closeBtn && !closeBtn.__boundClose) {
                closeBtn.__boundClose = true;
                closeBtn.addEventListener('click', () => modal.classList.remove('active'));
            }

            if (modal.classList.contains('active')) modal.classList.remove('active');
            else modal.classList.add('active');
        }
    }, { signal });
}

// Build mode controls (b, r, t, 1-6, esc)
function setupBuildControls() {
    const { signal } = controlsAbortController;

    document.addEventListener("keydown", (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        if (e.key === "Escape" && BuildSystem.active) { BuildSystem.stopBuilding(); return; }

        if ((e.key === 'b' || e.key === 'B') && !BuildSystem.active) {
            const selectedItem = getSystem('inventory')?.getSelectedItem?.();
            if (selectedItem && selectedItem.placeable) BuildSystem.startBuilding(selectedItem);
        }

        if (BuildSystem.active) {
            if (e.key === "r" || e.key === "R") BuildSystem.rotate();
            if (e.key === "t" || e.key === "T") BuildSystem.placeObject();
            if (typeof BuildSystem.setSubPosition === 'function') {
                if (e.key === '1') BuildSystem.setSubPosition('x', -1);
                if (e.key === '2') BuildSystem.setSubPosition('x', 0);
                if (e.key === '3') BuildSystem.setSubPosition('x', 1);
                if (e.key === '4') BuildSystem.setSubPosition('y', -1);
                if (e.key === '5') BuildSystem.setSubPosition('y', 0);
                if (e.key === '6') BuildSystem.setSubPosition('y', 1);
            }
        }
    }, { signal });
}

// Global instance of the player interaction system
export const playerInteractionSystem = new PlayerInteractionSystem();
setupBuildControls();

// Update the player interaction zone
export function updatePlayerInteraction(playerX, playerY, playerWidth, playerHeight) {
    if (isSleeping) return;
    playerInteractionSystem.updateInteractionRange(playerX, playerY, playerWidth, playerHeight);
}

// Update touch movement
export function updateTouchMovement(player, deltaTime) {
    if (isSleeping) return;
    playerInteractionSystem.update(player, deltaTime);
}

// Get movement direction from keyboard
export function getMovementDirection() {
    if (isSleeping) return { x: 0, y: 0 };
    if (playerInteractionSystem.touchMoveSystem.isActive()) return { x: 0, y: 0 };

    let x = 0, y = 0;
    if (actions.moveLeft) x -= 1;
    if (actions.moveRight) x += 1;
    if (actions.moveUp) y -= 1;
    if (actions.moveDown) y += 1;

    if (x !== 0 && y !== 0) { x *= MOVEMENT.DIAGONAL_MULTIPLIER; y *= MOVEMENT.DIAGONAL_MULTIPLIER; }
    return { x, y };
}

// Initialize controls when the DOM is ready.
// Modules loaded via <script type="module" defer> may execute after
// DOMContentLoaded has already fired, so check readyState first to
// avoid the listener never running.
function _initControlsDOMReady() {
    bootstrapKeybindsFromConfigUI();
    setupInventoryControls();
    setupUIShortcuts();

    if (!isMobile()) {
        ['mobile-interact-btn','joystick-area'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initControlsDOMReady, { signal: controlsAbortController.signal });
} else {
    _initControlsDOMReady();
}


/**
 * Limpa todos os event listeners do sistema de controles
 * Remove todos os listeners registrados via AbortController global
 * @returns {void}
 */
export function destroyControls() {
    controlsAbortController.abort();
    

}

// Expor para cleanup global
window.destroyControls = destroyControls;