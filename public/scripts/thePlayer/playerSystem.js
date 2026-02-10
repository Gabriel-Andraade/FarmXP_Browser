/**
 * @file playerSystem.js - Core player management system
 * @description Manages player state including needs (hunger, thirst, energy),
 * equipment, character loading, and survival mechanics. Central hub for
 * player-related events and state synchronization.
 * @module PlayerSystem
 */

import { GAME_BALANCE, NEEDS_UPDATE_INTERVAL_MS, SLEEP_ENERGY_RESTORE_INTERVAL_MS, FEEDBACK_MESSAGE_DURATION_MS } from '../constants.js';
import { validateRange } from '../validation.js';

/**
 * Minimum and maximum values for player needs
 * @constant {number}
 */
const MIN_NEED = 0;
const MAX_NEED = 100;

/**
 * Core player management class handling needs, equipment, and character state
 * @class PlayerSystem
 */
export class PlayerSystem {
    /**
     * Creates a new PlayerSystem instance
     * Initializes needs, equipment, and event listeners
     */
    constructor() {
        /** @type {Object|null} Currently selected character data */
        this.activeCharacter = null;

        /** @type {Object|null} Current player entity instance */
        this.currentPlayer = null;

        /** @type {Function|null} Character update function */
        this.updateFunction = null;

        /** @type {Function|null} Character draw function */
        this.drawFunction = null;

        /** @type {Object|null} Currently equipped item */
        this.equippedItem = null;

        // AbortController para cleanup de event listeners
        this.abortController = new AbortController();

        // Armazenar referência do interval para cleanup
        this.needsUpdateInterval = null;

        // Armazenar referência do sleep interval para cleanup
        this.sleepInterval = null;

        /**
         * Player survival needs configuration
         * @type {Object}
         */
        this.needs = {
            hunger: GAME_BALANCE.NEEDS.MAX_VALUE,
            thirst: GAME_BALANCE.NEEDS.MAX_VALUE,
            energy: GAME_BALANCE.NEEDS.MAX_VALUE,
            lastUpdate: Date.now(),

            criticalFlags: {
                hungerCritical: false,
                thirstCritical: false,
                energyCritical: false
            },

            consumptionRates: GAME_BALANCE.NEEDS.CONSUMPTION_RATES,

            criticalLevels: {
                hunger: GAME_BALANCE.NEEDS.CRITICAL_THRESHOLD,
                thirst: GAME_BALANCE.NEEDS.CRITICAL_THRESHOLD,
                energy: GAME_BALANCE.NEEDS.ENERGY_CRITICAL
            },

            lowNeedsEffects: {
                speedMultiplier: 0.5,
                miningMultiplier: 0.3,
                buildingMultiplier: 0.2
            }
        };

        this.setupEventListeners();
        this.setupActionListeners();
        this.startNeedsUpdate();
    }

    /**
     * Sets up event listeners for equipment and consumption requests
     * @returns {void}
     */
    setupEventListeners() {
        const { signal } = this.abortController;

        document.addEventListener('equipItemRequest', (e) => {
            this.equipItem(e.detail.item);
        }, { signal });

        document.addEventListener('unequipItemRequest', () => {
            this.unequipItem();
        }, { signal });

        document.addEventListener('discardItemRequest', (e) => {
            const { itemId } = e.detail;
            if (this.equippedItem && this.equippedItem.id === itemId) {
                this.unequipItem();
            }
        }, { signal });

        document.addEventListener('startConsumptionRequest', (e) => {
            const { category, itemId, quantity, item, fillUp } = e.detail;
            this.consumeItem(item);

            document.dispatchEvent(new CustomEvent('removeItemAfterConsumption', {
                detail: { category, itemId, quantity }
            }));
        }, { signal });

        document.addEventListener('itemConsumed', (e) => {
            const item = e.detail.item;
            this.consumeItem(item);
        }, { signal });
    }

