import { describe, test, expect } from 'bun:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * #262: the server sends `style-src 'self'`, which blocks every inline style —
 * `style=""` attributes in markup and `<style>` elements alike, including ones
 * built with `document.createElement('style')`.
 *
 * Nothing throws when that happens. The rules are simply never applied, so the
 * bug shows up as "this screen looks wrong" long after the change that caused
 * it: the settings language row rendered with browser defaults, the quest
 * speech bubble lost its fade-in, and the XP toasts came out unstyled.
 *
 * These tests fail on the way in instead.
 *
 * Not covered, because CSP does not cover them either: `el.style.x = ...` and
 * `el.style.cssText = ...` are CSSOM writes, not inline styles, and work fine.
 */

const ROOT = join(import.meta.dir, '..', '..');
const PUBLIC = join(ROOT, 'public');

/** Every .js under public/scripts, recursively. */
function scriptFiles(dir = join(PUBLIC, 'scripts'), out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) scriptFiles(full, out);
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

const rel = (p) => p.slice(ROOT.length + 1).replace(/\\/g, '/');

describe('CSP: no inline styles (#262)', () => {
  test('index.html has no style="" attributes', () => {
    const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
    const offenders = [...html.matchAll(/style\s*=\s*"[^"]*"/g)].map((m) => m[0].slice(0, 60));
    expect(offenders, 'move these into a stylesheet — CSP drops them').toEqual([]);
  });

  test('no script builds a <style> element', () => {
    const offenders = [];
    for (const file of scriptFiles()) {
      const src = readFileSync(file, 'utf8');
      // createElement('style') / createElement("style"), however spaced.
      if (/createElement\s*\(\s*['"]style['"]\s*\)/.test(src)) offenders.push(rel(file));
    }
    expect(offenders, 'a <style> element is inline CSS — put the rules in public/style/').toEqual([]);
  });

  test('the stylesheets that replaced them are actually linked', () => {
    // A rule moved to a file nobody loads is no better than a blocked one.
    const html = readFileSync(join(PUBLIC, 'index.html'), 'utf8');
    for (const sheet of ['config.css', 'accessibility.css', 'dialogue.css', 'xp-notification.css']) {
      expect(html, `${sheet} is not linked from index.html`).toContain(`style/${sheet}`);
    }
  });

  test('the rescued rules are in those stylesheets', () => {
    const read = (f) => readFileSync(join(PUBLIC, 'style', f), 'utf8');
    expect(read('config.css'), 'language row').toContain('.setting-row-language');
    expect(read('config.css'), 'settings modal shell').toContain('.store-container');
    expect(read('accessibility.css'), 'canvas zoom origin').toContain('transform-origin');
    expect(read('dialogue.css'), 'speech bubble animation').toContain('bubbleFadeIn');
    expect(read('xp-notification.css'), 'xp toast').toContain('.xp-toast');
  });

  test('style-src stays self — no unsafe-inline crept in', () => {
    const server = readFileSync(join(ROOT, 'server.ts'), 'utf8');
    expect(server).toContain(`"style-src 'self'; "`);
    expect(server, 'unsafe-inline would defeat the whole point').not.toContain('unsafe-inline');
  });
});
