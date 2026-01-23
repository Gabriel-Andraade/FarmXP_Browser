import { WORLD_WIDTH, WORLD_HEIGHT, getInitialPlayerPosition } from "../theWorld.js";
import { frames } from "./frames.js";
import { camera, CAMERA_ZOOM } from "./cameraSystem.js";
import { collisionSystem } from "../collisionSystem.js";

const initialPos = getInitialPlayerPosition();

export const stella = {
    id: 'player_stella',
    name: 'Stella',
    x: initialPos.x,
    y: initialPos.y,
    width: 25,
    height: 48,
    speed: 150,
    baseSpeed: 150,
    frame: 8,
    lastFrameTime: 0,
    frameDelay: 120,
    isMoving: false,
    animationAccumulator: 0,
    facingLeft: false,
    isColliding: false,
    collidingWith: null,
    // 🆕 PROPRIEDADE PARA CONSUMO (NÃO TRAVA ANIMAÇÃO)
    isConsuming: false,
    isSleeping: false,

    draw(ctx) {
        drawStella(ctx);
    },

    // 🆕 FUNÇÃO PARA APLICAR EFEITOS DE NECESSIDADES BAIXAS
    applyNeedEffects(multiplier) {
        // Reduzir velocidade quando necessidades estão baixas
        this.speed = this.baseSpeed * multiplier;
        
        // Feedback visual (opcional)
        if (multiplier < 0.5) {
            this.exhausted = true;
        } else {
            this.exhausted = false;
        }
    },

    // 🆕 FUNÇÃO PARA RESTAURAR NECESSIDADES (AGORA CHAMA PLAYER SYSTEM)
    restoreNeeds(hunger = 0, thirst = 0, energy = 0) {
        // Deleta a implementação local e chama o playerSystem
        if (window.playerSystem && window.playerSystem.restoreNeeds) {
            window.playerSystem.restoreNeeds(hunger, thirst, energy);
        }
    }
};

// 🎯 **1. FUNÇÃO PARA CRIAR HITBOX DA STELLA**
function createStellaHitbox() {
    return collisionSystem.createPlayerHitbox(stella.x, stella.y, stella.width, stella.height);
}

// 🎯 **2. FUNÇÃO PARA VERIFICAR COLISÃO ANTES DE MOVER**
function canMoveTo(newX, newY) {
    // Criar hitbox temporária na nova posição
    const tempHitbox = collisionSystem.createPlayerHitbox(newX, newY, stella.width, stella.height);
    
    // Verificar colisão com todos os objetos do mundo
    const collisions = collisionSystem.checkPlayerCollision(newX, newY, stella.width, stella.height);
    
    if (collisions.length > 0) {
        stella.isColliding = true;
        stella.collidingWith = collisions[0].type;
        return false; // Movimento bloqueado
    }
    
    stella.isColliding = false;
    stella.collidingWith = null;
    return true; // Movimento permitido
}

// 🆕 FUNÇÃO PARA SINCRONIZAR NECESSIDADES COM PLAYER SYSTEM
function syncNeedsFromPlayerSystem() {
    if (window.playerSystem) {
        // 🆕 OBTÉM VALORES ATUAIS DO PLAYER SYSTEM MAS NÃO TRAVA NADA
        const needs = window.playerSystem.getNeeds();
        
        // 🆕 ATUALIZA PROPRIEDADES LOCAPARA REFLETIR (APENAS PARA COMPATIBILIDADE)
        // MAS A VERDADEIRA FONTE É O PLAYER SYSTEM
        stella.hunger = needs.hunger;
        stella.thirst = needs.thirst;
        stella.energy = needs.energy;
        
        // 🆕 VERIFICA SE ESTÁ CONSUMINDO (NÃO TRAVA, APENAS INFORMA)
        if (window.playerSystem.isConsuming) {
            stella.isConsuming = true;
        } else {
            stella.isConsuming = false;
        }
    }
}