    /**
     * Sets up listeners for player actions that consume needs
     * Handles movement, tool use, collection, building, and sleep events
     * @returns {void}
     */
    setupActionListeners() {
        const { signal } = this.abortController;

        document.addEventListener('playerMoved', (e) => {
            if (e.detail && e.detail.distance) {
                this.consumeNeeds('moving', e.detail.distance / 100);
            }
        }, { signal });

        document.addEventListener('toolUsedOnObject', (e) => {
            this.consumeNeeds('breaking', 1);
        }, { signal });

        document.addEventListener('itemCollected', (e) => {
            this.consumeNeeds('collecting', 1);
        }, { signal });

        document.addEventListener('buildingPlaced', (e) => {
            this.consumeNeeds('building', 1);
        }, { signal });

        document.addEventListener('sleepStarted', () => {
            this.startSleep();
        }, { signal });

        document.addEventListener('sleepEnded', () => {
            this.endSleep();
        }, { signal });

        document.addEventListener('consumeFood', (e) => {
            this.restoreNeeds(e.detail.hunger || 0, e.detail.thirst || 0, e.detail.energy || 0);
        }, { signal });
    }

    /**
     * Starts the periodic needs update interval
     * Updates idle consumption every 2 seconds
     * @returns {void}
     */
    startNeedsUpdate() {
        // Clear existing interval if any
        if (this.needsUpdateInterval) {
            clearInterval(this.needsUpdateInterval);
        }

        // Store interval reference for cleanup
        this.needsUpdateInterval = setInterval(() => {
            this.updateNeeds();
        }, NEEDS_UPDATE_INTERVAL_MS);
    }

    /**
     * Updates needs based on time elapsed since last update
     * Applies idle consumption rates
     * @returns {void}
     */
    updateNeeds() {
        const now = Date.now();
        const deltaTime = (now - this.needs.lastUpdate) / 1000;

        this.consumeNeeds('idle', deltaTime);

        this.needs.lastUpdate = now;
        this.dispatchNeedsUpdate();
    }

    /**
     * Consumes needs based on action type and intensity
     * @param {string} actionType - Type of action ("moving", "breaking", "building", "collecting", "idle")
     * @param {number} [multiplier=1] - Intensity multiplier for consumption rates
     * @returns {void}
     */
    consumeNeeds(actionType, multiplier = 1) {
        if (!this.needs.consumptionRates[actionType]) {
            console.warn('[PlayerSystem] Unknown action type:', actionType);
            return;
        }

        // Valida o multiplicador para um range razoável (0-10)
        const validMultiplier = validateRange(multiplier, 0, 10);

        const rates = this.needs.consumptionRates[actionType];

        this.needs.hunger = Math.max(0, this.needs.hunger - (rates.hunger * validMultiplier));
        this.needs.thirst = Math.max(0, this.needs.thirst - (rates.thirst * validMultiplier));

        this.needs.energy = Math.max(0, Math.min(GAME_BALANCE.NEEDS.MAX_VALUE,
            this.needs.energy - (rates.energy * validMultiplier)));

        this.dispatchNeedsUpdate();
        this.checkCriticalNeeds();
    }

    /**
     * Restores player needs by specified amounts
     * @param {number} hunger - Amount of hunger to restore
     * @param {number} thirst - Amount of thirst to restore
     * @param {number} energy - Amount of energy to restore
     * @returns {void}
     */
    restoreNeeds(hunger, thirst, energy) {
        const validHunger = validateRange(hunger, MIN_NEED, GAME_BALANCE.NEEDS.MAX_VALUE);
        const validThirst = validateRange(thirst, MIN_NEED, GAME_BALANCE.NEEDS.MAX_VALUE);
        const validEnergy = validateRange(energy, MIN_NEED, GAME_BALANCE.NEEDS.MAX_VALUE);

        this.needs.hunger = Math.min(GAME_BALANCE.NEEDS.MAX_VALUE, this.needs.hunger + validHunger);
        this.needs.thirst = Math.min(GAME_BALANCE.NEEDS.MAX_VALUE, this.needs.thirst + validThirst);
        this.needs.energy = Math.min(GAME_BALANCE.NEEDS.MAX_VALUE, this.needs.energy + validEnergy);

        this.dispatchNeedsUpdate();

        if (validHunger > 0 || validThirst > 0 || validEnergy > 0) {
            this.showNeedRestoredFeedback(validHunger, validThirst, validEnergy);
        }
    }

    /**
     * Dispatches playerNeedsChanged event and updates HUD
     * @returns {void}
     */
    dispatchNeedsUpdate() {
        document.dispatchEvent(new CustomEvent('playerNeedsChanged', {
            detail: {
                hunger: Math.round(this.needs.hunger),
                thirst: Math.round(this.needs.thirst),
                energy: Math.round(this.needs.energy)
            }
        }));

        if (window.playerHUD) {
            window.playerHUD.updatePlayerInfo();
        }
    }

