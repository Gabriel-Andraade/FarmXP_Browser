
import { WORLD_WIDTH, WORLD_HEIGHT, GAME_WIDTH, GAME_HEIGHT } from "../worldConstants.js";

// ZOOM FIXO
export const CAMERA_ZOOM = 1.4;

// A viewport será definida externamente
export let VIEWPORT_WIDTH = GAME_WIDTH;
export let VIEWPORT_HEIGHT = GAME_HEIGHT;

export let ZOOMED_VIEWPORT_WIDTH = VIEWPORT_WIDTH / CAMERA_ZOOM;
export let ZOOMED_VIEWPORT_HEIGHT = VIEWPORT_HEIGHT / CAMERA_ZOOM;

export function setViewportSize(width, height) {
    VIEWPORT_WIDTH = width;
    VIEWPORT_HEIGHT = height;
    ZOOMED_VIEWPORT_WIDTH = width / CAMERA_ZOOM;
    ZOOMED_VIEWPORT_HEIGHT = height / CAMERA_ZOOM;
    
    camera.width = ZOOMED_VIEWPORT_WIDTH;
    camera.height = ZOOMED_VIEWPORT_HEIGHT;
}

export const camera = {
    x: 0,
    y: 0,
    width: ZOOMED_VIEWPORT_WIDTH,
    height: ZOOMED_VIEWPORT_HEIGHT,
    zoom: CAMERA_ZOOM,
    
    follow(target) {
        this.x = target.x - this.width / 2 + target.width / 2;
        this.y = target.y - this.height / 2 + target.height / 2;
        
        this.x = Math.max(0, Math.min(WORLD_WIDTH - this.width, this.x));
        this.y = Math.max(0, Math.min(WORLD_HEIGHT - this.height, this.y));
    },
    
    worldToScreen(x, y) {
        return {
            x: (x - this.x) * this.zoom,
            y: (y - this.y) * this.zoom
        };
    },
    
    screenToWorld(x, y) {
        return {
            x: (x / this.zoom) + this.x,
            y: (y / this.zoom) + this.y
        };
    },
    
    isInViewport(x, y, width, height) {
        const screenPos = this.worldToScreen(x, y);
        return screenPos.x + (width * this.zoom) > 0 && 
               screenPos.x < VIEWPORT_WIDTH && 
               screenPos.y + (height * this.zoom) > 0 && 
               screenPos.y < VIEWPORT_HEIGHT;
    }
};