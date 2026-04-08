/**
 * @file animalAI.js - Artificial Intelligence System for Animals
 * Implements autonomous behavior with movement and idle states.
 * Handles collisions, animations, world navigation,
 * stats (hunger, thirst, moral), moods and interactions (pet, feed, guide).
 */

import { logger } from '../logger.js';
import { collisionSystem } from "../collisionSystem.js";
import { getSystem, getObject } from '../gameState.js';
import { IDLE_STATE_MIN_MS, IDLE_STATE_MAX_MS, MOVE_STATE_MIN_MS, MOVE_STATE_MAX_MS, MOVEMENT, ANIMATION, RANGES } from '../constants.js';

// Mood system

export const AnimalMood = {
    SLEEPING:   'sleeping',
    HURT:       'hurt',
    SUSPICIOUS: 'suspicious',
    ANGRY:      'angry',
    SAD:        'sad',
    HUNGRY:     'hungry',
    NEEDY:      'needy',
    CALM:       'calm',
};

const MOOD_EMOJIS = {
    sleeping:   'Zzz',
    hurt:       '🤕',
    suspicious: '❓',
    angry:      '😡',
    sad:        '😢',
    hungry:     '🍽️',
    needy:      '💔',
    calm:       '😊',
};

function getMaxPetsPerDay(moral) {
    if (moral >= 80) return 5;
    if (moral >= 60) return 4;
    if (moral >= 40) return 3;
    if (moral >= 20) return 2;
    return 1;
}

const AnimalState = {
    IDLE: "idle",
    MOVE: "move",
    FLEE: "flee",
    FOLLOW: "follow",
};

const STATS_DECAY_INTERVAL_MS = 60_000;
const HUNGER_DECAY_PER_MIN = 0.15;
const THIRST_DECAY_PER_MIN = 0.20;
const MORAL_DECAY_PER_MIN  = 0.05;

const PET_MORAL_GAIN = 8;
const FEED_HUNGER_GAIN = 30;
const FEED_MORAL_GAIN = 5;

const FLEE_SPEED_MULT = 1.8;
const FLEE_DISTANCE = 120;
const SUSPICIOUS_PET_THRESHOLD = 3;

export class AnimalEntity {
    constructor(assetName, assetData, x, y, opts = {}) {
        this.frameCounts = assetData.frameCounts || null;
        this.type = "ANIMAL";
        this.assetName = assetName;

        this.img = assetData.img;
        this.cols = assetData.cols || 4;
        this.rows = assetData.rows || 4;

        this.x = x;
        this.y = y;

        this.frameWidth = assetData.frameWidth || (this.img ? this.img.width / this.cols : 32);
        this.frameHeight = assetData.frameHeight || (this.img ? this.img.height / this.rows : 32);
        this.width = this.frameWidth;
        this.height = this.frameHeight;

        this.collisionBox = this.getInitialCollisionConfig();

        this.state = AnimalState.IDLE;
        this.direction = 0;
        this.targetX = x;
        this.targetY = y;

        this.directionRows = assetData.directionRows || { down: 0, up: 3, left: 1, right: 2 };

        this.stateTimer = performance.now();
        this.stateDuration = 1000;

        this.frameIndex = 0;
        this.lastFrameTime = 0;

        this._lastSfxTime = 0;
        this._sfxCooldownMs = 20000 + Math.random() * 20000;

        const initStats = opts.stats || {};
        this.stats = {
            hunger: initStats.hunger ?? 70,
            thirst: initStats.thirst ?? 70,
            moral:  initStats.moral  ?? 60,
        };

        this._isSuspicious = opts.suspicious || false;
        this._isHurt = opts.hurt || false;
        this._mood = opts.initialMood || (this._isSuspicious ? AnimalMood.SUSPICIOUS : AnimalMood.CALM);

        this.petsToday = 0;
        this.petAttempts = 0;
        this.lastPetDay = -1;
        this.following = false;
        this._followTarget = null;

        this._lastDecayTime = performance.now();

        this.__uiPaused = false;
    }

    getInitialCollisionConfig() {
        let box = {
            offsetX: this.width * 0.25,
            offsetY: this.height * 0.6,
            width: this.width * 0.5,
            height: this.height * 0.4
        };
        try {
            if (collisionSystem && typeof collisionSystem.getConfigForObject === 'function') {
                const cfg = collisionSystem.getConfigForObject({
                    type: 'ANIMAL',
                    original: this
                });
                if (cfg) {
                    box.width = this.width * (cfg.widthRatio ?? 0.5);
                    box.height = this.height * (cfg.heightRatio ?? 0.4);
                    box.offsetX = this.width * (cfg.offsetXRatio ?? 0.25);
                    box.offsetY = this.height * (cfg.offsetYRatio ?? 0.6);
                }
            }
        } catch (e) {
            logger.warn("AnimalEntity: error loading collision config", e);
        }
        return box;
    }

