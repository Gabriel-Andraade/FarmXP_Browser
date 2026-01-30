/**
 * @file animalAI.js - Sistema de Inteligência Artificial para Animais
 * Implementa comportamento autônomo com estados de movimento e idle
 * Gerencia colisões, animações e navegação pelo mundo
 */

import { logger } from '../logger.js';
import { collisionSystem } from "../collisionSystem.js";
import { IDLE_STATE_MIN_MS, IDLE_STATE_MAX_MS, MOVE_STATE_MIN_MS, MOVE_STATE_MAX_MS, MOVEMENT, ANIMATION, RANGES } from '../constants.js';

// =========================================================
// CONFIGURAÇÃO DA IA
// =========================================================

/**
 * Estados possíveis da máquina de estados do animal
 * @enum {string}
 */
const AnimalState = {
    IDLE: "idle",
    MOVE: "move"
};

// =========================================================
// CLASSE UNIVERSAL DE ANIMAL
// =========================================================

/**
 * Entidade de animal com IA autônoma
 * Gerencia movimento, colisão, animação e comportamento
 * @class AnimalEntity
 */
export class AnimalEntity {
    /**
     * Construtor da entidade de animal
     * Inicializa posição, sprites, colisão e estado inicial
     * @param {string} assetName - Nome do asset do animal (Bull, Turkey, etc)
     * @param {Object} assetData - Dados do asset do assetManager
     * @param {HTMLImageElement} assetData.img - Sprite sheet do animal
     * @param {number} [assetData.cols=4] - Número de colunas no sprite sheet
     * @param {number} [assetData.rows=4] - Número de linhas no sprite sheet
     * @param {number} [assetData.frameWidth] - Largura de cada frame
     * @param {number} [assetData.frameHeight] - Altura de cada frame
     * @param {Object} [assetData.directionRows] - Mapeamento de direções para linhas do sprite
     * @param {number} x - Posição X inicial no mundo
     * @param {number} y - Posição Y inicial no mundo
     */
    constructor(assetName, assetData, x, y) {
        this.type = "ANIMAL";
        this.assetName = assetName;
        
        // Dados vindos do assetManager
        this.img = assetData.img;
        this.cols = assetData.cols || 4;
        this.rows = assetData.rows || 4;
        
        // Posição no mundo
        this.x = x;
        this.y = y;

        // Dimensões do Sprite
        this.frameWidth = assetData.frameWidth || (this.img ? this.img.width / this.cols : 32);
        this.frameHeight = assetData.frameHeight || (this.img ? this.img.height / this.rows : 32);

        this.width = this.frameWidth;
        this.height = this.frameHeight;

        // Inicializa a collisionBox lendo a config do collisionSystem
        // Isso garante que o 'move()' use os mesmos valores que o debug desenha
        this.collisionBox = this.getInitialCollisionConfig();

        // Estado Inicial
        this.state = AnimalState.IDLE;
        this.direction = 0; 
        this.targetX = x;
        this.targetY = y;
        
        this.directionRows = assetData.directionRows || { down: 0, up: 3, left: 1, right: 2 };

        // Timers
        this.stateTimer = performance.now();
        this.stateDuration = 1000;
        
        // Animação
        this.frameIndex = 0;
        this.lastFrameTime = 0;
    }

    /**
     * Obtém configuração inicial de colisão do collisionSystem
     * Lê configurações específicas para o tipo de animal
     * Usa valores padrão se configuração não estiver disponível
     * @returns {Object} Configuração de collision box
     * @returns {number} returns.offsetX - Deslocamento X em pixels
     * @returns {number} returns.offsetY - Deslocamento Y em pixels
     * @returns {number} returns.width - Largura da hitbox
     * @returns {number} returns.height - Altura da hitbox
     */
    getInitialCollisionConfig() {
        // Valores Padrão (Fallback)
        let box = {
            offsetX: this.width * 0.25,
            offsetY: this.height * 0.6,
            width: this.width * 0.5,
            height: this.height * 0.4
        };

        try {
            if (collisionSystem && typeof collisionSystem.getConfigForObject === 'function') {
                // Pergunta ao sistema qual a config para este animal (BULL, etc)
                const cfg = collisionSystem.getConfigForObject({ 
                    type: 'ANIMAL', 
                    original: this // Passa 'this' para ele ler o this.assetName
                });

                if (cfg) {
                    // Se a config usa ratios (porcentagens), converte para pixels
                    const wRatio = cfg.widthRatio ?? 0.5;
                    const hRatio = cfg.heightRatio ?? 0.4;
                    const xRatio = cfg.offsetXRatio ?? 0.25;
                    const yRatio = cfg.offsetYRatio ?? 0.6;

                    box.width = this.width * wRatio;
                    box.height = this.height * hRatio;
                    box.offsetX = this.width * xRatio;
                    box.offsetY = this.height * yRatio;
                }
            }
        } catch (e) {
            logger.warn("AnimalEntity: erro ao carregar config de colisão", e);
        }
        return box;
    }

