/**
 * @file dialogueSystem.js - Sistema de diálogo estilo Visual Novel
 * @description Exibe cutscenes/diálogos com portraits dos personagens,
 * caixa de texto com efeito typewriter, pausa o jogo durante o diálogo.
 * Suporta escolhas do jogador e callbacks por linha.
 *
 * Uso:
 *   import { dialogueSystem } from './dialogueSystem.js';
 *
 *   dialogueSystem.start({
 *     left:  { name: 'Stella', portrait: 'assets/character/portrait/Stella_portrait.webp' },
 *     right: { name: 'Ben',    portrait: 'assets/character/portrait/Ben_portrait.webp' },
 *     lines: [
 *       { side: 'left',  text: 'Oi, tudo bem?' },
 *       { side: 'right', text: 'Tudo sim!' },
 *       { side: 'right', text: 'Aceita ajudar?', type: 'choice', options: [
 *           { text: 'Sim!', value: 'yes', next: 3 },
 *           { text: 'Não...', value: 'no', next: 5 },
 *       ]},
 *       { side: 'left', text: 'Claro!' },
 *     ],
 *     onEnd: () => { console.log('Diálogo acabou'); }
 *   });
 *
 * Line types:
 *   - normal:  { side, text }
 *   - choice:  { side, text, type: 'choice', options: [{ text, value, next?, onSelect? }] }
 *   - action:  { side, text, action: () => {} }  (runs callback when line is shown)
 *   - thought: { side, text, thought: true }  (italic/different style)
 *
 * Special line fields:
 *   - setPortrait: { side: 'right', src: 'new_image.png' }  (changes portrait mid-dialogue)
 *   - next: number  (jump to specific line index after this line)
 *   - end: true  (end dialogue after this line)
 *
 * @module DialogueSystem
 */

import { registerSystem } from './gameState.js';
import { i18n } from './i18n/i18n.js';
import { logger } from './logger.js';

// ─── Config ─────────────────────────────────────────────────────────────────

const TYPEWRITER_SPEED = 35;  // ms por caractere

// ─── State ──────────────────────────────────────────────────────────────────

let isActive = false;
let currentConfig = null;
let currentLineIndex = 0;
let typewriterTimer = null;
let isTyping = false;
let fullTextRevealed = false;
let waitingForChoice = false;
let choiceCallback = null;

// DOM refs
let overlay = null;
let leftPortrait = null;
let rightPortrait = null;
let leftName = null;
let rightName = null;
let speakerEl = null;
let textEl = null;
let nextHint = null;
let choicesContainer = null;
let dialogBox = null;

// ─── DOM creation ───────────────────────────────────────────────────────────

function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';

    // Portraits area
    const portraitsArea = document.createElement('div');
    portraitsArea.className = 'dlg-portraits';

    // Left portrait
    const leftCard = document.createElement('div');
    leftCard.className = 'dlg-portrait dlg-portrait-left';
    const leftImg = document.createElement('img');
    leftImg.alt = '';
    leftName = document.createElement('div');
    leftName.className = 'dlg-portrait-name';
    leftCard.append(leftImg, leftName);
    leftPortrait = leftCard;

    // Right portrait
    const rightCard = document.createElement('div');
    rightCard.className = 'dlg-portrait dlg-portrait-right';
    const rightImg = document.createElement('img');
    rightImg.alt = '';
    rightName = document.createElement('div');
    rightName.className = 'dlg-portrait-name';
    rightCard.append(rightImg, rightName);
    rightPortrait = rightCard;

    portraitsArea.append(leftCard, rightCard);

    // Dialogue box
    dialogBox = document.createElement('div');
    dialogBox.className = 'dlg-box';

    speakerEl = document.createElement('div');
    speakerEl.className = 'dlg-speaker';

    textEl = document.createElement('div');
    textEl.className = 'dlg-text';

    choicesContainer = document.createElement('div');
    choicesContainer.className = 'dlg-choices';

    nextHint = document.createElement('div');
    nextHint.className = 'dlg-next-hint';
    nextHint.textContent = i18n.t('dialogue.advanceHint') + ' ';
    const arrow = document.createElement('span');
    arrow.className = 'dlg-arrow';
    arrow.textContent = '▼';
    nextHint.appendChild(arrow);

    dialogBox.append(speakerEl, textEl, choicesContainer, nextHint);

    overlay.append(portraitsArea, dialogBox);
    document.body.appendChild(overlay);

    // Event listeners
    dialogBox.addEventListener('click', onAdvance);
    document.addEventListener('keydown', onKeyDown);
}