    /**
     * Checks if any needs have reached critical levels
     * Sets critical flags and applies low needs effects
     * @returns {Object} Object containing critical status flags
     */
    checkCriticalNeeds() {
        const effects = {};
        
        if (this.needs.hunger <= this.needs.criticalLevels.hunger) {
            effects.hungerCritical = true;
            if (!this.needs.criticalFlags.hungerCritical) {
                this.needs.criticalFlags.hungerCritical = true;
            }
        } else {
            this.needs.criticalFlags.hungerCritical = false;
        }
        
        if (this.needs.thirst <= this.needs.criticalLevels.thirst) {
            effects.thirstCritical = true;
            if (!this.needs.criticalFlags.thirstCritical) {
                this.needs.criticalFlags.thirstCritical = true;
            }
        } else {
            this.needs.criticalFlags.thirstCritical = false;
        }
        
        if (this.needs.energy <= this.needs.criticalLevels.energy) {
            effects.energyCritical = true;
            if (!this.needs.criticalFlags.energyCritical) {
                this.needs.criticalFlags.energyCritical = true;
            }
        } else {
            this.needs.criticalFlags.energyCritical = false;
        }
        
        if (Object.keys(effects).length > 0) {
            this.applyLowNeedsEffects();
        }
        
        return effects;
    }

    /**
     * Applies gameplay effects when player needs are critically low
     * Reduces speed and other stats based on lowest need value
     * @returns {void}
     */
    applyLowNeedsEffects() {
        if (!this.currentPlayer) return;
        
        const lowestNeed = Math.min(
            this.needs.hunger,
            this.needs.thirst,
            this.needs.energy
        );
        
        const criticalMultiplier = lowestNeed <= GAME_BALANCE.NEEDS.LOW_THRESHOLD ? 0.3 : 0.7;
        
        if (this.currentPlayer.applyNeedEffects) {
            this.currentPlayer.applyNeedEffects(criticalMultiplier);
        }
        
        document.dispatchEvent(new CustomEvent('needsCritical', {
            detail: { 
                hunger: this.needs.hunger,
                thirst: this.needs.thirst,
                energy: this.needs.energy,
                multiplier: criticalMultiplier
            }
        }));
    }

    /**
     * Initiates sleep mode for the player
     * Gradually restores energy until full
     * @returns {void}
     */
    startSleep() {
        this.currentPlayer.isSleeping = true;

        if (this.sleepInterval) clearInterval(this.sleepInterval);
        this.sleepInterval = setInterval(() => {
            if (this.needs.energy < GAME_BALANCE.NEEDS.MAX_VALUE) {
                this.needs.energy = Math.min(GAME_BALANCE.NEEDS.MAX_VALUE, this.needs.energy + GAME_BALANCE.NEEDS.SLEEP_ENERGY_RESTORE_AMOUNT);
                this.dispatchNeedsUpdate();

                if (this.needs.energy >= GAME_BALANCE.NEEDS.MAX_VALUE) {
                    clearInterval(this.sleepInterval);
                    this.sleepInterval = null;
                    this.endSleep();
                }
            }
        }, SLEEP_ENERGY_RESTORE_INTERVAL_MS);
    }

    /**
     * Ends sleep mode and fully restores energy
     * @returns {void}
     */
    endSleep() {
        // Clear sleep interval if it exists
        if (this.sleepInterval) {
            clearInterval(this.sleepInterval);
            this.sleepInterval = null;
        }
        
        this.currentPlayer.isSleeping = false;
        this.needs.energy = GAME_BALANCE.NEEDS.MAX_VALUE;
        this.dispatchNeedsUpdate();

        document.dispatchEvent(new CustomEvent('sleepCompleted'));
    }

