/**
 * Verifica colisão entre duas caixas delimitadoras usando o algoritmo AABB (Axis-Aligned Bounding Box)
 * @param {Object} boxA - Primeira caixa delimitadora
 * @param {number} boxA.x - Posição X da primeira caixa
 * @param {number} boxA.y - Posição Y da primeira caixa
 * @param {number} boxA.width - Largura da primeira caixa
 * @param {number} boxA.height - Altura da primeira caixa
 * @param {Object} boxB - Segunda caixa delimitadora
 * @param {number} boxB.x - Posição X da segunda caixa
 * @param {number} boxB.y - Posição Y da segunda caixa
 * @param {number} boxB.width - Largura da segunda caixa
 * @param {number} boxB.height - Altura da segunda caixa
 * @returns {boolean} True se houver colisão, false caso contrário
 */
function checkAABBCollision(boxA, boxB) {
    return (
        boxA.x < boxB.x + boxB.width &&
        boxA.x + boxA.width > boxB.x &&
        boxA.y < boxB.y + boxB.height &&
        boxA.y + boxA.height > boxB.y
    );
}

function _rect(x, y, width, height) {
    return { x, y, width, height };
}

function _centerX(r) { return r.x + r.width / 2; }
function _centerY(r) { return r.y + r.height / 2; }

function _computeMTV(a, b) {
    // retorna deslocamento minimo para tirar 'a' de dentro de 'b'
    const aRight = a.x + a.width;
    const aBottom = a.y + a.height;
    const bRight = b.x + b.width;
    const bBottom = b.y + b.height;

    const overlapRight = aRight - b.x;    // a indo pra direita bateu no lado esquerdo de b
    const overlapLeft = bRight - a.x;     // a indo pra esquerda bateu no lado direito de b
    const overlapDown = aBottom - b.y;    // a indo pra baixo bateu no topo de b
    const overlapUp = bBottom - a.y;      // a indo pra cima bateu na base de b

    const ox = Math.min(overlapRight, overlapLeft);
    const oy = Math.min(overlapDown, overlapUp);

    if (ox <= 0 || oy <= 0) return null;

    const ax = _centerX(a);
    const bx = _centerX(b);
    const ay = _centerY(a);
    const by = _centerY(b);

    if (ox < oy) {
        const dir = (ax < bx) ? -1 : 1;
        return { dx: ox * dir, dy: 0 };
    } else {
        const dir = (ay < by) ? -1 : 1;
        return { dx: 0, dy: oy * dir };
    }
}

/**
 * Sistema de gerenciamento de colisões do jogo
 * Gerencia hitboxes físicas (colisão sólida) e hitboxes de interação (áreas de alcance)
 * Sistema de cores para debug:
 * - Vermelho: Hitboxes físicas (colisão sólida)
 * - Laranja/Verde: Hitboxes de interação (verde quando jogador está no alcance)
 * - Amarelo: Alcance de interação do jogador
 * - Azul: Corpo físico do jogador
 * @class CollisionSystem
 */
export class CollisionSystem {
    /**
     * Construtor do sistema de colisão
     * Inicializa os mapas de hitboxes físicas e de interação
     */
    constructor() {
        this.hitboxes = new Map();              // Hitboxes físicas (vermelho)
        this.interactionHitboxes = new Map();   // Zonas de interação (laranja/verde)
        this.playerInteractionHitbox = null;    // Alcance do jogador (amarelo)
    }

    /**
     * Configurações de tamanho e offset para hitboxes físicas de objetos estáticos
     * Define dimensões absolutas em pixels e deslocamentos
     * @static
     * @type {Object}
     */
    static CONFIG_SIZES = {
        TREE: {
            width: 38,
            height: 40,
            offsetY: 38,
            offsetX: 16
        },
        ROCK: {
            width: 32,
            height: 27
        },
        THICKET: {
            width: 30,
            height: 18,
            offsetY: 7,
            offsetX: 7
        },
        CHEST: {
            width: 31,
            height: 31
        },
        HOUSE_WALLS: {
            width: 1,
            height: 1,
            offsetX: 0.0,
            offsetY: 0.0
        },
        WELL: {
            width: 63,
            height: 30,
            offsetY: 56
        },
        FENCEX: {
            width: 28,
            height: 5,
            offsetX: 0,
            offsetY: 24
        },
        FENCEY: {
            width: 4,
            height: 63,
            offsetX: 0,
            offsetY: 0
        }
    };

