
import { camera } from "./cameraSystem.js";
import { collisionSystem } from "../collisionSystem.js";
import { BuildSystem } from "../buildSystem.js";
import { animals } from "../theWorld.js";
import { MOVEMENT, RANGES, MOBILE, SIZES, HITBOX_CONFIGS } from '../constants.js';

// Key configuration
export const keys = {
    ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
    KeyA: false, KeyW: false, KeyS: false, KeyD: false,
    KeyE: false, Space: false
};

// Sleep state that blocks all inputs
let isSleeping = false;
let isSleepingGlobal = false;

document.addEventListener("sleepStarted", () => {
    isSleeping = true;
    isSleepingGlobal = true;

    Object.keys(keys).forEach(key => { keys[key] = false; });

    const mobileBtn = document.getElementById('mobile-interact-btn');
    const joystickArea = document.getElementById('joystick-area');
    if (mobileBtn) mobileBtn.style.display = 'none';
    if (joystickArea) joystickArea.style.display = 'none';
});

document.addEventListener("sleepEnded", () => {
    isSleeping = false;
    isSleepingGlobal = false;

    if (isMobile()) {
        const joystickArea = document.getElementById('joystick-area');
        if (joystickArea) joystickArea.style.display = 'block';
    }
});

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
        });
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

        document.addEventListener('keydown', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

            if ((e.key === 'e' || e.key === 'E') && !keys.KeyE) {
                keys.KeyE = true;
                this.handleInteraction();
            }

            if ((e.key === 'k' || e.key === 'K')) {
                if (self.lastMouseScreenX !== null && self.lastMouseScreenY !== null) {
                    const obj = collisionSystem.getObjectAtMouse(
                        self.lastMouseScreenX,
                        self.lastMouseScreenY,
                        camera,
                        { requirePlayerInRange: true }
                    );

                    if (obj && obj.originalType === 'animal') {
                        if (window.animalUiPanel && typeof window.animalUiPanel.selectAnimal === 'function') {
                            window.animalUiPanel.selectAnimal(obj.object);
                        }
                        else if (window.animalUI && typeof window.animalUI.selectAnimal === 'function') {
                            window.animalUI.selectAnimal(obj.object);
                        }
                        else if (window.animalUI && typeof window.animalUI.showStats === 'function') {
                            window.animalUI.showStats(obj.object);
                        }
                    } else {
                        if (window.animalUI && typeof window.animalUI.inspectAnimal === 'function') {
                            window.animalUI.inspectAnimal();
                        }
                    }
                } else {
                    if (window.animalUI && typeof window.animalUI.inspectAnimal === 'function') {
                        window.animalUI.inspectAnimal();
                    }
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            if (e.key === 'e' || e.key === 'E') {
                keys.KeyE = false;
            }
        });

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
        });

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
        });
    }

    setupMobileControls() {
        if (isSleeping) return;

        const button = document.createElement('button');
        button.id = 'mobile-interact-btn';
        button.innerHTML = 'E';
        button.style.cssText = `
            position: fixed; bottom: ${SIZES.MOBILE_UI.INTERACT_BUTTON.BOTTOM}px; right: ${SIZES.MOBILE_UI.INTERACT_BUTTON.RIGHT}px; width: ${SIZES.MOBILE_UI.INTERACT_BUTTON.WIDTH}px; height: ${SIZES.MOBILE_UI.INTERACT_BUTTON.HEIGHT}px;
            border-radius: 50%; background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
            color: white; font-size: 24px; font-weight: bold; border: none; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            z-index: 1000; display: none; cursor: pointer; opacity: 0.9; transition: all 0.2s;
        `;

        button.addEventListener('touchstart', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            button.style.transform = 'scale(0.95)';
            this.handleInteraction();
        });

        button.addEventListener('touchend', (e) => {
            if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            button.style.transform = 'scale(1)';
        });

        document.body.appendChild(button);

        this.setupVirtualJoystick();
    }

    setupVirtualJoystick() {
        if (isSleeping) return;

        const joystickArea = document.createElement('div');
        joystickArea.id = 'joystick-area';
        joystickArea.style.cssText = `
            position: fixed; bottom: 30px; left: 30px; width: ${SIZES.MOBILE_UI.JOYSTICK_AREA.WIDTH}px; height: ${SIZES.MOBILE_UI.JOYSTICK_AREA.HEIGHT}px;
            border-radius: 50%; background: rgba(0,0,0,0.3); border: 2px solid rgba(255,255,255,0.5);
            z-index: 999; touch-action: none; display: ${isMobile() ? 'block' : 'none'};
        `;

        const joystick = document.createElement('div');
        joystick.id = 'joystick';
        joystick.style.cssText = `
            position: absolute; width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.85);
            top: 50%; left: 50%; transform: translate(-50%,-50%); touch-action: none;
        `;
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
        });

        area.addEventListener('touchmove', (e) => {
            if (isSleeping || !isTouching) { e.preventDefault(); e.stopPropagation(); return; }
            e.preventDefault();
            this.updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY, joystick, maxDistance, startX, startY);
        });

        area.addEventListener('touchend', (e) => {
            if (isSleeping || !isTouching) return;
            isTouching = false;
            this.resetJoystick(joystick);
        });
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
        keys.ArrowLeft = keys.KeyA = false;
        keys.ArrowRight = keys.KeyD = false;
        keys.ArrowUp = keys.KeyW = false;
        keys.ArrowDown = keys.KeyS = false;
    }

    updateKeysFromJoystick(x, y) {
        if (isSleeping) return;
        const threshold = MOBILE.JOYSTICK_THRESHOLD;
        keys.ArrowLeft = keys.KeyA = Math.abs(x) > threshold && x < 0;
        keys.ArrowRight = keys.KeyD = Math.abs(x) > threshold && x > 0;
        keys.ArrowUp = keys.KeyW = Math.abs(y) > threshold && y < 0;
        keys.ArrowDown = keys.KeyS = Math.abs(y) > threshold && y > 0;
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

            if (window.animalUiPanel && typeof window.animalUiPanel.selectAnimal === 'function') {
                window.animalUiPanel.selectAnimal(animal, camera);
            } else if (window.animalUI && typeof window.animalUI.selectAnimal === 'function') {
                window.animalUI.selectAnimal(animal);
            } else if (window.animalUI && typeof window.animalUI.showStats === 'function') {
                window.animalUI.showStats(animal);
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
    if (window.animalUiPanel && typeof window.animalUiPanel.selectAnimal === "function") {
        window.animalUiPanel.selectAnimal(clickedAnimal, camera);
    } else if (window.animalUI && typeof window.animalUI.selectAnimal === 'function') {
        window.animalUI.selectAnimal(clickedAnimal);
    } else if (window.animalUI && typeof window.animalUI.showStats === 'function') {
        window.animalUI.showStats(clickedAnimal);
    } else if (window.animalUI && typeof window.animalUI.showById === 'function') {
        window.animalUI.showById(clickedAnimal.id);
    }

    return;
}

        }

        if (window.animalUiPanel && typeof window.animalUiPanel.closeAll === 'function') {
            window.animalUiPanel.closeAll();
        }
        if (window.animalUI && typeof window.animalUI.closeAll === 'function') {
            window.animalUI.closeAll();
        }

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
        if (isSleeping || !this.interactionRange || !window.DEBUG_HITBOXES) return;

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
    document.addEventListener('keydown', (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

        if (e.key in keys) keys[e.key] = true;
        else if (e.code in keys) keys[e.code] = true;

        if (player) {
            const movementKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyW','KeyS','KeyD'];
            const isMovementKey = movementKeys.includes(e.key) || movementKeys.includes(e.code);
            if (isMovementKey && !player.isMoving) {
                player.isMoving = true;
                player.wasMoving = true;
                player.frame = 0;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        if (e.key in keys) keys[e.key] = false;
        else if (e.code in keys) keys[e.code] = false;

        const movementKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyW','KeyS','KeyD'];
        const anyMovementKeyPressed = movementKeys.some(k => keys[k]);
        if (!anyMovementKeyPressed && player) {
            player.isMoving = false;
            player.wasMoving = false;
        }
    });
}

// Inventory controls (i key)
function setupInventoryControls() {
    document.addEventListener("keydown", (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        const active = document.activeElement;
        const isInputActive = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        if (e.key === 'Escape') {
            const host = document.getElementById('inventory-ui-host');
            const modal = host?.shadowRoot?.getElementById('inventoryModal');
            if (modal?.classList.contains('open')) { e.preventDefault(); window.closeInventory?.(); return; }
        }

        if ((e.key.toLowerCase() === 'i') && !isInputActive) {
            e.preventDefault();
            const host = document.getElementById('inventory-ui-host');
            const modal = host?.shadowRoot?.getElementById('inventoryModal');
            if (modal?.classList.contains('open')) window.closeInventory?.();
            else window.openInventory?.();
            return;
        }
    });
}

// Ui shortcuts (u for commerce, o for config)
function setupUIShortcuts() {
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

        if (key === 'u') {
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

            if (typeof window.openStore === 'function') {
                window.openStore();
                return;
            }
            if (typeof window.openMerchantsList === 'function') {
                window.openMerchantsList();
                return;
            }
            if (window.merchantSystem && typeof window.merchantSystem.openMerchantsList === 'function') {
                window.merchantSystem.openMerchantsList();
                return;
            }

            merchantsList?.classList?.add('active');
            return;
        }

        if (key === 'o') {
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
    });
}

// Build mode controls (b, r, t, 1-6, esc)
function setupBuildControls() {
    document.addEventListener("keydown", (e) => {
        if (isSleeping) { e.preventDefault(); e.stopPropagation(); return; }

        if (e.key === "Escape" && BuildSystem.active) { BuildSystem.stopBuilding(); return; }

        if ((e.key === 'b' || e.key === 'B') && !BuildSystem.active) {
            const selectedItem = window.inventorySystem?.getSelectedItem?.();
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
    });
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
    if (keys.ArrowLeft || keys.KeyA) x -= 1;
    if (keys.ArrowRight || keys.KeyD) x += 1;
    if (keys.ArrowUp || keys.KeyW) y -= 1;
    if (keys.ArrowDown || keys.KeyS) y += 1;

    if (x !== 0 && y !== 0) { x *= MOVEMENT.DIAGONAL_MULTIPLIER; y *= MOVEMENT.DIAGONAL_MULTIPLIER; }
    return { x, y };
}

// Initialize controls when the dom is ready
document.addEventListener('DOMContentLoaded', () => {
    setupInventoryControls();
    setupUIShortcuts();

    if (!isMobile()) {
        ['mobile-interact-btn','joystick-area'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
});