    /**
     * Processes item consumption and restores appropriate needs
     * Determines restoration values from item properties or type
     * @param {Object} item - Item to consume with fillUp or type properties
     * @returns {void}
     */
    consumeItem(item) {
        let hungerRestore = 0;
        let thirstRestore = 0;
        let energyRestore = 0;
        
        if (item.fillUp) {
            hungerRestore = item.fillUp.hunger || 0;
            thirstRestore = item.fillUp.thirst || 0;
            energyRestore = item.fillUp.energy || 0;
        } else {
            switch(item.type) {
                case 'food':
                    const isDrink = item.name && (
                        item.name.toLowerCase().includes('água') ||
                        item.name.toLowerCase().includes('suco') ||
                        item.name.toLowerCase().includes('refrigerante') ||
                        item.name.toLowerCase().includes('bebida')
                    );
                    
                    if (isDrink) {
                        thirstRestore = GAME_BALANCE.NEEDS.FOOD_RESTORATION.DRINK_THIRST;
                        energyRestore = GAME_BALANCE.NEEDS.FOOD_RESTORATION.DRINK_ENERGY;
                    } else {
                        hungerRestore = GAME_BALANCE.NEEDS.FOOD_RESTORATION.FOOD_HUNGER;
                        energyRestore = GAME_BALANCE.NEEDS.FOOD_RESTORATION.FOOD_ENERGY;
                    }
                    break;
                case 'water':
                    thirstRestore = GAME_BALANCE.NEEDS.FOOD_RESTORATION.WATER_THIRST;
                    break;
                default:
                    if (item.restoreHunger) hungerRestore = item.restoreHunger;
                    if (item.restoreThirst) thirstRestore = item.restoreThirst;
                    if (item.restoreEnergy) energyRestore = item.restoreEnergy;
            }
        }
        
        this.restoreNeeds(hungerRestore, thirstRestore, energyRestore);
    }

