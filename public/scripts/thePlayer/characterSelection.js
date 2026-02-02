import { playerSystem } from "./playerSystem.js";
import { t } from '../i18n/i18n.js';

export class CharacterSelection {
    constructor() {
        this.container = null;
        this.selectedCharacter = null;
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
                ${character.id !== "stella" ? `<div class="chs-character-warning">${t('characterSelection.inDevelopment')}</div>` : ''}
            `;

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

    showWarning(message) {
        const existingWarning = document.querySelector('.chs-character-warning-message');
        if (existingWarning) existingWarning.remove();

        const warning = document.createElement('div');
        warning.className = 'chs-character-warning-message';
        warning.textContent = message;
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10001;
        `;

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
            this.showWarning(t('characterSelection.redirecting'));
            this.selectedCharacter = this.characters.find(c => c.id === "stella");
        }

        playerSystem.setActiveCharacter(this.selectedCharacter);

        document.dispatchEvent(new CustomEvent('characterSelected', {
            detail: { character: this.selectedCharacter }
        }));
    }

    loadGame() {
        this.showWarning(t('characterSelection.saveNotAvailable'));
        if (!this.selectedCharacter) {
            this.selectedCharacter = this.characters.find(c => c.id === "stella");
        }
        this.startGame();
    }
}
