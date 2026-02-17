/**
 * @file characterModule.js - Generic character factory
 * @description Creates parametrized character instances from config objects.
 * Each character file (stella.js, ben.js, graham.js) provides a CHARACTER_CONFIG
 * and delegates all shared logic (movement, collision, animation, rendering,
 * needs sync) to this factory via createCharacter().
 * @module CharacterModule
 */

import { WORLD_WIDTH, WORLD_HEIGHT, getInitialPlayerPosition } from "../theWorld.js";
import { frames } from "./frames.js";
import { camera, CAMERA_ZOOM } from "./cameraSystem.js";
import { collisionSystem } from "../collisionSystem.js";
import { getDebugFlag } from "../gameState.js";

//DEBUG_HITBOXES é gerenciado via gameState.js
/**
 * Creates a character instance with update/draw/sync functions.
 * The returned object is a closure-based character entity whose animation,
 * movement and rendering are fully driven by the supplied config.
 *
 * @param {Object} config - Character configuration
 * @param {string} config.id - Unique character ID (e.g. 'player_stella')
 * @param {string} config.name - Display name (e.g. 'Stella')
 * @param {string} config.folder - Asset subfolder (e.g. 'stella')
 * @param {string} config.prefix - Sprite filename prefix (e.g. 'Stella')
 * @param {number} config.movingFrames - Number of moving animation frames (also determines idle frame index)
 * @param {string} [config.standFile] - Custom stand sprite filename override
 * @param {number} [config.width=25] - Character hitbox width
 * @param {number} [config.height=48] - Character hitbox height
 * @param {{width: number, height: number}} [config.standSize] - Draw size for left/right idle sprite
 * @param {{width: number, height: number}} [config.standUpSize] - Draw size for up idle sprite
 * @param {{width: number, height: number}} [config.standDownSize] - Draw size for down idle sprite
 * @param {{energy: number, hunger: number, thirst: number}} config.needsModifiers - Consumption rate multipliers
 * @returns {{character: Object, updateCharacter: Function, drawCharacter: Function, syncNeeds: Function, CHARACTER_CONFIG: Object}}
 */
