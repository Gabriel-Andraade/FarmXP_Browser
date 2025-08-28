// scripts/cameraSystem.js
export class CameraSystem {
    constructor(canvas, worldWidth, worldHeight) {
        this.canvas = canvas;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

    this.x = 0;
    this.y = 0;
    this.zoom = 0.4;

    this.target = { x: 0, y: 0 }; // position the camera should follow
    this.lerpSpeed = 0.1; // smoothing

        this.minZoom = 0.5;
        this.maxZoom = 2;

        this.dragStart = { x: 0, y: 0 };
        this.isDragging = false;

        this.setupEvents();
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStart.x = e.clientX - this.x;
            this.dragStart.y = e.clientY - this.y;
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.x = e.clientX - this.dragStart.x;
                this.y = e.clientY - this.dragStart.y;
                this.limitCamera();
            }
        });
        
    }

    // Center the camera on a point
    centerOn(x, y) {
        this.target.x = x - this.canvas.width / (2 * this.zoom);
        this.target.y = y - this.canvas.height / (2 * this.zoom);
    }

    // Update camera position with smoothing
    update() {
        this.x += ( -this.target.x - this.x ) * this.lerpSpeed;
        this.y += ( -this.target.y - this.y ) * this.lerpSpeed;
        this.limitCamera();
    }

    // Prevent the camera from leaving the world boundaries
    limitCamera() {
        const maxX = 0;
        const maxY = 0;
        const minX = this.canvas.width - this.worldWidth * this.zoom;
        const minY = this.canvas.height - this.worldHeight * this.zoom;

        this.x = Math.min(maxX, Math.max(minX, this.x));
        this.y = Math.min(maxY, Math.max(minY, this.y));
    }

    // Apply the camera transformation to the context
    applyTransform(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.zoom, this.zoom);
    }

    // Restore the context transformation
    restoreTransform(ctx) {
        ctx.restore();
    }

    // Check if a rectangle is visible in the viewport
    isInViewport(x, y, width, height) {
        const left = -this.x / this.zoom;
        const top = -this.y / this.zoom;
        const right = left + this.canvas.width / this.zoom;
        const bottom = top + this.canvas.height / this.zoom;

        return x + width > left && x < right && y + height > top && y < bottom;
    }

    // Reset the camera to the center of the world
    resetCamera() {
        this.zoom = 0.4;
        this.centerOn(this.worldWidth / 2, this.worldHeight / 2);
        this.update();
    }

    // Return camera info
    getCamera() {
        return { x: this.x, y: this.y, zoom: this.zoom };
    }
}