export function updateStella(deltaTime, keys) {
    // 🆕 SINCRONIZAR COM PLAYER SYSTEM PRIMEIRO
    syncNeedsFromPlayerSystem();
    
    // 🆕 VERIFICAR SE ESTÁ DORMINDO (AGORA DO PLAYER SYSTEM)
    if (window.playerSystem && window.playerSystem.currentPlayer && 
        window.playerSystem.currentPlayer.isSleeping) {
        stella.isSleeping = true;
        return; // Não faz nada enquanto dorme
    } else {
        stella.isSleeping = false;
    }
    
    // 🆕 VERIFICAR SE ESTÁ CONSUMINDO (NÃO TRAVA ANIMAÇÃO, APENAS BLOQUEIA MOVIMENTO)
    if (stella.isConsuming) {
        // 🆕 NÃO ATUALIZA MOVIMENTO, MAS CONTINUA ANIMAÇÃO IDLE
        stella.isMoving = false;
        stella.frame = 8; // Frame idle
        
        // 🆕 DISPARA EVENTO DE CONSUMO EM ANDAMENTO (PARA WORLD UI)
        document.dispatchEvent(new CustomEvent('consumptionInProgress', {
            detail: { player: stella }
        }));
        
        // 🆕 MANTÉM ANIMAÇÃO IDLE, MAS NÃO SE MOVE
        camera.follow(stella);
        
        // 🆕 ATUALIZA ACUMULADOR DE ANIMAÇÃO PARA IDLE
        stella.animationAccumulator += deltaTime;
        if (stella.animationAccumulator >= stella.frameDelay * 2) { // Anima idle mais lento
            stella.animationAccumulator = 0;
        }
        
        return; // Sai da função mas NÃO TRAVA ANIMAÇÃO
    }

    // 🆕 OBTER MULTIPLICADOR DE EFICIÊNCIA DO PLAYER SYSTEM
    let efficiencyMultiplier = 1.0;
    if (window.playerSystem && window.playerSystem.getEfficiencyMultiplier) {
        efficiencyMultiplier = window.playerSystem.getEfficiencyMultiplier();
    }
    
    // Aplicar velocidade baseada nas necessidades
    stella.speed = stella.baseSpeed * efficiencyMultiplier;

    // Armazenar posição antiga para calcular distância
    const oldX = stella.x;
    const oldY = stella.y;
    
    let moveX = 0, moveY = 0;
    if (keys.ArrowLeft) { moveX -= 1; }
    if (keys.ArrowRight) { moveX += 1; }
    if (keys.ArrowUp) { moveY -= 1; }
    if (keys.ArrowDown) { moveY += 1; }
    
    const moving = moveX !== 0 || moveY !== 0;
    
    if (moving) {
        const horizontalMovement = moveX !== 0;
        
        if (horizontalMovement) {
            stella.facingLeft = moveX < 0;
            stella.isMoving = true;
        } else {
            // Movimento vertical apenas: não anima, fica em idle
            stella.isMoving = false;
            stella.frame = 8;
        }
        
        // 🎯 **3. CALCULAR NOVA POSIÇÃO**
        const newX = stella.x + moveX * (stella.speed * (deltaTime / 1000));
        const newY = stella.y + moveY * (stella.speed * (deltaTime / 1000));
        
        // 🎯 **4. VERIFICAR COLISÃO ANTES DE MOVER**
        if (canMoveTo(newX, newY)) {
            // Movimento permitido - sem colisão
            stella.x = newX;
            stella.y = newY;
        } else {
            // 🎯 **5. TENTAR MOVIMENTO PARCIAL (deslizar junto ao obstáculo)**
            
            // Tentar mover só no eixo X
            if (moveX !== 0 && canMoveTo(newX, stella.y)) {
                stella.x = newX;
            }
            // Tentar mover só no eixo Y  
            else if (moveY !== 0 && canMoveTo(stella.x, newY)) {
                stella.y = newY;
            }
            // Se ambos os eixos colidirem, não move
        }
        
        // 🎯 **6. MANTER DENTRO DOS LIMITES DO MUNDO**
        stella.x = Math.max(0, Math.min(WORLD_WIDTH - stella.width, stella.x));
        stella.y = Math.max(0, Math.min(WORLD_HEIGHT - stella.height, stella.y));
    } else {
        stella.isMoving = false;
        stella.frame = 8;
        stella.isColliding = false;
        stella.collidingWith = null;
    }

    // 🆕 CALCULAR DISTÂNCIA PERCORRIDA E DISPARAR EVENTO
    const distance = Math.sqrt(
        Math.pow(stella.x - oldX, 2) + 
        Math.pow(stella.y - oldY, 2)
    );
    
    // Disparar evento de movimento (apenas se moveu)
    if (distance > 0) {
        document.dispatchEvent(new CustomEvent('playerMoved', {
            detail: { 
                distance,
                speed: stella.speed,
                efficiencyMultiplier
            }
        }));
        
        // 🆕 SE ESTÁ SE MOVENDO, CANCELA CONSUMO (SE HOUVER)
        if (stella.isConsuming) {
            document.dispatchEvent(new Event('consumptionCancelled'));
        }
    }

    camera.follow(stella);
    
    // 🆕 SISTEMA DE ANIMAÇÃO ORIGINAL INTACTO
    if (stella.isMoving && stella.frame !== 8) {
        stella.animationAccumulator += deltaTime;
        if (stella.animationAccumulator >= stella.frameDelay) {
            stella.frame = (stella.frame + 1) % 8;
            stella.animationAccumulator = 0;
        }
    } else if (stella.isMoving && stella.frame === 8) {
        stella.frame = 0;
        stella.animationAccumulator = 0;
    }
}

