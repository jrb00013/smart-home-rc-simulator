// Headless unit tests for the vanilla simulator modules.
//
// textures.js, palette.js and environment.js are classic <script> files that share
// one global scope in the browser. Here we evaluate them in a node:vm context with
// a stub 2D canvas and a tiny THREE shim, which lets us exercise the pure parts
// (registry, RNG, caching, palette integrity, presets) without a browser.
//
//   node scripts/test-modules.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const jsDir = join(here, '..', 'web_static', 'js', 'simulator');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log('  ok   ' + name);
    } catch (err) {
        failed++;
        failures.push({ name, err });
        console.log('  FAIL ' + name + ' -> ' + err.message);
    }
}

function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error((msg || 'values differ') + ' (expected ' + expected + ', got ' + actual + ')');
    }
}

function makeCtx() {
    const gradient = { addColorStop() {} };
    const base = {
        createLinearGradient: () => gradient,
        createRadialGradient: () => gradient,
        createPattern: () => ({}),
        measureText: () => ({ width: 8 }),
        getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
    };
    return new Proxy(base, {
        get(target, prop) {
            if (prop in target) return target[prop];
            return () => undefined;
        },
        set() { return true; }
    });
}

function makeDocument() {
    return {
        createElement(tag) {
            if (tag !== 'canvas') return { style: {}, appendChild() {} };
            const canvas = {
                width: 0,
                height: 0,
                getContext() { return makeCtx(); },
                toDataURL() { return 'data:,'; }
            };
            return canvas;
        }
    };
}

class StubColor {
    constructor(hex) { this.hex = hex || 0; }
    setHex(hex) { this.hex = hex; return this; }
    copy(other) { this.hex = other.hex; return this; }
    lerp(other, t) { this.hex = t >= 1 ? other.hex : this.hex; return this; }
}

class StubTexture {
    constructor(source) { this.source = source; this.repeat = { set() {} }; this.needsUpdate = false; }
}

class StubMaterial {
    constructor(props) { Object.assign(this, props || {}); }
}

const THREE = {
    RepeatWrapping: 1000,
    Color: StubColor,
    CanvasTexture: StubTexture,
    MeshStandardMaterial: StubMaterial
};

function loadModules() {
    const sandbox = { console, document: makeDocument(), THREE, Math, Object, Array, Float32Array, Uint8ClampedArray };
    sandbox.globalThis = sandbox;
    const context = vm.createContext(sandbox);
    for (const file of ['textures.js', 'palette.js', 'environment.js']) {
        const code = readFileSync(join(jsDir, file), 'utf8');
        vm.runInContext(code, context, { filename: file });
    }
    return context;
}

console.log('simulator module tests');
const ctx = loadModules();
const Tex = ctx.Tex;
const Env = ctx.Env;

test('textures module exposes the Tex registry', () => {
    assert(Tex && typeof Tex.define === 'function', 'Tex missing');
    assert(typeof Tex.surface === 'function', 'surface missing');
    assert(typeof Tex.variant === 'function', 'variant missing');
});

test('environment module exposes the Env state machine', () => {
    assert(Env && typeof Env.init === 'function', 'Env missing');
    assert(typeof Env.preset === 'function', 'preset missing');
});

test('rng is deterministic for a given seed', () => {
    const a = Tex.rng(1234);
    const b = Tex.rng(1234);
    for (let i = 0; i < 5; i++) assertEqual(a(), b(), 'rng diverged at ' + i);
});

test('rng output stays in [0, 1)', () => {
    const r = Tex.rng(7);
    for (let i = 0; i < 1000; i++) {
        const v = r();
        assert(v >= 0 && v < 1, 'rng out of range: ' + v);
    }
});

test('surface caches a canvas per name/options key', () => {
    const first = Tex.surface('wood.oak');
    const second = Tex.surface('wood.oak');
    assertEqual(first, second, 'expected cached canvas');
});

test('clearCache forces a fresh surface', () => {
    const before = Tex.surface('stone.marble');
    Tex.clearCache();
    const after = Tex.surface('stone.marble');
    assert(before !== after, 'expected a new canvas after clearCache');
});

test('unknown texture names throw', () => {
    let threw = false;
    try { Tex.surface('does.not.exist'); } catch (e) { threw = true; }
    assert(threw, 'expected surface() to throw for unknown name');
});

test('the built-in registry contains the documented families', () => {
    const names = Tex.list();
    for (const n of ['wood.oak', 'wood.bamboo', 'stone.marble', 'tile.subway', 'brick.red', 'paint.wall', 'metal.brushed', 'carpet.pile']) {
        assert(names.includes(n), 'missing texture ' + n);
    }
});

test('every registered texture paints without throwing', () => {
    for (const name of Tex.list()) {
        try { Tex.surface(name); } catch (e) {
            throw new Error('texture "' + name + '" failed: ' + e.message);
        }
    }
});

test('palette variants resolve and paint', () => {
    for (const name of Tex.list()) {
        if (!name.includes('.')) continue;
        Tex.surface(name);
    }
    assert(Tex.has('oak.dark'), 'palette entry oak.dark missing');
    assert(Tex.has('paint.sage'), 'palette entry paint.sage missing');
});

test('variant rejects an unknown base generator', () => {
    let threw = false;
    try { Tex.variant('bogus', 'no.such.base', {}); } catch (e) { threw = true; }
    assert(threw, 'expected variant() to throw for unknown base');
});

test('material wires a texture map through THREE.MeshStandardMaterial', () => {
    const mat = Tex.material('wood.oak', { repeat: [2, 3] }, { roughness: 0.5 });
    assert(mat.map instanceof StubTexture, 'map is not a texture');
    assertEqual(mat.roughness, 0.5, 'material props not applied');
});

test('environment presets expose the expected names', () => {
    for (const n of ['dawn', 'morning', 'noon', 'golden', 'dusk', 'night', 'rainy', 'snowy', 'foggy', 'stormy']) {
        assert(Env.PRESETS[n], 'missing preset ' + n);
    }
});


test('daylightAt is 0 at midnight and full at noon', () => {
    assertEqual(Env.daylightAt(0), 0, 'midnight');
    assertEqual(Env.daylightAt(12), 1, 'noon');
});

test('daylightAt ramps during dawn and dusk', () => {
    const dawn = Env.daylightAt(6.5);
    const dusk = Env.daylightAt(19.5);
    assert(dawn > 0 && dawn < 1, 'dawn ramp: ' + dawn);
    assert(dusk > 0 && dusk < 1, 'dusk ramp: ' + dusk);
});

test('formatClock renders zero-padded HH:MM', () => {
    assertEqual(Env.formatClock(9), '09:00', '9am');
    assertEqual(Env.formatClock(18.5), '18:30', '6:30pm');
    assertEqual(Env.formatClock(0.25), '00:15', 'quarter past midnight');
});

test('formatClock wraps hours past a full day', () => {
    assertEqual(Env.formatClock(25), '01:00', '25h');
    assertEqual(Env.formatClock(-1), '23:00', 'negative hour');
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) {
    for (const f of failures) console.error('\n' + f.name + '\n' + (f.err.stack || f.err.message));
    process.exit(1);
}
