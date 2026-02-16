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

    createUI() {
        this.container = document.createElement('div');
        this.container.className = 'chs-character-selection';
        this.container.innerHTML = `
            <div class="chs-character-selection-header">
                <h1>${t('characterSelection.title')}</h1>
                <p>${t('characterSelection.subtitle')}</p>
            </div>
            <div class="chs-characters-grid"></div>
            <div class="chs-character-details" style="display: none;">
                <div class="chs-character-portrait-large">
                    <img class="chs-character-portrait-img" src="" alt="">
                </div>
                <h2 class="chs-character-name"></h2>
                <p class="chs-character-description"></p>

                <button class="chs-start-game-btn">${t('characterSelection.startGame')}</button>
            </div>
            <div class="chs-load-game-section">
                <h2>${t('characterSelection.continueAdventure')}</h2>
                <button class="chs-load-game-btn">${t('characterSelection.loadGame')}</button>
            </div>
        `;

        const charactersGrid = this.container.querySelector('.chs-characters-grid');

        this.characters.forEach(character => {
            const characterCard = document.createElement('div');
            characterCard.className = 'chs-character-card';
            characterCard.dataset.characterId = character.id;

            characterCard.innerHTML = `
                <div class="chs-character-portrait">
                    <img src="${character.portrait}" alt="${character.name}">
                </div>
                <h3>${character.name}</h3>
                <p>${this.getCharacterSubtitle(character.id)}</p>
                <div class="chs-character-traits">${this.getCharacterTraits(character.id)}</div>
            `;

            charactersGrid.appendChild(characterCard);
        });

        document.body.appendChild(this.container);
    }

    getCharacterSubtitle(characterId) {
        return t(`characterSelection.subtitles.${characterId}`) || t('characterSelection.subtitles.default');
    }

    getCharacterTraits(characterId) {
        const traits = {
            stella: '',
            ben: '',
            graham: ''
        };
        return traits[characterId] || '';
    }

    bindEvents() {
        this.container.querySelectorAll('.chs-character-card').forEach(card => {
            card.addEventListener('click', () => {
                const characterId = card.dataset.characterId;

                this.container.querySelectorAll('.chs-character-card').forEach(c => {
                    c.classList.remove('selected');
                });
                card.classList.add('selected');

                this.selectCharacter(characterId);
            });
        });

        this.container.querySelector('.chs-start-game-btn').addEventListener('click', () => {
            if (this.selectedCharacter) {
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