    getHitbox() {
        const cb = this.collisionBox;
        return {
            x: this.x + (cb.offsetX || 0),
            y: this.y + (cb.offsetY || 0),
            width: cb.width || this.width,
            height: cb.height || this.height
        };
    }

    recalcMood() {
        const weather = getSystem('weather');
        if (weather) {
            const minutes = weather.currentTime ?? 0;
            const hour = Math.floor(minutes / 60);
            if (hour >= 22 || hour < 6) {
                this._mood = AnimalMood.SLEEPING;
                return;
            }
        }

        if (this._isHurt) {
            this._mood = AnimalMood.HURT;
            return;
        }
        if (this._isSuspicious) {
            this._mood = AnimalMood.SUSPICIOUS;
            return;
        }
        if (this.stats.moral < 15) {
            this._mood = AnimalMood.ANGRY;
            return;
        }
        if (this.stats.moral < 30) {
            this._mood = AnimalMood.SAD;
            return;
        }
        if (this.stats.hunger < 20) {
            this._mood = AnimalMood.HUNGRY;
            return;
        }
        if (this.stats.moral < 50 && this.stats.hunger < 40) {
            this._mood = AnimalMood.NEEDY;
            return;
        }

        if (weather) {
            const wt = weather.weatherType;
            if (wt === 'storm' || wt === 'blizzard') {
                if (this.stats.moral < 60) {
                    this._mood = AnimalMood.SAD;
                    return;
                }
            }
        }

        this._mood = AnimalMood.CALM;
    }

    get mood() {
        return this._mood;
    }

    get moodEmoji() {
        return MOOD_EMOJIS[this._mood] || '';
    }

    updateStats() {
        const now = performance.now();
        const elapsed = now - this._lastDecayTime;
        if (elapsed < STATS_DECAY_INTERVAL_MS) return;

        const minutes = elapsed / 60_000;
        this._lastDecayTime = now;

        this.stats.hunger = Math.max(0, this.stats.hunger - HUNGER_DECAY_PER_MIN * minutes);
        this.stats.thirst = Math.max(0, this.stats.thirst - THIRST_DECAY_PER_MIN * minutes);
        this.stats.moral  = Math.max(0, this.stats.moral  - MORAL_DECAY_PER_MIN  * minutes);

        const weather = getSystem('weather');
        if (weather) {
            const wt = weather.weatherType;
            if (wt === 'storm' || wt === 'blizzard') {
                this.stats.moral = Math.max(0, this.stats.moral - 0.1 * minutes);
            } else if (wt === 'rain') {
                this.stats.moral = Math.max(0, this.stats.moral - 0.03 * minutes);
            }
        }

        const daySys = getSystem('dayNight') || getSystem('weather');
        if (daySys && daySys.dayCount != null) {
            const currentDay = daySys.dayCount;
            if (currentDay !== this.lastPetDay) {
                this.lastPetDay = currentDay;
                this.petsToday = 0;
            }
        }

        this.recalcMood();
    }

    pet() {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }

        if (this._isSuspicious) {
            this.petAttempts++;
            if (this.petAttempts < SUSPICIOUS_PET_THRESHOLD) {
                this._startFlee();
                return { success: false, message: 'suspicious_flee' };
            }
            this._isSuspicious = false;
            this.petAttempts = 0;
            this.stats.moral = Math.min(100, this.stats.moral + PET_MORAL_GAIN);
            this.recalcMood();
            return { success: true, message: 'gained_trust' };
        }

        if (this._mood === AnimalMood.ANGRY) {
            return { success: false, message: 'angry' };
        }

        const maxPets = getMaxPetsPerDay(this.stats.moral);
        if (this.petsToday >= maxPets) {
            return { success: false, message: 'max_pets' };
        }

