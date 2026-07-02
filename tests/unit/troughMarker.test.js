import { describe, test, expect } from 'bun:test';
import { troughCenter, drawTroughHoverMarker } from '../../public/scripts/troughMarker.js';

describe('troughCenter', () => {
  test('centers X and places Y 65% down the trough', () => {
    expect(troughCenter({ x: 100, y: 200, width: 40, height: 20 }))
      .toEqual({ cx: 120, cy: 213 });
  });

  test('square trough → cx = x + w/2, cy = y + h*0.65', () => {
    expect(troughCenter({ x: 0, y: 0, width: 100, height: 100 }))
      .toEqual({ cx: 50, cy: 65 });
  });

  test('missing width/height default to 0', () => {
    expect(troughCenter({ x: 10, y: 20 })).toEqual({ cx: 10, cy: 20 });
  });
});

describe('drawTroughHoverMarker', () => {
  // Records every method call; property sets (fillStyle, font, …) just assign.
  function makeCtx() {
    const calls = [];
    const rec = (name) => (...args) => calls.push([name, ...args]);
    return {
      calls,
      save: rec('save'), restore: rec('restore'),
      beginPath: rec('beginPath'), arc: rec('arc'), fill: rec('fill'),
      moveTo: rec('moveTo'), lineTo: rec('lineTo'), stroke: rec('stroke'),
      strokeText: rec('strokeText'), fillText: rec('fillText'),
    };
  }
  const identityCam = { zoom: 1, worldToScreen: (x, y) => ({ x, y }) };

  test('draws the passed label at the trough center, balancing save/restore', () => {
    const ctx = makeCtx();
    drawTroughHoverMarker(ctx, identityCam, { x: 100, y: 200, width: 40, height: 20 }, '💧 80%');

    const names = ctx.calls.map((c) => c[0]);
    expect(names[0]).toBe('save');
    expect(names[names.length - 1]).toBe('restore');

    const fillText = ctx.calls.find((c) => c[0] === 'fillText');
    expect(fillText[1]).toBe('💧 80%');   // label
    expect(fillText[2]).toBe(120);         // cx (worldToScreen is identity here)
  });

  test('queries camera.worldToScreen at the trough center', () => {
    let received = null;
    const cam = { zoom: 1, worldToScreen: (x, y) => { received = { x, y }; return { x, y }; } };
    drawTroughHoverMarker(makeCtx(), cam, { x: 0, y: 0, width: 100, height: 100 }, 'x');
    expect(received).toEqual({ x: 50, y: 65 });
  });
});
