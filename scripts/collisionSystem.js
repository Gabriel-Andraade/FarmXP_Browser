
// ======================
// HITBOX AND COLLISION SYSTEM
// ======================

// Creates a rectangular hitbox object
export function createHitbox(x, y, w, h) {
	return { x, y, w, h };
}

// Rectangle vs rectangle collision (AABB)
export function isColliding(a, b) {
	return (
		a.x < b.x + b.w &&
		a.x + a.w > b.x &&
		a.y < b.y + b.h &&
		a.y + a.h > b.y
	);
}

// Draws a hitbox for visual debug
export function drawHitbox(ctx, hitbox, color = "rgba(255,0,0,0.3)") {
	ctx.fillStyle = color;
	ctx.fillRect(hitbox.x, hitbox.y, hitbox.w, hitbox.h);
}


