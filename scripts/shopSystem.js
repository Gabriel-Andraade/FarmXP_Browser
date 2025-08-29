
// Shop system for rotating store inventory
import { allItems } from "./items.js";

// The current inventory available in the shop for the day
export let shopInventory = [];

// Generate a new shop inventory for the given day
export function generateShopInventory(day) {
    shopInventory = [];
    const categories = Object.keys(allItems);

    categories.forEach(category => {
        const pool = [...allItems[category]];
        shuffleArray(pool);
        // Example: randomly pick 2 items from each category for the shop
        shopInventory.push({ 
            category, 
            items: pool.slice(0, 2) 
        });
    });
}

// Shuffle an array in place (Fisher-Yates algorithm)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