    /**
     * Configurações de hitboxes para animais usando proporções relativas
     * Define tamanhos e offsets como ratios da largura/altura do sprite
     * @static
     * @type {Object}
     */
    static ANIMAL_CONFIGS = {
        BULL: {
            widthRatio: 0.3,
            heightRatio: 0.3,
            offsetXRatio: 0.3,
            offsetYRatio: 0.5
        },
        TURKEY: {
            widthRatio: 0.4,
            heightRatio: 0.3,
            offsetXRatio: 0.3,
            offsetYRatio: 0.7
        },
        CHICK: {
            widthRatio: 0.4,
            heightRatio: 0.3,
            offsetXRatio: 0.3,
            offsetYRatio: 0.7
        },

        DEFAULT: {
            widthRatio: 0.4,
            heightRatio: 0.3,
            offsetXRatio: 0.3,
            offsetYRatio: 0.7
        }
    };

    /**
     * Configurações das zonas de interação (hitboxes laranjas/verdes)
     * Define áreas onde o jogador pode interagir com objetos
     * @static
     * @type {Object}
     */
    static INTERACTION_HITBOX_CONFIGS = {
        ANIMAL: {
            widthRatio: 1.0,
            heightRatio: 1.0,
            offsetX: 0.0,
            offsetY: 0.0,
            originalType: "animal"
        },
        TREE: {
            widthRatio: 1.0, heightRatio: 2.0,
            offsetX: 0.0, offsetY: -0.5,
            originalType: "tree"
        },
        ROCK: {
            widthRatio: 1.0, heightRatio: 1.1,
            offsetX: 0.0, offsetY: 0.0,
            originalType: "rock"
        },
        THICKET: {
            widthRatio: 0.8, heightRatio: 0.8,
            offsetX: 0.1, offsetY: 0.0,
            originalType: "thicket"
        },
        CHEST: {
            widthRatio: 1.0, heightRatio: 1.2,
            offsetX: 0.0, offsetY: -0.15,
            originalType: "chest"
        },
        CONSTRUCTION: {
            widthRatio: 1.0, heightRatio: 1.1,
            offsetX: -0.05, offsetY: -0.05,
            originalType: "construction"
        },
        HOUSE_WALLS: {
            widthRatio: 0.9, heightRatio: 0.8,
            offsetX: 0.1, offsetY: -0.8,
            originalType: "house"
        },
        WELL: {
            widthRatio: 0.8,
            heightRatio: 0.6,
            offsetX: 0.1,
            offsetY: 0.25,
            originalType: "well"
        }
    };

    getConfigForObject(object) {
        if (!object) return null;

        const typeKey = (object.type || "").toString().toUpperCase();

        if (typeKey === "ANIMAL") {
            const orig = object.original || object.object || null;
            const assetName = (orig && (orig.assetName || orig.assetname || orig.name))
                ? (orig.assetName || orig.assetname || orig.name).toString().toUpperCase()
                : null;

            const animalConfig = assetName && CollisionSystem.ANIMAL_CONFIGS[assetName];
            if (animalConfig) return animalConfig;

            return CollisionSystem.ANIMAL_CONFIGS.DEFAULT;
        }

        const config = CollisionSystem.CONFIG_SIZES[typeKey];
        return config || null;
    }

    addHitbox(objectId, objectType, x, y, width, height, originalObject = null) {
        const objectData = { id: objectId, type: objectType, x, y, width, height, original: originalObject };

        this.registerPhysicalHitbox(objectData);

        const interactiveTypes = [
            "TREE", "ROCK", "THICKET", "CHEST",
            "HOUSE_WALLS", "CONSTRUCTION", "WELL",
            "FENCE", "FENCEX", "FENCEY", "ANIMAL"
        ];
        if (interactiveTypes.includes(objectType)) {
            this.registerInteractionHitbox(objectData);
        }

        return this.hitboxes.get(objectId);
    }