function destroyOverlay() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
    overlay = null;
    leftPortrait = null;
    rightPortrait = null;
    leftName = null;
    rightName = null;
    speakerEl = null;
    textEl = null;
    nextHint = null;
    choicesContainer = null;
    dialogBox = null;
}

// ─── Game pause/resume ──────────────────────────────────────────────────────

function pauseGame() {
    document.dispatchEvent(new CustomEvent('game:pause'));
}

function resumeGame() {
    document.dispatchEvent(new CustomEvent('game:resume'));
}

// ─── Typewriter ─────────────────────────────────────────────────────────────

function typeText(text, speed = TYPEWRITER_SPEED) {
    clearTypewriter();
    isTyping = true;
    fullTextRevealed = false;
    nextHint.classList.remove('visible');
    textEl.textContent = '';

    // Choice/action lines may omit text — guard against undefined.
    const safeText = typeof text === 'string' ? text : '';
    let charIndex = 0;

    function tick() {
        if (charIndex < safeText.length) {
            textEl.textContent = safeText.substring(0, charIndex + 1);
            charIndex++;
            typewriterTimer = setTimeout(tick, speed);
        } else {
            finishTyping();
        }
    }

    if (safeText.length === 0) {
        textEl.textContent = '';
        finishTyping();
        return;
    }

    tick();
}

function revealFullText() {
    clearTypewriter();
    const line = currentConfig.lines[currentLineIndex];
    if (line) {
        textEl.textContent = line.text;
    }
    finishTyping();
}

function finishTyping() {
    isTyping = false;
    fullTextRevealed = true;

    const line = currentConfig.lines[currentLineIndex];

    // If this is a choice line, show choices instead of cursor
    if (line?.type === 'choice' && line.options) {
        showChoices(line.options);
        return;
    }

    // Add blinking cursor
    const cursor = document.createElement('span');
    cursor.className = 'dlg-cursor';
    textEl.appendChild(cursor);

    nextHint.classList.add('visible');
}

function clearTypewriter() {
    if (typewriterTimer) {
        clearTimeout(typewriterTimer);
        typewriterTimer = null;
    }
}

// ─── Choices ────────────────────────────────────────────────────────────────

function showChoices(options) {
    waitingForChoice = true;
    choicesContainer.innerHTML = '';
    nextHint.classList.remove('visible');

    for (const opt of options) {
        const btn = document.createElement('button');
        btn.className = 'dlg-choice-btn';
        btn.textContent = opt.text;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectChoice(opt);
        });
        choicesContainer.appendChild(btn);
    }
}

function hideChoices() {
    waitingForChoice = false;
    if (choicesContainer) {
        choicesContainer.innerHTML = '';
    }
}

function selectChoice(option) {
    hideChoices();

    // Run onSelect callback if provided
    if (option.onSelect) {
        option.onSelect(option.value);
    }

    // Determine next line
    if (option.end) {
        end();
        return;
    }

    if (typeof option.next === 'number') {
        showLine(option.next);
    } else {
        // Default: advance to next line
        showLine(currentLineIndex + 1);
    }
}

// ─── Line display ───────────────────────────────────────────────────────────

function showLine(index) {
    if (!currentConfig || index >= currentConfig.lines.length) {
        end();
        return;
    }

    currentLineIndex = index;
    const line = currentConfig.lines[index];

    hideChoices();

    // Handle portrait change mid-dialogue
    if (line.setPortrait) {
        const { side, src } = line.setPortrait;
        const portrait = side === 'left' ? leftPortrait : rightPortrait;
        const img = portrait.querySelector('img');
        if (img) img.src = src;
    }

    // Update active portrait
    const isLeft = line.side === 'left';
    leftPortrait.classList.toggle('active', isLeft);
    rightPortrait.classList.toggle('active', !isLeft);

    // Update speaker name
    const speaker = isLeft ? currentConfig.left : currentConfig.right;
    speakerEl.textContent = speaker.name;

    // Texto mostrado: se a linha tiver asteriscos *...* significa
    // ação/pensamento/sussurro — renderiza em itálico cinza e remove
    // os asteriscos para não poluir. Linhas marcadas com `thought: true`
    // continuam funcionando como antes.
    const rawText = typeof line.text === 'string' ? line.text : '';
    const hasAsteriskAction = /\*[^*]+\*/.test(rawText);
    const cleanText = hasAsteriskAction ? rawText.replace(/\*/g, '') : rawText;

    textEl.classList.toggle('dlg-thought', !!line.thought || hasAsteriskAction);

    // Run action callback if provided
    if (line.action) {
        line.action();
    }

    // Typewrite the text
    typeText(cleanText);
}

