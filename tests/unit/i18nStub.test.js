import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import '../setup.js';
import { i18nModule } from './helpers/i18nMock.js';

/**
 * A stub for i18n.js has to be the whole module, not the part one file needs.
 *
 * `mock.module` replaces a module for the entire run, and files run in
 * alphabetical order — so a stub holding only `t` is never local. Every later
 * file importing one of the other exports gets a module without it, and the
 * import throws before any of its tests run, reporting as a single unnamed
 * failure that says nothing about where it came from.
 *
 * That cost two separate debugging sessions during #264. These two tests are
 * what makes the third one unnecessary.
 */

const REAL = 'public/scripts/i18n/i18n.js';
const SEP = String.fromCharCode(92);   // Windows path separator, for reporting

function testFiles(dir = 'tests/unit', out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) testFiles(path, out);
        else if (entry.name.endsWith('.test.js')) out.push(path);
    }
    return out;
}

describe('the i18n stub (#264)', () => {
    test('it carries every export the real module has', () => {
        const source = readFileSync(REAL, 'utf8');
        const exported = [...source.matchAll(/^export (?:const|function|let)\s+(\w+)/gm)]
            .map((m) => m[1]);
        // A default export too, which the regex above cannot see.
        expect(source).toContain('export default');

        const stub = i18nModule();
        for (const name of exported) {
            expect(stub).toHaveProperty(name);
        }
        expect(stub.default).toBeDefined();
    });

    test('it carries every method the game calls on the instance', () => {
        const used = new Set();
        const walk = (dir) => {
            for (const entry of readdirSync(dir, { withFileTypes: true })) {
                const path = join(dir, entry.name);
                if (entry.isDirectory()) walk(path);
                else if (entry.name.endsWith('.js')) {
                    for (const m of readFileSync(path, 'utf8').matchAll(/\bi18n\.(\w+)\s*\(/g)) {
                        used.add(m[1]);
                    }
                }
            }
        };
        walk('public/scripts');

        expect(used.size).toBeGreaterThan(0);
        const stub = i18nModule().i18n;
        for (const method of used) {
            expect(typeof stub[method]).toBe('function');
        }
    });

    test('no test file writes its own stub by hand', () => {
        // The helper exists so the surface is complete in one place. A stub
        // written inline is a stub that will be missing whatever the next
        // module needs.
        const offenders = [];
        for (const file of testFiles()) {
            const source = readFileSync(file, 'utf8');
            if (!source.includes("mock.module('../../public/scripts/i18n/i18n.js'")) continue;
            // The call, not the import: a file can import the helper and still
            // hand mock.module a stub of its own, which is the whole problem.
            if (!source.includes("i18n/i18n.js', () => i18nModule")) {
                offenders.push(file.split(SEP).join('/'));
            }
        }
        expect(offenders).toEqual([]);
    });
});