    registerObjectCollision(obj, config = {}, type = "static") {
        const offX = config.offsetX || 0;
        const offY = config.offsetY || 0;

        const finalWidth = (typeof config.width === "number") ? config.width : (obj.width || 0);
        const finalHeight = (typeof config.height === "number") ? config.height : (obj.height || 0);

        const finalX = (obj.x || 0) + offX;
        const finalY = (obj.y || 0) + offY;

        this.addHitbox(obj.id, type, finalX, finalY, finalWidth, finalHeight, obj);

        return this.hitboxes.get(obj.id);
    }

    registerPhysicalHitbox(object) {
        if (object.type === "HOUSE_ROOF") {
            const hitbox = {
                id: object.id, type: object.type,
                x: object.x + object.width - 265, y: object.y + object.height - 200,
                width: 200, height: 190
            };
            this.hitboxes.set(object.id, hitbox);
            return;
        }

        const cfg = this.getConfigForObject(object);

        if (!cfg) {
            const hitbox = {
                id: object.id,
                x: object.x,
                y: object.y,
                width: object.width,
                height: object.height,
                type: object.type,
                object: object.original || null
            };
            this.hitboxes.set(object.id, hitbox);
            return;
        }

        let hitboxWidth, hitboxHeight, hitboxX, hitboxY;

        if (typeof cfg.width === "number" && typeof cfg.height === "number") {
            hitboxWidth = cfg.width;
            hitboxHeight = cfg.height;
            hitboxX = object.x + (cfg.offsetX || 0);
            hitboxY = object.y + (cfg.offsetY || 0);
        } else {
            const baseW = object.width || (object.original && object.original.width) || 32;
            const baseH = object.height || (object.original && object.original.height) || 32;

            const wRatio = (typeof cfg.widthRatio === "number") ? cfg.widthRatio : 1.0;
            const hRatio = (typeof cfg.heightRatio === "number") ? cfg.heightRatio : 1.0;
            const offXRatio = (typeof cfg.offsetXRatio === "number") ? cfg.offsetXRatio : 0;
            const offYRatio = (typeof cfg.offsetYRatio === "number") ? cfg.offsetYRatio : 0;

            hitboxWidth = Math.round(baseW * wRatio);
            hitboxHeight = Math.round(baseH * hRatio);
            hitboxX = Math.round((object.x || 0) + (baseW * offXRatio));
            hitboxY = Math.round((object.y || 0) + (baseH * offYRatio));
        }

        const hitbox = {
            id: object.id,
            x: hitboxX,
            y: hitboxY,
            width: hitboxWidth,
            height: hitboxHeight,
            type: object.type,
            object: object.original || null
        };
        this.hitboxes.set(object.id, hitbox);
    }

    registerInteractionHitbox(object) {
        const typeKey = object.type.toUpperCase();
        const config = CollisionSystem.INTERACTION_HITBOX_CONFIGS[typeKey];

        if (!config) return;

        const newWidth = object.width * config.widthRatio;
        const newHeight = object.height * config.heightRatio;
        const newX = object.x + (object.width * config.offsetX);
        const newY = object.y + (object.height * config.offsetY);

        const hitbox = {
            id: object.id,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
            originalType: config.originalType,
            objectId: object.id,
            object: object.original || {
                id: object.id,
                type: object.type,
                x: object.x,
                y: object.y,
                width: object.width,
                height: object.height
            }
        };

        this.interactionHitboxes.set(object.id, hitbox);
    }

    removeHitbox(id) {
        this.hitboxes.delete(id);
        this.interactionHitboxes.delete(id);
    }

    updateHitboxPosition(id, newX, newY, newWidth = undefined, newHeight = undefined) {
        const hb = this.hitboxes.get(id);
        if (!hb) return false;

        const oldX = hb.x;
        const oldY = hb.y;
        const oldW = hb.width;
        const oldH = hb.height;

        if (typeof newX === "number") hb.x = newX;
        if (typeof newY === "number") hb.y = newY;
        if (typeof newWidth === "number") hb.width = newWidth;
        if (typeof newHeight === "number") hb.height = newHeight;

        const ihb = this.interactionHitboxes.get(id);
        if (ihb) {
            const dx = hb.x - oldX;
            const dy = hb.y - oldY;
            ihb.x += dx;
            ihb.y += dy;

            if (typeof newWidth === "number" && oldW !== 0 && hb.width !== oldW) {
                const scaleX = hb.width / oldW;
                ihb.width *= scaleX;
            }
            if (typeof newHeight === "number" && oldH !== 0 && hb.height !== oldH) {
                const scaleY = hb.height / oldH;
                ihb.height *= scaleY;
            }
        }

        return true;
    }

