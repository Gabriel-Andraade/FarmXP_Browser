/**
 * @file troughMarker.js - Shared hover crosshair for water/food troughs.
 * @description The water and food trough systems drew an identical "+" hover
 * marker (only the fill-level label differed). This is the single source of
 * truth for that marker; each system passes its own label.
 * @module troughMarker
 */

const MARKER_SIZE = 22;
const MARKER_COLOR = '#b8860b';

/**
 * Marker center: 65% down the trough — the sprite's visual weight sits low
 * (water/food pools near the bottom), so the geometric center reads too high.
 * @param {{x:number,y:number,width:number,height:number}} t
 */
export function troughCenter(t) {
    return {
        cx: t.x + (t.width || 0) / 2,
        cy: t.y + (t.height || 0) * 0.65,
    };
}

/**
 * Draw the hover crosshair + a fill-level label over a trough.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} camera - needs worldToScreen() and zoom.
 * @param {{x:number,y:number,width:number,height:number}} trough
 * @param {string} label - e.g. "💧 80%" or "🌾 50%  ⭐ 20%".
 */
export function drawTroughHoverMarker(ctx, camera, trough, label) {
    const { cx: wxC, cy: wyC } = troughCenter(trough);
    const screen = camera.worldToScreen(wxC, wyC);
    const zoom = camera.zoom || 1;
    const size = MARKER_SIZE * zoom;
    const half = size / 2;
    const stroke = Math.max(2, Math.round(3 * zoom));
    const cx = Math.round(screen.x);
    const cy = Math.round(screen.y);

    ctx.save();
    ctx.lineCap = 'round';

    ctx.fillStyle = 'rgba(255, 230, 180, 0.55)';
    ctx.beginPath();
    ctx.arc(cx, cy, half + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = MARKER_COLOR;
    ctx.lineWidth = stroke;
    ctx.beginPath();
    ctx.moveTo(cx - half, cy);
    ctx.lineTo(cx + half, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx, cy + half);
    ctx.stroke();

    const ly = cy + half + 4 * zoom;
    ctx.font = `bold ${Math.round(12 * zoom)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.lineWidth = Math.max(2, 3 * zoom);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(label, cx, ly);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, cx, ly);

    ctx.restore();
}