// ─── Input handling ─────────────────────────────────────────────────────────

function onAdvance(e) {
    if (!isActive) return;

    // Don't advance if waiting for choice
    if (waitingForChoice) return;

    if (isTyping) {
        revealFullText();
        return;
    }

    if (fullTextRevealed) {
        const line = currentConfig.lines[currentLineIndex];

        // Check if line wants to end dialogue
        if (line?.end) {
            end();
            return;
        }

        // Check if line has explicit next
        if (typeof line?.next === 'number') {
            showLine(line.next);
            return;
        }

        showLine(currentLineIndex + 1);
    }
}

function onKeyDown(e) {
    if (!isActive) return;

    // Block all game keys while dialogue is active
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        e.stopPropagation();

        // Don't advance via keyboard if waiting for choice
        if (waitingForChoice) return;

        onAdvance(e);
    }

    // Allow Escape to skip? No — user should experience the dialogue.
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Inicia um diálogo.
 * @param {Object} config
 * @param {Object} config.left   - { name: string, portrait: string (path to image) }
 * @param {Object} config.right  - { name: string, portrait: string (path to image) }
 * @param {Array}  config.lines  - Array of line objects (see module doc)
 * @param {Function} [config.onEnd] - Callback when dialogue ends
 */
function start(config) {
    if (isActive) {
        logger.warn('[DialogueSystem] Already active, ignoring start()');
        return;
    }

    if (!config.lines || config.lines.length === 0) {
        logger.warn('[DialogueSystem] No lines provided');
        return;
    }

    currentConfig = config;
    currentLineIndex = 0;
    isActive = true;
    waitingForChoice = false;

    // Pause game
    pauseGame();

    // Build UI
    createOverlay();

    // Set portraits
    const leftImg = leftPortrait.querySelector('img');
    const rightImg = rightPortrait.querySelector('img');

    if (config.left?.portrait) {
        leftImg.src = config.left.portrait;
        leftImg.alt = config.left.name;
        leftPortrait.style.display = '';
    } else {
        leftPortrait.style.display = 'none';
    }

    if (config.right?.portrait) {
        rightImg.src = config.right.portrait;
        rightImg.alt = config.right.name;
        rightPortrait.style.display = '';
    } else {
        rightPortrait.style.display = 'none';
    }

    leftName.textContent = config.left?.name || '';
    rightName.textContent = config.right?.name || '';

    // Activate overlay
    requestAnimationFrame(() => {
        overlay.classList.add('active');
        showLine(0);
    });

    logger.info('[DialogueSystem] Dialogue started with', config.lines.length, 'lines');
}

/**
 * Encerra o diálogo atual.
 */
function end() {
    if (!isActive) return;

    clearTypewriter();
    hideChoices();
    isActive = false;

    // Fade out
    if (overlay) {
        overlay.classList.remove('active');
    }

    // Cleanup after transition
    setTimeout(() => {
        destroyOverlay();
        resumeGame();

        if (currentConfig?.onEnd) {
            currentConfig.onEnd();
        }

        currentConfig = null;
        currentLineIndex = 0;
        isTyping = false;
        fullTextRevealed = false;
        waitingForChoice = false;

        logger.info('[DialogueSystem] Dialogue ended');
    }, 400);
}

/**
 * Retorna true se um diálogo está ativo.
 */
function isDialogueActive() {
    return isActive;
}

// ─── Register system ────────────────────────────────────────────────────────

const dialogueAPI = {
    start,
    end,
    isDialogueActive,
};

registerSystem('dialogue', dialogueAPI);

export { dialogueAPI as dialogueSystem };
export default dialogueAPI;
