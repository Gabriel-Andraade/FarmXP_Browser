/**
 * @file playerSystem.js - Core player management system
 * @description Manages player state including needs (hunger, thirst, energy),
 * equipment, character loading, and survival mechanics. Central hub for
 * player-related events and state synchronization.
 * @module PlayerSystem
 */

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
            hunger: 100,
            thirst: 100,
            energy: 100,
            lastUpdate: Date.now(),
            
            criticalFlags: {
                hungerCritical: false,
                thirstCritical: false,
                energyCritical: false
            },
            
            consumptionRates: {
                moving: { hunger: 0.5, thirst: 0.7, energy: 1.0 },
                breaking: { hunger: 1.0, thirst: 1.5, energy: 2.0 },
                building: { hunger: 0.8, thirst: 1.0, energy: 1.5 },
                collecting: { hunger: 0.3, thirst: 0.4, energy: 0.5 },
                idle: { hunger: 0.05, thirst: 0.1, energy: -0.5 }
            },
            
            criticalLevels: {
                hunger: 10,
                thirst: 10,
                energy: 15
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
        }, 2000);
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

        // ✅ Validar multiplier (0-10 é range razoável)
        const validMultiplier = validateRange(multiplier, 0, 10);

        const rates = this.needs.consumptionRates[actionType];

        // ✅ Aplicar com validação (clamps to 0-100)
        this.needs.hunger = validateRange(
            this.needs.hunger - (rates.hunger * validMultiplier),
            MIN_NEED,
            MAX_NEED
        );

        this.needs.thirst = validateRange(
            this.needs.thirst - (rates.thirst * validMultiplier),
            MIN_NEED,
            MAX_NEED
        );

        this.needs.energy = validateRange(
            this.needs.energy - (rates.energy * validMultiplier),
            MIN_NEED,
            MAX_NEED
        );

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
    restoreNeeds(hunger = 0, thirst = 0, energy = 0) {
        // Validate and coerce deltas to numbers
        const validHunger = typeof hunger === 'number' && Number.isFinite(hunger) ? hunger : 0;
        const validThirst = typeof thirst === 'number' && Number.isFinite(thirst) ? thirst : 0;
        const validEnergy = typeof energy === 'number' && Number.isFinite(energy) ? energy : 0;

        if (validHunger !== 0) {
            this.needs.hunger = validateRange(
                this.needs.hunger + validHunger,
                MIN_NEED,
                MAX_NEED
            );
        }

        if (validThirst !== 0) {
            this.needs.thirst = validateRange(
                this.needs.thirst + validThirst,
                MIN_NEED,
                MAX_NEED
            );
        }

        if (validEnergy !== 0) {
            this.needs.energy = validateRange(
                this.needs.energy + validEnergy,
                MIN_NEED,
                MAX_NEED
            );
        }

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
        
        const criticalMultiplier = lowestNeed <= 20 ? 0.3 : 0.7;
        
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
        
        // Clear any existing sleep interval to avoid duplicates
        if (this.sleepInterval) {
            clearInterval(this.sleepInterval);
            this.sleepInterval = null;
        }
        
        this.sleepInterval = setInterval(() => {
            if (this.needs.energy < 100) {
                this.needs.energy = Math.min(100, this.needs.energy + 10);
                this.dispatchNeedsUpdate();
                
                if (this.needs.energy >= 100) {
                    clearInterval(this.sleepInterval);
                    this.sleepInterval = null;
                    this.endSleep();
                }
            }
        }, 1000);
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
        this.needs.energy = 100;
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
                        thirstRestore = 20;
                        energyRestore = 5;
                    } else {
                        hungerRestore = 20;
                        energyRestore = 10;
                    }
                    break;
                case 'water':
                    thirstRestore = 30;
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
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 200, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 24px;
            z-index: 10000;
            animation: fadeUp 1.5s ease-out forwards;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeUp {
                0% { opacity: 1; transform: translate(-50%, -50%); }
                100% { opacity: 0; transform: translate(-50%, -150%); }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.remove();
            style.remove();
        }, 1500);
    }

    /**
     * Calculates player efficiency multiplier based on current needs
     * @returns {number} Multiplier between 0.3 and 1.0
     */
    getEfficiencyMultiplier() {
        const avgNeeds = (this.needs.hunger + this.needs.thirst + this.needs.energy) / 300;
        
        const hasCritical = this.needs.hunger <= 20 || 
                           this.needs.thirst <= 20 || 
                           this.needs.energy <= 20;
        
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