        this.petsToday++;
        this.stats.moral = Math.min(100, this.stats.moral + PET_MORAL_GAIN);
        this.recalcMood();
        return { success: true, message: 'pet_ok' };
    }

    feed() {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            return { success: false, message: 'suspicious' };
        }

        const inv = getSystem('inventory');
        if (!inv) return { success: false, message: 'no_inventory' };

        let feedItem = null;

        if (typeof inv.findFirstItemInCategory === 'function') {
            feedItem = inv.findFirstItemInCategory('animal_food', item => item.quantity > 0);
        } else if (inv.categories && inv.categories.animal_food && inv.categories.animal_food.items) {
            feedItem = inv.categories.animal_food.items.find(item => item.quantity > 0);
        } else if (typeof inv.findItem === 'function') {
            feedItem = inv.findItem(item => item.type === 'animal_food' || item.id === 'animal_feed_basic' || item.category === 'animal_food');
        }

        if (!feedItem) {
            return { success: false, message: 'no_food' };
        }

        const removed = (typeof inv.removeItem === 'function')
            ? inv.removeItem(feedItem.id, 1)
            : (inv.removeItemFromCategory ? inv.removeItemFromCategory('animal_food', feedItem.id, 1) : false);

        if (removed === false) {
            return { success: false, message: 'failed_remove_food' };
        }

        this.stats.hunger = Math.min(100, this.stats.hunger + FEED_HUNGER_GAIN);
        this.stats.moral  = Math.min(100, this.stats.moral  + FEED_MORAL_GAIN);
        this.recalcMood();
        return { success: true, message: 'fed' };
    }

    guide() {
        if (this._mood === AnimalMood.SLEEPING) {
            return { success: false, message: 'sleeping' };
        }
        if (this._isSuspicious) {
            this._startFlee();
            return { success: false, message: 'suspicious_flee' };
        }
        if (this._mood === AnimalMood.ANGRY) {
            return { success: false, message: 'angry' };
        }

        this.following = !this.following;
        if (this.following) {
            this.state = AnimalState.FOLLOW;
        } else {
            this.state = AnimalState.IDLE;
            this.stateTimer = performance.now();
            this.stateDuration = IDLE_STATE_MIN_MS;
        }
        return { success: true, following: this.following };
    }

    _startFlee() {
        const currentPlayer = getObject('currentPlayer');
        const px = currentPlayer?.x ?? this.x;
        const py = currentPlayer?.y ?? this.y;

        const dx = this.x - px;
        const dy = this.y - py;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        this.targetX = this.x + (dx / dist) * FLEE_DISTANCE;
        this.targetY = this.y + (dy / dist) * FLEE_DISTANCE;
        this.state = AnimalState.FLEE;
        this.stateTimer = performance.now();
        this.stateDuration = 2000;
        this.updateDirection();
    }

    update() {
        if (this.__uiPaused) return;

        this.updateStats();

        const now = performance.now();

        if (this._mood === AnimalMood.SLEEPING) {
            this.state = AnimalState.IDLE;
            this.frameIndex = 0;
            return;
        }

        if (this.following && this.state === AnimalState.FOLLOW) {
            this._updateFollow();
            return;
        }

        if (this.state === AnimalState.FLEE) {
            this.move(FLEE_SPEED_MULT);
            this.updateAnimation(now);
            if (now - this.stateTimer > this.stateDuration) {
                this.state = AnimalState.IDLE;
                this.frameIndex = 0;
                this.stateTimer = now;
                this.stateDuration = IDLE_STATE_MIN_MS + Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS);
            }
            return;
        }

        if (now - this.stateTimer > this.stateDuration) {
            this.pickNewState();
            this.stateTimer = now;
        }

        if (this.state === AnimalState.MOVE) {
            this.move();
        }

        this.updateAnimation(now);
    }

    _updateFollow() {
        const currentPlayer = getObject('currentPlayer');
        if (!currentPlayer) {
            this.following = false;
            this.state = AnimalState.IDLE;
            return;
        }

        const px = currentPlayer.x;
        const py = currentPlayer.y;
        const dx = px - this.x;
        const dy = py - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 60) {
            this.state = AnimalState.FOLLOW;
            this.frameIndex = 0;
            if (Math.abs(dx) > Math.abs(dy)) {
                this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
            } else {
                this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
            }
            return;
        }

        const speed = MOVEMENT.ANIMAL_SPEED * 1.2;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const nextX = this.x + vx;
        const nextY = this.y + vy;

        const boxX = nextX + (this.collisionBox.offsetX || 0);
        const boxY = nextY + (this.collisionBox.offsetY || 0);

        const willCollide = (typeof collisionSystem.areaCollides === 'function')
            ? collisionSystem.areaCollides(boxX, boxY, this.collisionBox.width, this.collisionBox.height, this.id)
            : false;

        if (!willCollide) {
            this.x = nextX;
            this.y = nextY;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
        }

        this.updateAnimation(performance.now());
    }

    pickNewState() {
        this.frameIndex = 0;

        if (Math.random() > 0.6) {
            this.state = AnimalState.MOVE;
            this.stateDuration = Math.random() * (MOVE_STATE_MAX_MS - MOVE_STATE_MIN_MS) + MOVE_STATE_MIN_MS;

            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * RANGES.ANIMAL_SIGHT_RADIUS;
            this.targetX = this.x + Math.cos(angle) * dist;
            this.targetY = this.y + Math.sin(angle) * dist;

            this.updateDirection();
        } else {
            this.state = AnimalState.IDLE;
            this.stateDuration = Math.random() * (IDLE_STATE_MAX_MS - IDLE_STATE_MIN_MS) + IDLE_STATE_MIN_MS;
        }

        if (this.assetName === 'Bull') {
            const now = performance.now();
            if (now - this._lastSfxTime >= this._sfxCooldownMs && Math.random() < 0.25) {
                const audio = getSystem('audio');
                if (audio && audio.playSfx3D) {
                    const played = audio.playSfx3D('bull_bellow', this.x, this.y, { category: 'animal' });
                    if (played) {
                        this._lastSfxTime = now;
                        this._sfxCooldownMs = 20000 + Math.random() * 20000;
                    }
                }
            }
        }
    }

    updateDirection() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
        }
    }

    move(speedMult = 1) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 2) {
            this.state = AnimalState.IDLE;
            this.frameIndex = 0;
            return;
        }

        const speed = MOVEMENT.ANIMAL_SPEED * speedMult;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const nextX = this.x + vx;
        const nextY = this.y + vy;

        const boxX = nextX + (this.collisionBox.offsetX || 0);
        const boxY = nextY + (this.collisionBox.offsetY || 0);
        const boxW = this.collisionBox.width;
        const boxH = this.collisionBox.height;

        const willCollide = (typeof collisionSystem.areaCollides === 'function')
            ? collisionSystem.areaCollides(boxX, boxY, boxW, boxH, this.id)
            : false;

        if (!willCollide) {
            this.x = nextX;
            this.y = nextY;
        } else {
            this.state = AnimalState.IDLE;
            this.frameIndex = 0;
            this.stateTimer = performance.now();
            this.stateDuration = IDLE_STATE_MIN_MS;
        }
    }

    updateAnimation(now) {
        const isMoving = this.state === AnimalState.MOVE || this.state === AnimalState.FLEE ||
            (this.state === AnimalState.FOLLOW && this.following);

        const frameRate = isMoving ? ANIMATION.FRAME_RATE_MOVE_MS : ANIMATION.FRAME_RATE_IDLE_MS;

        const configuredFrames = this.frameCounts?.[this.state === AnimalState.MOVE ? 'move' : 'idle'];
        const maxFrames = Number.isFinite(configuredFrames)
            ? Math.min(this.cols, Math.max(1, Math.floor(configuredFrames)))
            : this.cols;

        if (now - this.lastFrameTime >= frameRate) {
            this.lastFrameTime = now;
            this.frameIndex = (this.frameIndex + 1) % maxFrames;
        }
    }

    draw(ctx, camera) {
        if (!this.img || !camera) return;

        const screenPos = camera.worldToScreen(this.x, this.y);
        const zoomedWidth = this.frameWidth * camera.zoom;
        const zoomedHeight = this.frameHeight * camera.zoom;

        if (screenPos.x < -zoomedWidth || screenPos.x > camera.width ||
            screenPos.y < -zoomedHeight || screenPos.y > camera.height) return;

        const sx = this.frameIndex * this.frameWidth;
        const sy = this.direction * this.frameHeight;

        ctx.drawImage(
            this.img,
            sx, sy, this.frameWidth, this.frameHeight,
            Math.floor(screenPos.x), Math.floor(screenPos.y), zoomedWidth, zoomedHeight
        );

        if (this._mood !== AnimalMood.CALM) {
            const emoji = this.moodEmoji;
            if (emoji) {
                ctx.font = `${Math.round(14 * camera.zoom)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(emoji, Math.floor(screenPos.x + zoomedWidth / 2), Math.floor(screenPos.y - 4 * camera.zoom));
            }
        }
    }

    serialize() {
        return {
            assetName: this.assetName,
            id: this.id,
            x: Math.round(this.x),
            y: Math.round(this.y),
            stats: { ...this.stats },
            isSuspicious: this._isSuspicious,
            isHurt: this._isHurt,
            petsToday: this.petsToday,
            petAttempts: this.petAttempts,
            lastPetDay: this.lastPetDay,
            following: this.following,
        };
    }

    deserialize(data) {
        if (!data) return;
        if (data.stats) {
            this.stats.hunger = data.stats.hunger ?? this.stats.hunger;
            this.stats.thirst = data.stats.thirst ?? this.stats.thirst;
            this.stats.moral  = data.stats.moral  ?? this.stats.moral;
        }
        this._isSuspicious = data.isSuspicious ?? false;
        this._isHurt = data.isHurt ?? false;
        this.petsToday = data.petsToday ?? 0;
        this.petAttempts = data.petAttempts ?? 0;
        this.lastPetDay = data.lastPetDay ?? -1;
        this.following = data.following ?? false;
        if (this.following) this.state = AnimalState.FOLLOW;
        this.recalcMood();
    }
}