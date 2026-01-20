
export class PlayerSystem {
    constructor() {
        this.activeCharacter = null;
        this.currentPlayer = null;
        this.updateFunction = null;
        this.drawFunction = null;
        this.equippedItem = null;

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

    setupEventListeners() {
        document.addEventListener('equipItemRequest', (e) => {
            this.equipItem(e.detail.item);
        });

        document.addEventListener('unequipItemRequest', () => {
            this.unequipItem();
        });

        document.addEventListener('discardItemRequest', (e) => {
            const { itemId } = e.detail;
            if (this.equippedItem && this.equippedItem.id === itemId) {
                this.unequipItem();
            }
        });

        document.addEventListener('startConsumptionRequest', (e) => {
            const { category, itemId, quantity, item, fillUp } = e.detail;
            this.consumeItem(item);
            
            document.dispatchEvent(new CustomEvent('removeItemAfterConsumption', {
                detail: { category, itemId, quantity }
            }));
        });

        document.addEventListener('itemConsumed', (e) => {
            const item = e.detail.item;
            this.consumeItem(item);
        });
    }

    setupActionListeners() {
        document.addEventListener('playerMoved', (e) => {
            if (e.detail && e.detail.distance) {
                this.consumeNeeds('moving', e.detail.distance / 100);
            }
        });

        document.addEventListener('toolUsedOnObject', (e) => {
            this.consumeNeeds('breaking', 1);
        });

        document.addEventListener('itemCollected', (e) => {
            this.consumeNeeds('collecting', 1);
        });

        document.addEventListener('buildingPlaced', (e) => {
            this.consumeNeeds('building', 1);
        });

        document.addEventListener('sleepStarted', () => {
            this.startSleep();
        });

        document.addEventListener('sleepEnded', () => {
            this.endSleep();
        });

        document.addEventListener('consumeFood', (e) => {
            this.restoreNeeds(e.detail.hunger || 0, e.detail.thirst || 0, e.detail.energy || 0);
        });
    }

    startNeedsUpdate() {
        setInterval(() => {
            this.updateNeeds();
        }, 2000);
    }

    updateNeeds() {
        const now = Date.now();
        const deltaTime = (now - this.needs.lastUpdate) / 1000;
        
        this.consumeNeeds('idle', deltaTime);
        
        this.needs.lastUpdate = now;
        this.dispatchNeedsUpdate();
    }

    consumeNeeds(actionType, multiplier = 1) {
        if (!this.needs.consumptionRates[actionType]) return;

        const rates = this.needs.consumptionRates[actionType];
        
        this.needs.hunger = Math.max(0, this.needs.hunger - (rates.hunger * multiplier));
        this.needs.thirst = Math.max(0, this.needs.thirst - (rates.thirst * multiplier));
        
        this.needs.energy = Math.max(0, Math.min(100, 
            this.needs.energy - (rates.energy * multiplier)));
        
        this.dispatchNeedsUpdate();
        this.checkCriticalNeeds();
    }

    restoreNeeds(hunger, thirst, energy) {
        this.needs.hunger = Math.min(100, this.needs.hunger + hunger);
        this.needs.thirst = Math.min(100, this.needs.thirst + thirst);
        this.needs.energy = Math.min(100, this.needs.energy + energy);
        
        this.dispatchNeedsUpdate();
        
        if (hunger > 0 || thirst > 0 || energy > 0) {
            this.showNeedRestoredFeedback(hunger, thirst, energy);
        }
    }

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

    startSleep() {
        this.currentPlayer.isSleeping = true;
        
        const sleepInterval = setInterval(() => {
            if (this.needs.energy < 100) {
                this.needs.energy = Math.min(100, this.needs.energy + 10);
                this.dispatchNeedsUpdate();
                
                if (this.needs.energy >= 100) {
                    clearInterval(sleepInterval);
                    this.endSleep();
                }
            }
        }, 1000);
    }

    endSleep() {
        this.currentPlayer.isSleeping = false;
        this.needs.energy = 100;
        this.dispatchNeedsUpdate();
        
        document.dispatchEvent(new CustomEvent('sleepCompleted'));
    }

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

    getHunger() { return Math.round(this.needs.hunger); }
    getThirst() { return Math.round(this.needs.thirst); }
    getEnergy() { return Math.round(this.needs.energy); }
    getNeeds() { 
        return {
            hunger: this.getHunger(),
            thirst: this.getThirst(),
            energy: this.getEnergy()
        };
    }

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

    unequipItem() {
        if (this.equippedItem) {
            this.equippedItem = null;
            
            document.dispatchEvent(new CustomEvent('itemUnequipped'));
            return true;
        }
        return false;
    }

    hasEquippedItem() {
        return this.equippedItem !== null;
    }

    getEquippedItem() {
        return this.equippedItem;
    }

    setActiveCharacter(characterData) {
        this.activeCharacter = characterData;
        this.loadCharacterModule(characterData.id);
    }

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

    getCurrentPlayer() {
        return this.currentPlayer;
    }
    
    getUpdateFunction() {
        return this.updateFunction;
    }
    
    getDrawFunction() {
        return this.drawFunction;
    }
}

export const playerSystem = new PlayerSystem(); 