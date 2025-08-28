import { createHitbox, isColliding, drawHitbox } from "./collisionSystem.js";
import { CameraSystem } from "./cameraSystem.js";

// scripts/worldSystem.js
export const WorldSystem = (function() {
    // World settings
    const WORLD_WIDTH = 3000;
    const WORLD_HEIGHT = 3000;
    const TILE_SIZE = 16;
    
    // Generation settings
    const TREE_DENSITY = 0.08;   // Tree density (increased)
    const THICKET_DENSITY = 0.02; // Dense bush density
    const ROCK_DENSITY = 0.08;   // Rock density (increased)
    
    // Modular camera system
    let cameraSystem;
    
    // World elements
    let trees = [];
    let thickets = [];
    let rocks = [];
    let groundTiles = [];
    
    // Canvas and context reference
    let canvas, ctx;
    
    // Assets
    const assets = {
        grass: new Image(),
        tree1: new Image(),
        tree2: new Image(),
        tree3: new Image(),
        rock1: new Image(),
        rock2: new Image(),
        thicket1: new Image(),
        house: new Image()
    };
    
    let imagesToLoad = Object.keys(assets).length;
    let imagesLoaded = 0;

    // Player house position
    let playerHouse = { x: 0, y: 0 };
    // Initialize world system
    function init(canvasElement) {
        canvas = canvasElement;
        ctx = canvas.getContext('2d');
        // Load assets
        assets.grass.src = 'assets/background/grassMid.png';
        assets.tree1.src = 'assets/allTree/Tree1.png';
        assets.tree2.src = 'assets/allTree/Tree2.png';
        assets.tree3.src = 'assets/allTree/Tree3.png';
        assets.rock1.src = 'assets/allRocks/Rock1.png';
        assets.rock2.src = 'assets/allRocks/Rock2.png';
        assets.thicket1.src = 'assets/allThicket/Thicket1.png';
        assets.house.src = 'assets/playerHouse/House1.png';

        // Set up image loading events
        for (const key in assets) {
            assets[key].onload = () => {
                imagesLoaded++;
                if (imagesLoaded === imagesToLoad) {
                    generateWorld();
                }
            };
            assets[key].onerror = () => {
                console.error(`Error loading asset: ${key}`);
                imagesLoaded++;
            };
        }

        // Initialize modular camera system
        cameraSystem = new CameraSystem(canvas, WORLD_WIDTH, WORLD_HEIGHT);
        cameraSystem.resetCamera();
    }
    
    // (all camera event logic was moved to cameraSystem.js)
    
    // Procedurally generate the world
    function generateWorld() {
        // Clear existing arrays
        trees = [];
        rocks = [];
        thickets = [];
        groundTiles = [];
        
        // Generate terrain tiles
        for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
            for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
                groundTiles.push({ x, y, type: 'grass' });
            }
        }

        // Generate random position for player house
        const houseWidth = 264 * 1.5;
        const houseHeight = 244 * 1.5;
        let houseHitbox, tryCount = 0;
        let validPosition = false;
        
        do {
            playerHouse.x = Math.floor(Math.random() * (WORLD_WIDTH - houseWidth));
            playerHouse.y = Math.floor(Math.random() * (WORLD_HEIGHT - houseHeight));
            
            // Create hitbox for the house (adjusted for collision)
            houseHitbox = createHitbox(
                playerHouse.x + houseWidth * 0.15, 
                playerHouse.y + houseHeight * 0.6, 
                houseWidth * 0.7, 
                houseHeight * 0.35
            );
            
            // Check if the position is valid (no collisions)
            validPosition = true;
            
            // Check collision with world boundaries
            if (playerHouse.x < 0 || playerHouse.y < 0 || 
                playerHouse.x + houseWidth > WORLD_WIDTH || 
                playerHouse.y + houseHeight > WORLD_HEIGHT) {
                validPosition = false;
                continue;
            }
            
            tryCount++;
            if (tryCount > 50) break; // Prevent infinite loop
            
        } while (!validPosition);

        // Center the camera on the player's house
        if (cameraSystem) {
            // Center on the middle of the house
            const centerX = playerHouse.x + houseWidth / 2;
            const centerY = playerHouse.y + houseHeight / 2;
            cameraSystem.centerOn(centerX, centerY);
        }
        
        // Optimized tree generation (grid jitter + minimum spacing)
        const TREE_GRID = 80; // base spacing between trees
        const TREE_ATTEMPTS = 2; // attempts per cell
        const TREE_MIN_DIST = 60; // minimum distance between trees
        const SCALE = 1.5; // same scale used in drawing
        for (let x = 50; x < WORLD_WIDTH - 50; x += TREE_GRID) {
            for (let y = 50; y < WORLD_HEIGHT - 50; y += TREE_GRID) {
                for (let attempt = 0; attempt < TREE_ATTEMPTS; attempt++) {
                    if (Math.random() < TREE_DENSITY) {
                        let tx = x + Math.random() * (TREE_GRID - 30) - (TREE_GRID - 30) / 2;
                        let ty = y + Math.random() * (TREE_GRID - 30) - (TREE_GRID - 30) / 2;
                        const treeType = `tree${Math.floor(Math.random() * 3) + 1}`;
                        const treeAsset = assets[treeType];
                        const treeDrawWidth = treeAsset.width * SCALE;
                        const treeDrawHeight = treeAsset.height * SCALE;
                        const treeHitbox = createHitbox(
                            tx + treeDrawWidth * 0.3,   // center trunk
                            ty + treeDrawHeight * 0.75, // bottom part
                            treeDrawWidth * 0.4,        // only trunk width
                            treeDrawHeight * 0.25       // small height (only base)
                        );
                        // Check collision with house
                        if (!isColliding(treeHitbox, houseHitbox)) {
                            // Check minimum distance from other trees
                            let tooClose = false;
                            for (const other of trees) {
                                const dx = (other.x - tx);
                                const dy = (other.y - ty);
                                if (Math.sqrt(dx*dx + dy*dy) < TREE_MIN_DIST) {
                                    tooClose = true;
                                    break;
                                }
                            }
                            if (!tooClose) {
                                trees.push({ x: tx, y: ty, type: treeType, hitbox: treeHitbox });
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        // Generate dense bushes (not overlapping house)
        for (let x = 40; x < WORLD_WIDTH - 40; x += 35) {
            for (let y = 40; y < WORLD_HEIGHT - 40; y += 35) {
                if (Math.random() < THICKET_DENSITY) {
                    let tx = x + Math.random() * 20 - 10;
                    let ty = y + Math.random() * 20 - 10;
                    
                    // Create hitbox for bush
                    const thicketHitbox = createHitbox(
                        tx + assets.thicket1.width * 0.2,
                        ty + assets.thicket1.height * 0.2,
                        assets.thicket1.width * 0.6,
                        assets.thicket1.height * 0.6
                    );
                    
                    // Check collision with house
                    if (!isColliding(thicketHitbox, houseHitbox)) {
                        thickets.push({ 
                            x: tx, 
                            y: ty, 
                            type: 'thicket1', 
                            hitbox: thicketHitbox 
                        });
                    }
                }
            }
        }
        
        // Optimized rock generation (grid jitter + minimum spacing)
        const ROCK_GRID = 120;
        const ROCK_ATTEMPTS = 2;
        const ROCK_MIN_DIST = 80;
        for (let x = 40; x < WORLD_WIDTH - 40; x += ROCK_GRID) {
            for (let y = 40; y < WORLD_HEIGHT - 40; y += ROCK_GRID) {
                for (let attempt = 0; attempt < ROCK_ATTEMPTS; attempt++) {
                    if (Math.random() < ROCK_DENSITY) {
                        let rx = x + Math.random() * (ROCK_GRID - 30) - (ROCK_GRID - 30) / 2;
                        let ry = y + Math.random() * (ROCK_GRID - 30) - (ROCK_GRID - 30) / 2;
                        const rockType = Math.random() > 0.5 ? 'rock1' : 'rock2';
                        const rockAsset = assets[rockType];
                        const rockHitbox = createHitbox(
                            rx + rockAsset.width * 0.1,
                            ry + rockAsset.height * 0.1,
                            rockAsset.width * 0.8,
                            rockAsset.height * 0.8
                        );
                        // Check collision with house
                        const collidesWithHouse = isColliding(rockHitbox, houseHitbox);
                        // Check minimum distance from other rocks
                        let tooClose = false;
                        for (const other of rocks) {
                            const dx = (other.x - rx);
                            const dy = (other.y - ry);
                            if (Math.sqrt(dx*dx + dy*dy) < ROCK_MIN_DIST) {
                                tooClose = true;
                                break;
                            }
                        }
                        // Check collision with trees
                        let collidesWithTree = false;
                        for (const tree of trees) {
                            if (isColliding(rockHitbox, tree.hitbox)) {
                                collidesWithTree = true;
                                break;
                            }
                        }
                        // Check collision with bushes
                        let collidesWithThicket = false;
                        for (const thicket of thickets) {
                            if (isColliding(rockHitbox, thicket.hitbox)) {
                                collidesWithThicket = true;
                                break;
                            }
                        }
                        if (!collidesWithHouse && !tooClose && !collidesWithTree && !collidesWithThicket) {
                            rocks.push({ x: rx, y: ry, type: rockType, hitbox: rockHitbox });
                            break;
                        }
                    }
                }
            }
        }
        
        console.log(`World generated: ${trees.length} trees, ${thickets.length} bushes, ${rocks.length} rocks`);
    }
    
    // Update world (logic)
    function update() {
        // Nothing to update for now
    }
    
    // Render the world
    function draw() {
        // Check if all assets are loaded
        if (imagesLoaded < imagesToLoad) {
            // Draw loading screen
            ctx.fillStyle = '#87a878';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Loading assets...', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Keep pixel art sharp
        ctx.imageSmoothingEnabled = false;
        
        // Apply camera transformations
        ctx.save();
        ctx.translate(cameraSystem.x, cameraSystem.y);
        ctx.scale(cameraSystem.zoom, cameraSystem.zoom);
        
        // Draw terrain tiles
        for (const tile of groundTiles) {
            const screenX = tile.x;
            const screenY = tile.y;
            
            // If the tile is inside the viewport, draw it
            if (cameraSystem.isInViewport(screenX, screenY, TILE_SIZE, TILE_SIZE)) {
                ctx.drawImage(assets.grass, screenX, screenY, TILE_SIZE, TILE_SIZE);
            }
        }
        
        // Draw bushes
        for (const thicket of thickets) {
            const screenX = thicket.x;
            const screenY = thicket.y;
            if (cameraSystem.isInViewport(screenX, screenY, assets.thicket1.width, assets.thicket1.height)) {
                ctx.drawImage(assets.thicket1, screenX, screenY);
            }
        }
        
        // Draw rocks
        for (const rock of rocks) {
            const screenX = rock.x;
            const screenY = rock.y;
            const rockAsset = assets[rock.type];
            if (cameraSystem.isInViewport(screenX, screenY, rockAsset.width, rockAsset.height)) {
                ctx.drawImage(rockAsset, screenX, screenY);
            }
        }
        
        // Draw trees
        for (const tree of trees) {
            const screenX = tree.x;
            const screenY = tree.y;
            const treeAsset = assets[tree.type];
            const treeDrawWidth = treeAsset.width * 1.5;
            const treeDrawHeight = treeAsset.height * 1.5;
            
            if (cameraSystem.isInViewport(screenX, screenY, treeDrawWidth, treeDrawHeight)) {
                ctx.drawImage(treeAsset, screenX, screenY, treeDrawWidth, treeDrawHeight);
            }
        }
        
        // Draw the player's house
        const houseDrawWidth = 264 * 1.5;
        const houseDrawHeight = 244 * 1.5;
        if (assets.house.complete && assets.house.naturalWidth > 0) {
            if (cameraSystem.isInViewport(playerHouse.x, playerHouse.y, houseDrawWidth, houseDrawHeight)) {
                ctx.drawImage(assets.house, playerHouse.x, playerHouse.y, houseDrawWidth, houseDrawHeight);
            }
        }
        
        ctx.restore();
    }
    

    
    // Reset camera to the center of the world
    function resetCamera() {
        if (cameraSystem) cameraSystem.resetCamera();
    }
    
    // Public interface
    return {
        init,
        update,
        draw,
        generateWorld,
        resetCamera,
        getWorldSize: () => ({ width: WORLD_WIDTH, height: WORLD_HEIGHT }),
        getCamera: () => cameraSystem ? cameraSystem.getCamera() : null
    };
})();