    /**
     * Retorna a hitbox de colisão do animal
     * Usado pelo theWorld.js para renderização de debug e detecção de colisão
     * @returns {Object} Hitbox com coordenadas absolutas
     * @returns {number} returns.x - Posição X da hitbox
     * @returns {number} returns.y - Posição Y da hitbox
     * @returns {number} returns.width - Largura da hitbox
     * @returns {number} returns.height - Altura da hitbox
     */
    getHitbox() {
        const cb = this.collisionBox;
        return {
            x: this.x + (cb.offsetX || 0),
            y: this.y + (cb.offsetY || 0),
            width: cb.width || this.width,
            height: cb.height || this.height
        };
    }

    /**
     * Loop principal de atualização do animal
     * Gerencia transições de estado e atualiza animação
     * Chamado a cada frame pelo sistema de mundo
     * @returns {void}
     */
    update() {
        const now = performance.now();

        if (now - this.stateTimer > this.stateDuration) {
            this.pickNewState();
            this.stateTimer = now;
        }

        if (this.state === AnimalState.MOVE) {
            this.move();
        }

        this.updateAnimation(now);
    }

    /**
     * Seleciona um novo estado aleatório para o animal
     * 60% chance de movimento, 40% chance de idle
     * Define duração aleatória e posição alvo se mover
     * @returns {void}
     */
    pickNewState() {
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
    }

    /**
     * Atualiza a direção visual do animal baseado no movimento
     * Determina se animal deve olhar para cima, baixo, esquerda ou direita
     * @returns {void}
     */
    updateDirection() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;

        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? this.directionRows.right : this.directionRows.left;
        } else {
            this.direction = dy > 0 ? this.directionRows.down : this.directionRows.up;
        }
    }

    /**
     * Move o animal em direção ao alvo
     * Verifica colisões antes de aplicar movimento
     * Muda para idle se chegou ao destino ou encontrou obstáculo
     * @returns {void}
     */
    move() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 2) {
            this.state = AnimalState.IDLE;
            return;
        }

        const vx = (dx / dist) * MOVEMENT.ANIMAL_SPEED;
        const vy = (dy / dist) * MOVEMENT.ANIMAL_SPEED;

        const nextX = this.x + vx;
        const nextY = this.y + vy;

        // Usa a collisionBox (que agora está correta graças ao construtor)
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
            
            // Nota: A atualização do collisionSystem é feita por theWorld.js após update()
            // para evitar conflitos de valores
        } else {
            this.state = AnimalState.IDLE; 
            this.pickNewState(); 
        }
    }

    /**
     * Atualiza o frame de animação do sprite
     * Usa taxa de frames diferente para idle vs movimento
     * @param {DOMHighResTimeStamp} now - Timestamp atual
     * @returns {void}
     */
    updateAnimation(now) {
        const frameRate = this.state === AnimalState.MOVE 
            ? ANIMATION.FRAME_RATE_MOVE_MS 
            : ANIMATION.FRAME_RATE_IDLE_MS;

        if (now - this.lastFrameTime >= frameRate) {
            this.lastFrameTime = now;
            this.frameIndex = (this.frameIndex + 1) % this.cols;
        }
    }

    /**
     * Renderiza o animal no canvas
     * Aplica culling (não desenha se fora da tela)
     * Usa frame correto do sprite sheet baseado em direção e animação
     * @param {CanvasRenderingContext2D} ctx - Contexto do canvas
     * @param {Object} camera - Objeto da câmera
     * @param {Function} camera.worldToScreen - Função de conversão de coordenadas
     * @param {number} camera.zoom - Nível de zoom
     * @param {number} camera.width - Largura da viewport
     * @param {number} camera.height - Altura da viewport
     * @returns {void}
     */
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
    }
}