    reapplyHitboxesForType(type) {
        const t = type.toUpperCase();
        for (const [id, hitbox] of this.hitboxes.entries()) {
            if (hitbox.type?.toUpperCase() === t && hitbox.object) {
                this.removeHitbox(id);
                this.registerPhysicalHitbox({
                    id,
                    type: hitbox.type,
                    x: hitbox.object.x,
                    y: hitbox.object.y,
                    width: hitbox.object.width,
                    height: hitbox.object.height,
                    original: hitbox.object
                });
            }
        }
    }

    areaCollides(x, y, w, h, ignoreId = null) {
        const rect = { x: x, y: y, width: w, height: h };
        for (const hitbox of this.hitboxes.values()) {
            if (ignoreId && hitbox.id === ignoreId) continue;
            if (checkAABBCollision(rect, hitbox)) return true;
        }
        return false;
    }

    getInteractionObject(id) {
        return this.interactionHitboxes.get(id);
    }

    checkCollision(boxA, boxB) {
        return checkAABBCollision(boxA, boxB);
    }

    checkPlayerCollision(px, py, pw, ph) {
        const playerHitbox = this.createPlayerHitbox(px, py, pw, ph);
        const collisions = [];

        for (const [objectId, hitbox] of this.hitboxes) {
            if (this.checkCollision(playerHitbox, hitbox)) {
                collisions.push({ objectId, type: hitbox.type, hitbox });
            }
        }
        return collisions;
    }

    checkPlayerInteraction(interactionHitbox) {
        if (!this.playerInteractionHitbox) return false;
        return this.checkCollision(this.playerInteractionHitbox, interactionHitbox);
    }

    updatePlayerInteractionRange(range) {
        if (!range) {
            this.playerInteractionHitbox = null;
            return;
        }
        this.playerInteractionHitbox = {
            x: range.x,
            y: range.y,
            width: range.width,
            height: range.height
        };
    }

    createPlayerHitbox(x, y, width, height) {
        const widthRatio = 0.7;
        const heightRatio = 0.3;
        const offsetX = 0.15;
        const offsetY = 0.7;

        return {
            x: x + (width * offsetX),
            y: y + (height * offsetY),
            width: width * widthRatio,
            height: height * heightRatio
        };
    }

    getObjectAtMouse(screenX, screenY, camera, { requirePlayerInRange = true } = {}) {
        const worldX = screenX / (camera.zoom || 1) + (camera.x || 0);
        const worldY = screenY / (camera.zoom || 1) + (camera.y || 0);

        for (const hitbox of this.interactionHitboxes.values()) {
            if (worldX >= hitbox.x &&
                worldX <= hitbox.x + hitbox.width &&
                worldY >= hitbox.y &&
                worldY <= hitbox.y + hitbox.height) {

                if (requirePlayerInRange && !this.checkPlayerInteraction(hitbox)) {
                    continue;
                }

                return {
                    objectId: hitbox.id,
                    type: hitbox.originalType,
                    originalType: hitbox.originalType,
                    x: hitbox.x,
                    y: hitbox.y,
                    object: hitbox.object
                };
            }
        }
        return null;
    }

    getAnyObjectById(objectId) {
        let object = this.interactionHitboxes.get(objectId);
        if (!object) object = this.hitboxes.get(objectId);
        return object;
    }

    getObjectsInInteractionRange(range) {
        if (!range) return [];
        const found = [];
        for (const [objectId, hitbox] of this.interactionHitboxes) {
            if (this.checkCollision(range, hitbox)) {
                found.push(objectId);
            }
        }
        return found;
    }

    /**
     * encontra a primeira hitbox fisica que colide com 'rect'
     */
    _firstSolidCollision(rect, ignoreId = null) {
        for (const hitbox of this.hitboxes.values()) {
            if (ignoreId && hitbox.id === ignoreId) continue;
            if (checkAABBCollision(rect, hitbox)) return hitbox;
        }
        return null;
    }