    /**
     * Displays visual feedback when needs are restored
     * Shows floating text with restoration amounts
     * @param {number} hunger - Amount of hunger restored
     * @param {number} thirst - Amount of thirst restored
     * @param {number} energy - Amount of energy restored
     * @returns {void}
     */
    showNeedRestoredFeedback(hunger, thirst, energy) {
        const feedback = document.createElement('div');
        feedback.className = 'hud-need-feedback';
        
        let text = '';
        if (hunger > 0) text += `+${hunger} `;
        if (thirst > 0) text += `+${thirst} `;
        if (energy > 0) text += `+${energy}`;
        
        feedback.textContent = text;
        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
        }, FEEDBACK_MESSAGE_DURATION_MS);
    }

    /**
     * Calculates player efficiency multiplier based on current needs
     * @returns {number} Multiplier between 0.3 and 1.0
     */
    getEfficiencyMultiplier() {
        // fix: Extracted needs count constant for clarity (L433-434)
        const MAX_TOTAL_NEEDS = 3; // hunger + thirst + energy
        const avgNeeds = (this.needs.hunger + this.needs.thirst + this.needs.energy) / (GAME_BALANCE.NEEDS.MAX_VALUE * MAX_TOTAL_NEEDS);

        const hasCritical = this.needs.hunger <= GAME_BALANCE.NEEDS.LOW_THRESHOLD ||
                           this.needs.thirst <= GAME_BALANCE.NEEDS.LOW_THRESHOLD ||
                           this.needs.energy <= GAME_BALANCE.NEEDS.LOW_THRESHOLD;
        
        if (hasCritical) {
            return 0.3;
        }
        
        return Math.max(0.5, avgNeeds);
    }

    /** @returns {number} Current hunger level (0-100) */
    getHunger() { return Math.round(this.needs.hunger); }

    /** @returns {number} Current thirst level (0-100) */
    getThirst() { return Math.round(this.needs.thirst); }

    /** @returns {number} Current energy level (0-100) */
    getEnergy() { return Math.round(this.needs.energy); }

    /**
     * Gets all current need values
     * @returns {{hunger: number, thirst: number, energy: number}} Current needs
     */
    getNeeds() { 
        return {
            hunger: this.getHunger(),
            thirst: this.getThirst(),
            energy: this.getEnergy()
        };
    }

    /**
     * Equips an item for the player
     * Unequips current item if same item is equipped again
     * @param {Object} item - Item to equip
     * @returns {boolean} True if item was equipped, false if unequipped
     */
    equipItem(item) {
        if (this.equippedItem && this.equippedItem.id === item.id) {
            this.unequipItem();
            return false;
        }
        
        this.equippedItem = item;
        
        document.dispatchEvent(new CustomEvent('itemEquipped', {
            detail: { item }
        }));
        
        return true;
    }

    /**
     * Unequips the currently equipped item
     * @returns {boolean} True if an item was unequipped
     */
    unequipItem() {
        if (this.equippedItem) {
            this.equippedItem = null;
            
            document.dispatchEvent(new CustomEvent('itemUnequipped'));
            return true;
        }
        return false;
    }

    /** @returns {boolean} True if player has an equipped item */
    hasEquippedItem() {
        return this.equippedItem !== null;
    }

    /** @returns {Object|null} Currently equipped item or null */
    getEquippedItem() {
        return this.equippedItem;
    }

    /**
     * Sets the active character and loads its module
     * @param {Object} characterData - Character data with id property
     * @returns {void}
     */
    setActiveCharacter(characterData) {
        this.activeCharacter = characterData;
        this.loadCharacterModule(characterData.id);
    }

    /**
     * Dynamically loads the character module based on character ID
     * @param {string} characterId - ID of character to load
     * @returns {Promise<void>}
     */
    async loadCharacterModule(characterId) {
        try {
            const characterModule = await import('./stella.js');
            this.currentPlayer = characterModule.stella;
            
            this.currentPlayer.hunger = this.needs.hunger;
            this.currentPlayer.thirst = this.needs.thirst;
            this.currentPlayer.energy = this.needs.energy;
            
            const { getInitialPlayerPosition } = await import('../theWorld.js');
            const initialPos = getInitialPlayerPosition();
            this.currentPlayer.x = initialPos.x;
            this.currentPlayer.y = initialPos.y;
            
            this.updateFunction = characterModule.updateStella;
            this.drawFunction = characterModule.drawStella;
        } catch (error) {
            this.loadStellaAsFallback();
        }
        
        this.dispatchPlayerReady();
    }

    /**
     * Loads Stella as fallback character when requested character unavailable
     * @returns {Promise<void>}
     */
    async loadStellaAsFallback() {
        try {
            const module = await import('./stella.js');
            this.currentPlayer = module.stella;

            this.currentPlayer.hunger = this.needs.hunger;
            this.currentPlayer.thirst = this.needs.thirst;
            this.currentPlayer.energy = this.needs.energy;

            const { getInitialPlayerPosition } = await import('../theWorld.js');
            const initialPos = getInitialPlayerPosition();
            this.currentPlayer.x = initialPos.x;
            this.currentPlayer.y = initialPos.y;

            this.updateFunction = module.updateStella;
            this.drawFunction = module.drawStella;
        } catch (error) {
            this.createBasicPlayer();
        }
        
        this.dispatchPlayerReady();
    }

    /**
     * Dispatches playerReady event with player data
     * @returns {void}
     */
    dispatchPlayerReady() {
        const event = new CustomEvent('playerReady', {
            detail: { 
                player: this.currentPlayer,
                updateFunction: this.updateFunction,
                drawFunction: this.drawFunction,
                character: this.activeCharacter 
            }
        });
        document.dispatchEvent(event);
        
        this.dispatchNeedsUpdate();
    }

    /**
     * Creates a basic placeholder player when character loading fails
     * @returns {void}
     */
    createBasicPlayer() {
        this.currentPlayer = {
            x: 400,
            y: 300,
            width: 32,
            height: 32,
            speed: 5,
            hunger: this.needs.hunger,
            thirst: this.needs.thirst,
            energy: this.needs.energy,
            draw: function(ctx) {
                ctx.fillStyle = 'red';
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        };
    }

    /** @returns {Object|null} Current player entity */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /** @returns {Function|null} Character update function */
    getUpdateFunction() {
        return this.updateFunction;
    }

    /** @returns {Function|null} Character draw function */
    getDrawFunction() {
        return this.drawFunction;
    }

    /**
     * Limpa todos os event listeners e recursos do sistema
     * Remove todos os listeners e para os intervals de needs e sleep
     * @returns {void}
     */
    destroy() {
        // Remove todos os event listeners
        this.abortController.abort();

        // Reset AbortController para permitir re-inicialização
        this.abortController = new AbortController();

        // Clear interval de atualização de needs
        if (this.needsUpdateInterval) {
            clearInterval(this.needsUpdateInterval);
            this.needsUpdateInterval = null;
        }

        // Clear sleep interval se estiver ativo
        if (this.sleepInterval) {
            clearInterval(this.sleepInterval);
            this.sleepInterval = null;
        }
    }
}

export const playerSystem = new PlayerSystem(); 