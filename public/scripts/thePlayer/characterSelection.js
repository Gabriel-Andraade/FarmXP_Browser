import { playerSystem } from "./playerSystem.js";
import { logger } from "../logger.js";
import { t } from '../i18n/i18n.js';

export class CharacterSelection {
    constructor() {
        this.container = null;
        this.selectedCharacter = null;
        this._loadingInProgress = false;
        this.characters = [
            {
                id: "stella",
                name: "Stella",
                portrait: "./assets/character/portrait/Stella_portrait.webp",
            },
            {
                id: "ben",
                name: "Ben",
                portrait: "./assets/character/portrait/Ben_portrait.webp",
            },
            {
                id: "graham",
                name: "Graham",
                portrait: "./assets/character/portrait/Graham_portrait.webp",
            }
        ];

        this.init();
    }

    init() {
        this.createUI();
        this.bindEvents();
    }

    // fix: innerHTML → DOM API
    createUI() {
        this.container = document.createElement('div');
        this.container.className = 'chs-character-selection';
        const headerDiv = document.createElement('div');
        headerDiv.className = 'chs-character-selection-header';
        const h1 = document.createElement('h1');
        h1.textContent = t('characterSelection.title');
        const subtitle = document.createElement('p');
        subtitle.textContent = t('characterSelection.subtitle');
        headerDiv.append(h1, subtitle);

        const gridDiv = document.createElement('div');
        gridDiv.className = 'chs-characters-grid';

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'chs-character-details';
        detailsDiv.style.display = 'none';
        const portraitLarge = document.createElement('div');
        portraitLarge.className = 'chs-character-portrait-large';
        const portraitImg = document.createElement('img');
        portraitImg.className = 'chs-character-portrait-img';
        portraitImg.src = '';
        portraitImg.alt = '';
        portraitLarge.appendChild(portraitImg);
        const charName = document.createElement('h2');
        charName.className = 'chs-character-name';
        const charDesc = document.createElement('p');
        charDesc.className = 'chs-character-description';
        const startBtn = document.createElement('button');
        startBtn.className = 'chs-start-game-btn';
        startBtn.textContent = t('characterSelection.startGame');
        detailsDiv.append(portraitLarge, charName, charDesc, startBtn);

        const loadSection = document.createElement('div');
        loadSection.className = 'chs-load-game-section';
        const loadH2 = document.createElement('h2');
        loadH2.textContent = t('characterSelection.continueAdventure');
        const loadBtn = document.createElement('button');
        loadBtn.className = 'chs-load-game-btn';
        loadBtn.textContent = t('characterSelection.loadGame');
        loadSection.append(loadH2, loadBtn);

        this.container.append(headerDiv, gridDiv, detailsDiv, loadSection);

        const charactersGrid = this.container.querySelector('.chs-characters-grid');

        this.characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'chs-character-card';
            characterCard.dataset.characterId = character.id;

            const portrait = document.createElement('div');
            portrait.className = 'chs-character-portrait';
            const img = document.createElement('img');
            img.src = character.portrait;
            img.alt = character.name;
            portrait.appendChild(img);
            const nameH3 = document.createElement('h3');
            nameH3.textContent = character.name;
            const subtitleP = document.createElement('p');
            subtitleP.textContent = this.getCharacterSubtitle(character.id);
            characterCard.append(portrait, nameH3, subtitleP);
            if (character.id !== "stella") {
                const warning = document.createElement('div');
                warning.className = 'chs-character-warning';
                warning.textContent = t('characterSelection.inDevelopment');
                characterCard.appendChild(warning);
            }

            charactersGrid.appendChild(characterCard);
        });

        document.body.appendChild(this.container);
    }

    getCharacterSubtitle(characterId) {
        return t(`characterSelection.subtitles.${characterId}`) || t('characterSelection.subtitles.default');
    }

    bindEvents() {
        this.container.querySelectorAll('.chs-character-card').forEach(card => {
            card.addEventListener('click', () => {
                const characterId = card.dataset.characterId;

                if (characterId !== "stella") {
                    this.showWarning(t('characterSelection.onlyStellaAvailable'));
                    return;
                }

                this.container.querySelectorAll('.chs-character-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');

                this.selectCharacter(characterId);
            });
        });

        this.container.querySelector('.chs-start-game-btn').addEventListener('click', () => {
            if (this.selectedCharacter) {
                if (this.selectedCharacter.id !== "stella") {
                    this.showWarning(t('characterSelection.selectStellaToPlay'));
                    return;
                }
                this.startGame();
            } else {
                this.showWarning(t('characterSelection.selectCharacterFirst'));
            }
        });

        this.container.querySelector('.chs-load-game-btn').addEventListener('click', () => {
            this.loadGame();
        });
    }

    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    /**
     * Exibe uma mensagem de aviso temporária
     * CSS carregado externamente via style/character-select.css
     */
    showWarning(message) {
        const existingWarning = document.querySelector('.chs-character-warning-message');
        if (existingWarning) existingWarning.remove();

        const warning = document.createElement('div');
        warning.className = 'chs-character-warning-message';
        warning.textContent = message;

        document.body.appendChild(warning);

        setTimeout(() => {
            if (warning.parentNode) warning.parentNode.removeChild(warning);
        }, 4000);
    }

    selectCharacter(characterId) {
        this.selectedCharacter = this.characters.find(c => c.id === characterId);

        const detailsSection = this.container.querySelector('.chs-character-details');
        detailsSection.style.display = 'block';

        detailsSection.querySelector('.chs-character-portrait-img').src = this.selectedCharacter.portrait;
        detailsSection.querySelector('.chs-character-name').textContent = this.selectedCharacter.name;
        detailsSection.querySelector('.chs-character-description').textContent = t(`characterSelection.descriptions.${this.selectedCharacter.id}`);

        this.updatePlayerInfo();
    }

    startGame() {
        this.container.style.display = 'none';

        if (this.selectedCharacter.id !== "stella") {
            this.showWarning(t('characterSelection.redirecting'));
            this.selectedCharacter = this.characters.find(c => c.id === "stella");
        }

        playerSystem.setActiveCharacter(this.selectedCharacter);

        document.dispatchEvent(new CustomEvent('characterSelected', {
            detail: { character: this.selectedCharacter }
        }));
    }

    async loadGame() {
        if (this._loadingInProgress) return;
        this._loadingInProgress = true;

        try {
            const saveModule = await import('../saveSystem.js');
            const saveSystem = saveModule.saveSystem;

            if (!saveSystem.hasAnySave()) {
                this.showWarning(t('characterSelection.noSavesFound'));
                return;
            }

            const uiModule = await import('../saveSlotsUI.js');
            const saveSlotsUI = uiModule.saveSlotsUI;

            // Abrir UI de slots em modo load, com callback para startup
            saveSlotsUI.open('load', (slot, slotIndex) => {
                // Guardar dados para aplicar depois que todos os sistemas carregarem
                window._pendingSaveData = slot;

                // Usar personagem do save (ou Stella como fallback)
                const charId = slot?.data?.player?.characterId || 'stella';
                this.selectedCharacter = this.characters.find(c => c.id === charId) || this.characters[0];

                // Iniciar fluxo normal de carregamento do jogo
                this.startGame();
            });
        } catch (e) {
            this.showWarning(t('characterSelection.saveSystemError'));
            logger.error('CharacterSelection:loadGame', e);
        } finally {
            // Guard reset: protege apenas contra imports concorrentes.
            // O fluxo do jogo continua dentro do callback de saveSlotsUI.open().
            this._loadingInProgress = false;
        }
    }
}