    /**
     * resolve sobreposicao empurrando 'rect' para fora das hitboxes fisicas
     */
    resolveOverlap(rect, ignoreId = null, { maxIters = 6 } = {}) {
        let r = _rect(rect.x, rect.y, rect.width, rect.height);

        for (let i = 0; i < maxIters; i++) {
            const hit = this._firstSolidCollision(r, ignoreId);
            if (!hit) break;

            const mtv = _computeMTV(r, hit);
            if (!mtv) break;

            r.x += mtv.dx;
            r.y += mtv.dy;
        }

        return r;
    }

    /**
     * move um retangulo com colisao por eixo (x depois y), travando o eixo que colidir
     * stepPx reduz tunelamento quando dx/dy sao altos
     */
    moveRectWithCollisions(rect, dx, dy, ignoreId = null, { stepPx = 4 } = {}) {
        let r = _rect(rect.x, rect.y, rect.width, rect.height);

        let blockedX = false;
        let blockedY = false;
        const collisions = [];

        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / Math.max(1, stepPx)));
        const sx = dx / steps;
        const sy = dy / steps;

        for (let i = 0; i < steps; i++) {
            if (sx !== 0) {
                const nextX = _rect(r.x + sx, r.y, r.width, r.height);
                const hit = this._firstSolidCollision(nextX, ignoreId);
                if (hit) {
                    blockedX = true;
                    collisions.push(hit);

                    if (sx > 0) r.x = hit.x - r.width;
                    else r.x = hit.x + hit.width;
                } else {
                    r.x = nextX.x;
                }
            }

            if (sy !== 0) {
                const nextY = _rect(r.x, r.y + sy, r.width, r.height);
                const hit = this._firstSolidCollision(nextY, ignoreId);
                if (hit) {
                    blockedY = true;
                    collisions.push(hit);

                    if (sy > 0) r.y = hit.y - r.height;
                    else r.y = hit.y + hit.height;
                } else {
                    r.y = nextY.y;
                }
            }
        }

        return {
            x: r.x,
            y: r.y,
            dx: r.x - rect.x,
            dy: r.y - rect.y,
            blockedX,
            blockedY,
            collisions
        };
    }

    drawHitboxes(ctx, camera) {
        if (!window.DEBUG_HITBOXES) return;

        ctx.lineWidth = 2;
        const zoom = (camera && camera.zoom) ? camera.zoom : 1;

        ctx.strokeStyle = "red";
        for (const hitbox of this.hitboxes.values()) {
            const screenPos = camera.worldToScreen(hitbox.x, hitbox.y);
            ctx.strokeRect(screenPos.x, screenPos.y, hitbox.width * zoom, hitbox.height * zoom);
        }

        ctx.lineWidth = 3;
        for (const hitbox of Array.from(this.interactionHitboxes.values())) {
            if (this.checkPlayerInteraction(hitbox)) {
                ctx.strokeStyle = "#00FF00";
            } else {
                ctx.strokeStyle = "#FFA500";
            }
            const screenPos = camera.worldToScreen(hitbox.x, hitbox.y);
            ctx.strokeRect(screenPos.x, screenPos.y, hitbox.width * zoom, hitbox.height * zoom);
        }

        ctx.strokeStyle = "yellow";
        if (this.playerInteractionHitbox) {
            const p = this.playerInteractionHitbox;
            const screenPos = camera.worldToScreen(p.x, p.y);
            ctx.strokeRect(screenPos.x, screenPos.y, p.width * zoom, p.height * zoom);
        }

        ctx.strokeStyle = "blue";
        if (window.currentPlayer) {
            const player = window.currentPlayer;
            const playerHitbox = this.createPlayerHitbox(player.x, player.y, player.width, player.height);
            const screenPos = camera.worldToScreen(playerHitbox.x, playerHitbox.y);
            ctx.strokeRect(screenPos.x, screenPos.y, playerHitbox.width * zoom, playerHitbox.height * zoom);
        }
    }

    clear() {
        this.hitboxes.clear();
        this.interactionHitboxes.clear();
        this.playerInteractionHitbox = null;
    }
}

export const collisionSystem = new CollisionSystem();
window.collisionSystem = collisionSystem;
const DEBUG_HITBOXES = false;