export function createCharacter(config) {
    const initialPos = getInitialPlayerPosition();
    const idleFrame = config.movingFrames;

    const character = {
        id: config.id,
        name: config.name,
        x: initialPos.x,
        y: initialPos.y,
        width: config.width || 25,
        height: config.height || 48,
        speed: 150,
        baseSpeed: 150,
        frame: idleFrame,
        lastFrameTime: 0,
        frameDelay: 120,
        isMoving: false,
        animationAccumulator: 0,
        facingLeft: false,
        facingDirection: 'down',
        isColliding: false,
        collidingWith: null,
        isConsuming: false,
        isSleeping: false,

        draw(ctx) {
            drawCharacter(ctx);
        },

        applyNeedEffects(multiplier) {
            this.speed = this.baseSpeed * multiplier;
            this.exhausted = multiplier < 0.5;
        },

        restoreNeeds(hunger = 0, thirst = 0, energy = 0) {
            if (window.playerSystem && window.playerSystem.restoreNeeds) {
                window.playerSystem.restoreNeeds(hunger, thirst, energy);
            }
        }
    };

    /**
     * Creates the player hitbox rectangle for collision detection.
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    function createHitbox() {
        return collisionSystem.createPlayerHitbox(character.x, character.y, character.width, character.height);
    }

    /**
     * Tests if the character can move to a new position without collision.
     * Updates character.isColliding and character.collidingWith as side effects.
     * @param {number} newX - Target X position
     * @param {number} newY - Target Y position
     * @returns {boolean} True if position is free of collisions
     */
    function canMoveTo(newX, newY) {
        const collisions = collisionSystem.checkPlayerCollision(newX, newY, character.width, character.height);

        if (collisions.length > 0) {
            character.isColliding = true;
            character.collidingWith = collisions[0].type;
            return false;
        }

        character.isColliding = false;
        character.collidingWith = null;
        return true;
    }

    /**
     * Syncs hunger, thirst, energy and consumption state from playerSystem
     * into the local character object.
     * @returns {void}
     */
    function syncNeedsFromPlayerSystem() {
        if (window.playerSystem) {
            const needs = window.playerSystem.getNeeds();
            character.hunger = needs.hunger;
            character.thirst = needs.thirst;
            character.energy = needs.energy;
            character.isConsuming = !!window.playerSystem.isConsuming;
        }
    }

    /**
     * Main per-frame update: handles input, movement, collision, animation and camera.
     * Skips movement when sleeping or consuming. Dispatches 'playerMoved' and
     * 'consumptionCancelled' events as needed.
     * @param {number} deltaTime - Milliseconds since last frame
     * @param {Object} keys - Pressed keys map (e.g. { ArrowLeft: true })
     * @returns {void}
     */
    function updateCharacter(deltaTime, keys) {
        syncNeedsFromPlayerSystem();

        if (window.playerSystem && window.playerSystem.currentPlayer &&
            window.playerSystem.currentPlayer.isSleeping) {
            character.isSleeping = true;
            return;
        } else {
            character.isSleeping = false;
        }

        if (character.isConsuming) {
            character.isMoving = false;
            character.frame = idleFrame;

            document.dispatchEvent(new CustomEvent('consumptionInProgress', {
                detail: { player: character }
            }));

            camera.follow(character);

            character.animationAccumulator += deltaTime;
            if (character.animationAccumulator >= character.frameDelay * 2) {
                character.animationAccumulator = 0;
            }

            return;
        }

        let efficiencyMultiplier = 1.0;
        if (window.playerSystem && window.playerSystem.getEfficiencyMultiplier) {
            efficiencyMultiplier = window.playerSystem.getEfficiencyMultiplier();
        }

        character.speed = character.baseSpeed * efficiencyMultiplier;

        const oldX = character.x;
        const oldY = character.y;

        let moveX = 0, moveY = 0;
        if (keys.ArrowLeft) { moveX -= 1; }
        if (keys.ArrowRight) { moveX += 1; }
        if (keys.ArrowUp) { moveY -= 1; }
        if (keys.ArrowDown) { moveY += 1; }

        const moving = moveX !== 0 || moveY !== 0;

        if (moving) {
            const horizontalMovement = moveX !== 0;

            if (horizontalMovement) {
                character.facingLeft = moveX < 0;
                character.facingDirection = moveX < 0 ? 'left' : 'right';
                character.isMoving = true;
            } else {
                character.facingDirection = moveY < 0 ? 'up' : 'down';
                character.isMoving = false;
                character.frame = idleFrame;
            }

            const newX = character.x + moveX * (character.speed * (deltaTime / 1000));
            const newY = character.y + moveY * (character.speed * (deltaTime / 1000));

            if (canMoveTo(newX, newY)) {
                character.x = newX;
                character.y = newY;
            } else {
                if (moveX !== 0 && canMoveTo(newX, character.y)) {
                    character.x = newX;
                }
                else if (moveY !== 0 && canMoveTo(character.x, newY)) {
                    character.y = newY;
                }
            }

            character.x = Math.max(0, Math.min(WORLD_WIDTH - character.width, character.x));
            character.y = Math.max(0, Math.min(WORLD_HEIGHT - character.height, character.y));
        } else {
            character.isMoving = false;
            character.frame = idleFrame;
            character.isColliding = false;
            character.collidingWith = null;
        }

        const distance = Math.sqrt(
            Math.pow(character.x - oldX, 2) +
            Math.pow(character.y - oldY, 2)
        );

        if (distance > 0) {
            document.dispatchEvent(new CustomEvent('playerMoved', {
                detail: {
                    distance,
                    speed: character.speed,
                    efficiencyMultiplier
                }
            }));

        }

        camera.follow(character);

        if (character.isMoving && character.frame !== idleFrame) {
            character.animationAccumulator += deltaTime;
            if (character.animationAccumulator >= character.frameDelay) {
                character.frame = (character.frame + 1) % config.movingFrames;
                character.animationAccumulator = 0;
            }
        } else if (character.isMoving && character.frame === idleFrame) {
            character.frame = 0;
            character.animationAccumulator = 0;
        }
    }

    /**
     * Renders the character sprite on screen.
     * Selects the correct idle sprite based on facingDirection (up/down/left/right),
     * applies per-direction draw sizes from config, and handles horizontal flip,
     * exhaustion grayscale and consumption glow filters.
     * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
     * @returns {void}
     */
    function drawCharacter(ctx) {
        syncNeedsFromPlayerSystem();

        const isExhausted = window.playerSystem &&
            window.playerSystem.getEfficiencyMultiplier &&
            window.playerSystem.getEfficiencyMultiplier() < 0.5;

        const isConsuming = character.isConsuming;

        let idleImage = frames.idle;
        if (character.facingDirection === 'up') {
            idleImage = frames.idleUp || frames.idle;
        } else if (character.facingDirection === 'down') {
            idleImage = frames.idleDown || frames.idle;
        }

        const isIdle = character.frame === idleFrame;
        let currentImage = isIdle ? idleImage : frames.moving[character.frame];
        if (currentImage && currentImage.complete) {
            const screenPos = camera.worldToScreen(character.x, character.y);

            // Tamanho individual por direcao (idle) vs moving
            let drawW = character.width;
            let drawH = character.height;
            if (isIdle) {
                const dir = character.facingDirection;
                if (dir === 'up' && config.standUpSize) {
                    drawW = config.standUpSize.width;
                    drawH = config.standUpSize.height;
                } else if (dir === 'down' && config.standDownSize) {
                    drawW = config.standDownSize.width;
                    drawH = config.standDownSize.height;
                } else if (config.standSize) {
                    drawW = config.standSize.width;
                    drawH = config.standSize.height;
                }
            }

            const zoomedWidth = drawW * CAMERA_ZOOM;
            const zoomedHeight = drawH * CAMERA_ZOOM;

            if (isExhausted || isConsuming) {
                ctx.save();
                if (isExhausted && isConsuming) {
                    ctx.filter = 'grayscale(50%) brightness(100%) saturate(1.3)';
                } else if (isExhausted) {
                    ctx.filter = 'grayscale(50%) brightness(80%)';
                } else {
                    ctx.filter = 'brightness(1.2) saturate(1.3)';
                }
            }
            const shouldFlip = character.facingLeft &&
                (character.facingDirection === 'left' || character.facingDirection === 'right');

            if (shouldFlip) {
                ctx.save();
                ctx.translate(screenPos.x + zoomedWidth, screenPos.y);
                ctx.scale(-1, 1);
                ctx.drawImage(currentImage, 0, 0, zoomedWidth, zoomedHeight);
                ctx.restore();
            } else {
                ctx.drawImage(currentImage, screenPos.x, screenPos.y, zoomedWidth, zoomedHeight);
            }

            if (isExhausted || isConsuming) {
                ctx.restore();
            }

            if (getDebugFlag('hitboxes')) {
                const hitbox = createHitbox();
                const hitboxScreenPos = camera.worldToScreen(hitbox.x, hitbox.y);
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    hitboxScreenPos.x,
                    hitboxScreenPos.y,
                    hitbox.width * CAMERA_ZOOM,
                    hitbox.height * CAMERA_ZOOM
                );
            }
        }
    }

    /**
     * Public wrapper to sync needs from playerSystem.
     * @returns {void}
     */
    function syncNeeds() {
        syncNeedsFromPlayerSystem();
    }

    return { character, updateCharacter, drawCharacter, syncNeeds, CHARACTER_CONFIG: config };
}
