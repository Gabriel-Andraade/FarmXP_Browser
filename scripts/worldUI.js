
import { camera, CAMERA_ZOOM } from "./thePlayer/cameraSystem.js";
import { assets } from "./assetManager.js";

class WorldUIManager {
    constructor() {
        // estilos usados na interface do mundo
        this.styles = {
            hpBar: {
                width: 50,
                height: 6,
                offsetY: 12,
                bgColor: "#2e1c0f",
                borderColor: "#8b5a2b",
                highColor: "#4ecca3",
                midColor: "#FF9800",
                lowColor: "#F44336",
                gradientHigh: ["#4ecca3", "#3da58a"],
                gradientMid: ["#ff9a3c", "#ff6b6b"],
                gradientLow: ["#ff6b6b", "#c0392b"]
            },
            keyPrompt: {
                size: 32,
                offsetY: 45,
                bgGradient: ["#c9a463", "#e0bc87"],
                borderColor: "#8b5a2b",
                textColor: "#2e1c0f",
                shadowColor: "rgba(0, 0, 0, 0.3)",
                borderWidth: 2
            }
        };

        // cache de elementos reutilizáveis
        this.cache = {
            keyPromptCanvas: null
        };

        // controle de consumo com barra de progresso
        this.consumption = {
            isActive: false,
            progress: 0,
            item: null,
            player: null,
            startTime: 0,
            duration: 0
        };

        this.setupConsumptionListeners();
    }

    // renderiza elementos de interface no mundo
    render(ctx, interactiveObjects, player) {
        if (!interactiveObjects || !player) return;

        this.updateConsumptionBar();
        ctx.save();

        for (const obj of interactiveObjects.values()) {
            if (obj.destroyed) continue;
            if (!camera.isInViewport(obj.x, obj.y, obj.width, obj.height)) continue;

            if (obj.health < obj.maxHealth && obj.health > 0) {
                this.drawHealthBar(ctx, obj);
            }

            const typeLower = (obj.type || "").toLowerCase();
            const originalTypeLower = (obj.originalType || "").toLowerCase();
            const nameLower = (obj.name || "").toLowerCase();

            const isFence =
                typeLower.includes("fence") ||
                originalTypeLower.includes("fence") ||
                nameLower.includes("cerca") ||
                nameLower.includes("fence");

            const isWall =
                typeLower.includes("wall") ||
                originalTypeLower.includes("wall");

            const isExplicitlyNonInteractable = obj.interactable === false;

            if (!isFence && !isWall && !isExplicitlyNonInteractable) {
                this.checkAndDrawInteractionPrompt(ctx, obj, player);
            }
        }

        ctx.restore();
        this.drawConsumptionBar(ctx);
    }

    // desenha barra de vida de objetos
    drawHealthBar(ctx, obj) {
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y
        );

        const width = this.styles.hpBar.width * zoom;
        const height = this.styles.hpBar.height * zoom;

        const x = Math.floor(screenPos.x - width / 2);
        const y = Math.floor(screenPos.y - this.styles.hpBar.offsetY * zoom);

        const percent = Math.max(0, obj.health / obj.maxHealth);

        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        this.drawRoundedRect(ctx, x, y, width, height, 3, this.styles.hpBar.bgColor);

        ctx.shadowColor = "transparent";

        let gradient;
        if (percent > 0.5) {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientHigh[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientHigh[1]);
        } else if (percent > 0.25) {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientMid[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientMid[1]);
        } else {
            gradient = ctx.createLinearGradient(x, y, x + width * percent, y);
            gradient.addColorStop(0, this.styles.hpBar.gradientLow[0]);
            gradient.addColorStop(1, this.styles.hpBar.gradientLow[1]);
        }

        const fillWidth = Math.max(4, width * percent);
        this.drawRoundedRect(ctx, x, y, fillWidth, height, 3, gradient);