export function drawStella(ctx) {
    // 🆕 SINCRONIZAR NECESSIDADES ANTES DE DESENHAR
    syncNeedsFromPlayerSystem();
    
    // 🆕 VERIFICAR SE ESTÁ EXAUSTO (mudar cor) - AGORA DO PLAYER SYSTEM
    const isExhausted = window.playerSystem && 
                       window.playerSystem.getEfficiencyMultiplier && 
                       window.playerSystem.getEfficiencyMultiplier() < 0.5;
    
    // 🆕 VERIFICAR SE ESTÁ CONSUMINDO (ADIÇÃO VISUAL)
    const isConsuming = stella.isConsuming;
    
    let currentImage = stella.frame === 8 ? frames.idle : frames.moving[stella.frame];
    if (currentImage && currentImage.complete) {
        const screenPos = camera.worldToScreen(stella.x, stella.y);
        const zoomedWidth = stella.width * CAMERA_ZOOM;
        const zoomedHeight = stella.height * CAMERA_ZOOM;
        
        
        // 🆕 APLICAR EFEITO VISUAL DE EXAUSTÃO (opcional)
        if (isExhausted) {
            ctx.save();
            // Desaturar a cor
            ctx.filter = 'grayscale(50%) brightness(80%)';
        }
        
        // 🆕 APLICAR EFEITO VISUAL DE CONSUMO (opcional - brilho dourado)
        if (isConsuming) {
            ctx.save();
            ctx.filter = 'brightness(1.2) saturate(1.3)';
        }
        
        // Desenhar com espelhamento baseado na direção horizontal (funciona para moving e idle)
        if (stella.facingLeft) {
            ctx.save();
            ctx.translate(screenPos.x + zoomedWidth, screenPos.y);
            ctx.scale(-1, 1);
            ctx.drawImage(currentImage, 0, 0, zoomedWidth, zoomedHeight);
            ctx.restore();
        } else {
            ctx.drawImage(currentImage, screenPos.x, screenPos.y, zoomedWidth, zoomedHeight);
        }
        
        // 🆕 RESTAURAR CONTEXTO APÓS EFEITOS VISUAIS
        if (isExhausted || isConsuming) {
            ctx.restore();
        }
        
        // 🎯 **8. OPÇÃO: DESENHAR HITBOX (debug)**
        if (DEBUG_HITBOXES) {
            const hitbox = createStellaHitbox();
            const hitboxScreenPos = camera.worldToScreen(hitbox.x, hitbox.y);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                hitboxScreenPos.x, 
                hitboxScreenPos.y, 
                hitbox.width * CAMERA_ZOOM, 
                hitbox.height * CAMERA_ZOOM
            );
        }
        
        // 🆕 INDICADOR VISUAL DE NECESSIDADES BAIXAS (opcional)
        if (isExhausted && !DEBUG_HITBOXES) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('💀', screenPos.x + zoomedWidth/2, screenPos.y - 10);
        }
        
        // 🆕 INDICADOR VISUAL DE CONSUMO (opcional)
        if (isConsuming && !DEBUG_HITBOXES) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🍽️', screenPos.x + zoomedWidth/2, screenPos.y - 10);
        }
    }
}

// 🎯 **9. CONSTANTE PARA DEBUG (ativar/desativar hitboxes visíveis)**
const DEBUG_HITBOXES = false;

// 🆕 EXPORTAR FUNÇÃO PARA SINCRONIZAR NECESSIDADES (PARA USO EXTERNO)
export function syncStellaNeeds() {
    syncNeedsFromPlayerSystem();
}