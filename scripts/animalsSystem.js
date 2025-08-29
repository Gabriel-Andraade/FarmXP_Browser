
// Sheep animal class
export class Sheep {
  constructor(x, y, spriteSheet) {
    this.x = x;
    this.y = y;
    this.spriteSheet = spriteSheet;
    this.speed = 0.5;

    this.dirX = 0;
    this.dirY = 0;
    this.moveCooldown = 0;

    // Animation
    this.frameX = 0;
    this.frameY = 0;
    this.frameTimer = 0;
    this.frameInterval = 280; // ms between frames
    this.frameWidth = 32;
    this.frameHeight = 32;
  }

  update(deltaTime) {
    // Move cooldown
    this.moveCooldown -= deltaTime;
    if (this.moveCooldown <= 0) {
      const directions = [
        { dx: 1, dy: 0, row: 2 },   // right
        { dx: -1, dy: 0, row: 1 },  // left
        { dx: 0, dy: 1, row: 3 },   // down
        { dx: 0, dy: -1, row: 0 },  // up
        { dx: 0, dy: 0, row: this.frameY } // idle
      ];
      const choice = directions[Math.floor(Math.random() * directions.length)];
      this.dirX = choice.dx;
      this.dirY = choice.dy;
      this.frameY = choice.row;

      this.moveCooldown = 1000 + Math.random() * 2000;
    }

    // Movement
    this.x += this.dirX * this.speed;
    this.y += this.dirY * this.speed;

    // Animation
    if (this.dirX !== 0 || this.dirY !== 0) {
      this.frameTimer += deltaTime;
      if (this.frameTimer >= this.frameInterval) {
        this.frameX = (this.frameX + 1) % 6; // 6 frames per row
        this.frameTimer = 0;
      }
    } else {
      this.frameX = 0; // idle stays on the first frame
    }
  }

  // Draw the sheep on the canvas
  draw(ctx) {
    ctx.drawImage(
      this.spriteSheet,
      this.frameX * this.frameWidth,
      this.frameY * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      Math.floor(this.x),
      Math.floor(this.y),
      this.frameWidth,
      this.frameHeight
    );
  }
}

// Global animal list
export const animals = [];

// Update and draw all animals
export function updateAnimals(deltaTime, ctx) {
  animals.forEach(animal => {
    animal.update(deltaTime);
    animal.draw(ctx);
  });
}