        ctx.strokeStyle = this.styles.hpBar.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);

        if (zoom > 0.8 && width > 60) {
            ctx.font = `bold ${9 * zoom}px Arial`;
            ctx.fillStyle = "#f5e9d3";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(
                `${Math.floor(obj.health)}/${Math.floor(obj.maxHealth)}`,
                x + width / 2,
                y + height / 2
            );
        }
    }

    // verifica distância e desenha prompt de interação
    checkAndDrawInteractionPrompt(ctx, obj, player) {
        const centerObjX = obj.x + obj.width / 2;
        const centerObjY = obj.y + obj.height / 2;
        const centerPlayerX = player.x + player.width / 2;
        const centerPlayerY = player.y + player.height / 2;

        const dist = Math.hypot(
            centerObjX - centerPlayerX,
            centerObjY - centerPlayerY
        );

        const interactionRange = 70;

        if (dist <= interactionRange) {
            this.drawKeyPrompt(ctx, obj, "E");

            if (dist <= interactionRange * 0.7) {
                this.drawInteractionGlow(ctx, obj);
            }
        }
    }

    // desenha tecla de interação
    drawKeyPrompt(ctx, obj, key) {
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y
        );

        const hasHealthBar = obj.health < obj.maxHealth && obj.health > 0;
        const offsetY = hasHealthBar
            ? (this.styles.hpBar.offsetY + this.styles.hpBar.height + 15) * zoom
            : 20 * zoom;

        const x = screenPos.x;
        const y = screenPos.y - offsetY;
        const size = this.styles.keyPrompt.size * zoom;

        ctx.shadowColor = this.styles.keyPrompt.shadowColor;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        const gradient = ctx.createRadialGradient(
            x, y, size * 0.3,
            x, y, size * 0.8
        );
        gradient.addColorStop(0, this.styles.keyPrompt.bgGradient[0]);
        gradient.addColorStop(1, this.styles.keyPrompt.bgGradient[1]);

        this.drawRoundedRect(
            ctx,
            x - size / 2,
            y - size / 2,
            size,
            size,
            8,
            gradient
        );

        ctx.shadowColor = "transparent";
        ctx.strokeStyle = this.styles.keyPrompt.borderColor;
        ctx.lineWidth = this.styles.keyPrompt.borderWidth;
        ctx.stroke();

        ctx.fillStyle = this.styles.keyPrompt.textColor;
        ctx.font = `bold ${14 * zoom}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(key, x, y + 1);
    }

    // efeito visual ao aproximar do objeto
    drawInteractionGlow(ctx, obj) {
        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            obj.x + obj.width / 2,
            obj.y + obj.height / 2
        );

        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        ctx.save();
        ctx.globalAlpha = 0.1 * pulse;

        const gradient = ctx.createRadialGradient(
            screenPos.x, screenPos.y, 0,
            screenPos.x, screenPos.y, 50 * zoom
        );
        gradient.addColorStop(0, "#c9a463");
        gradient.addColorStop(1, "transparent");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 50 * zoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // registra eventos de consumo
    setupConsumptionListeners() {
        document.addEventListener("startConsumption", (e) => {
            const { item, player, duration } = e.detail;
            this.consumption = {
                isActive: true,
                progress: 0,
                item,
                player,
                startTime: Date.now(),
                duration
            };
        });

        document.addEventListener("consumptionCancelled", () => {
            this.consumption.isActive = false;
        });
    }

    // atualiza progresso de consumo
    updateConsumptionBar() {
        if (!this.consumption.isActive) return;

        const elapsed = Date.now() - this.consumption.startTime;
        this.consumption.progress = Math.min(
            1,
            elapsed / this.consumption.duration
        );

        if (this.consumption.progress >= 1) {
            document.dispatchEvent(
                new CustomEvent("consumptionCompleted", {
                    detail: {
                        item: this.consumption.item,
                        fillUp: this.consumption.item.fillUp
                    }
                })
            );
            this.consumption.isActive = false;
        }
    }

    // desenha barra de consumo do jogador
    drawConsumptionBar(ctx) {
        if (!this.consumption.isActive || !this.consumption.player) return;

        const zoom = CAMERA_ZOOM;
        const screenPos = camera.worldToScreen(
            this.consumption.player.x + this.consumption.player.width / 2,
            this.consumption.player.y - 30
        );

        const width = 60 * zoom;
        const height = 8 * zoom;
        const x = screenPos.x - width / 2;
        const y = screenPos.y;

        ctx.fillStyle = "#2e1c0f";
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = "#4ecca3";
        ctx.fillRect(x, y, width * this.consumption.progress, height);
    }

    // utilitário para retângulos arredondados
    drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
            x + width,
            y + height,
            x + width - radius,
            y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
    }
}

export const worldUI = new WorldUIManager();
