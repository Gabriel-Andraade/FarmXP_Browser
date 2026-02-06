import { playerSystem } from "./playerSystem.js";
import { logger } from "../logger.js";

export class CharacterSelection {
    constructor() {
        this.container = null;
        this.selectedCharacter = null;
        this._loadingInProgress = false;
        this.characters = [
            {
                id: "stella",
                name: "Stella",
                description: "Adventurous and courageous, Stella grew up on the family farm and knows all the secrets of rural life.",
                portrait: "./assets/character/portrait/Stella_portrait.webp",
            },
            {
                id: "ben",
                name: "Ben",
                description: "A small guy with big brain! The technician for the computers in the fields.",
                portrait: "./assets/character/portrait/Ben_portrait.webp",
            },
            {
                id: "graham",
                name: "Graham",
                description: "A big guy, fearless, serious and protective man, the best for field work.",
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
                <h1>FarmingXP</h1>
                <p>Selecione seu personagem para começar</p>
            </div>
            <div class="chs-characters-grid"></div>
            <div class="chs-character-details" style="display: none;">
                <div class="chs-character-portrait-large">
                    <img class="chs-character-portrait-img" src="" alt="">
                </div>
                <h2 class="chs-character-name"></h2>
                <p class="chs-character-description"></p>

                <button class="chs-start-game-btn">Iniciar Jogo</button>
            </div>
            <div class="chs-load-game-section">
                <h2>Ou continue sua aventura</h2>
                <button class="chs-load-game-btn">Carregar Jogo Salvo</button>
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
                ${character.id !== "stella" ? '<div class="chs-character-warning">🚧 Em Desenvolvimento</div>' : ''}
            `;

            charactersGrid.appendChild(characterCard);
        });

        document.body.appendChild(this.container);
    }

    getCharacterSubtitle(characterId) {
        const subtitles = {
            "stella": "A jovem fazendeira",
            "ben": "O fazendeiro esperto",
            "graham": "O braço da agricultura"
        };
        return subtitles[characterId] || "Fazendeiro";
    }

    bindEvents() {
        this.container.querySelectorAll('.chs-character-card').forEach(card => {
            card.addEventListener('click', () => {
                const characterId = card.dataset.characterId;

                if (characterId !== "stella") {
                    this.showWarning("🚧 Apenas a Stella está disponível no momento!");
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
                    this.showWarning("Selecione a Stella para jogar.");
                    return;
                }
                this.startGame();
            } else {
                this.showWarning('Por favor, selecione um personagem primeiro.');
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
        detailsSection.querySelector('.chs-character-description').textContent = this.selectedCharacter.description;

        this.updatePlayerInfo();
    }

    startGame() {
        this.container.style.display = 'none';

        if (this.selectedCharacter.id !== "stella") {
            this.showWarning("Apenas a Stella está disponível. Redirecionando...");
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
                this.showWarning('Nenhum save encontrado. Selecione um personagem para começar.');
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
            this.showWarning('Erro ao acessar sistema de saves.');
            logger.error('CharacterSelection:loadGame', e);
        } finally {
            this._loadingInProgress = false;
        }
    }
}
