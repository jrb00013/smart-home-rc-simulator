// Procedural texture library for the 3D simulator.
//
// Every texture is painted onto an offscreen 2D canvas at load time, so the scene
// needs no bundled image assets and keeps working fully offline. Generators are
// registered by name and cached, so requesting the same texture twice is free.
//
//   Tex.define('wood.oak', function (ctx, w, h, o) { ... });
//   var tex = Tex.texture('wood.oak', { repeat: [2, 2], tint: '#8a5a2b' });
//
// A generator receives a 2D context sized w x h plus the resolved options object
// and draws a seamlessly tileable pattern in device pixels. `texture()` returns a
// THREE.CanvasTexture configured for repeating and anisotropic filtering.

var Tex = (function () {
    'use strict';

    var registry = {};
    var cache = {};

    function canvas(w, h) {
        var c = document.createElement('canvas');
        c.width = Math.max(1, w | 0);
        c.height = Math.max(1, h | 0);
        return c;
    }

    // mulberry32: small deterministic PRNG so the same seed paints the same texture.
    function rng(seed) {
        var a = (seed >>> 0) || 0x9e3779b9;
        return function () {
            a |= 0;
            a = (a + 0x6d2b79f5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Sprinkle per-pixel speckles. Used by most tactile surfaces (fabric, stone...).
    function speckle(ctx, w, h, opts) {
        opts = opts || {};
        var rand = rng(opts.seed || 1);
        var count = opts.count != null ? opts.count : Math.round(w * h * 0.02);
        var size = opts.size || 2;
        var base = opts.base || [0, 0, 0];
        var spread = opts.spread != null ? opts.spread : 40;
        var alpha = opts.alpha != null ? opts.alpha : 0.35;
        for (var i = 0; i < count; i++) {
            var d = (rand() - 0.5) * spread;
            var r = Math.max(0, Math.min(255, base[0] + d));
            var g = Math.max(0, Math.min(255, base[1] + d));
            var b = Math.max(0, Math.min(255, base[2] + d));
            ctx.fillStyle = 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + alpha + ')';
            var s = size * (0.4 + rand());
            ctx.fillRect(rand() * w, rand() * h, s, s);
        }
    }

    // Fill the canvas with a vertical linear gradient described by [stop, cssColor] pairs.
    function verticalGradient(ctx, w, h, stops) {
        var grad = ctx.createLinearGradient(0, 0, 0, h);
        stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // Wrap-aware line: draws at x and at x +/- w so patterns tile horizontally.
    function wrappedLine(ctx, w, x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1 - w, y1);
        ctx.lineTo(x2 - w, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1 + w, y1);
        ctx.lineTo(x2 + w, y2);
        ctx.stroke();
    }

    function define(name, draw, defaults) {
        registry[name] = { draw: draw, defaults: defaults || {} };
    }

    function resolve(name, options) {
        var entry = registry[name];
        if (!entry) return null;
        var out = {};
        var k;
        for (k in entry.defaults) if (Object.prototype.hasOwnProperty.call(entry.defaults, k)) out[k] = entry.defaults[k];
        if (options) for (k in options) if (Object.prototype.hasOwnProperty.call(options, k)) out[k] = options[k];
        return { entry: entry, opts: out };
    }

    function key(name, opts) {
        var parts = [name];
        var keys = Object.keys(opts).sort();
        for (var i = 0; i < keys.length; i++) parts.push(keys[i] + '=' + opts[keys[i]]);
        return parts.join('|');
    }

    // Paint (or fetch from cache) a raw canvas for a named texture.
    function surface(name, options) {
        var r = resolve(name, options);
        if (!r) throw new Error('Tex: unknown texture "' + name + '"');
        var k = key(name, r.opts);
        if (cache[k]) return cache[k];
        var w = r.opts.width || 256;
        var h = r.opts.height || 256;
        var c = canvas(w, h);
        var ctx = c.getContext('2d');
        r.entry.draw(ctx, c.width, c.height, r.opts);
        cache[k] = c;
        return c;
    }

    // Return a ready-to-use THREE.CanvasTexture with repeat/wrap applied.
    function texture(name, options) {
        var r = resolve(name, options);
        if (!r) throw new Error('Tex: unknown texture "' + name + '"');
        var c = surface(name, options);
        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        if (r.opts.repeat) {
            tex.repeat.set(r.opts.repeat[0], r.opts.repeat[1]);
        }
        tex.anisotropy = r.opts.anisotropy || 8;
        if (r.opts.magFilter) tex.magFilter = r.opts.magFilter;
        tex.needsUpdate = true;
        return tex;
    }

    // Convenience: MeshStandardMaterial wired to a named texture.
    function material(name, options, matProps) {
        var props = matProps || {};
        var texOpts = options || {};
        var mat = new THREE.MeshStandardMaterial(Object.assign({
            map: texture(name, texOpts),
            roughness: 0.8,
            metalness: 0.0
        }, props));
        return mat;
    }

    function has(name) { return Object.prototype.hasOwnProperty.call(registry, name); }
    function list() { return Object.keys(registry).sort(); }
    function clearCache() { cache = {}; }

    return {
        canvas: canvas,
        rng: rng,
        speckle: speckle,
        verticalGradient: verticalGradient,
        wrappedLine: wrappedLine,
        define: define,
        surface: surface,
        texture: texture,
        material: material,
        has: has,
        list: list,
        clearCache: clearCache
    };
})();

// ---- Wood species and plank patterns ----
Tex.define('wood.oak', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 101);
    ctx.fillStyle = o.base || '#b07a45';
    ctx.fillRect(0, 0, w, h);
    var planks = o.planks || 4;
    var ph = h / planks;
    for (var p = 0; p < planks; p++) {
        var y0 = p * ph;
        var shade = -14 + rand() * 28;
        ctx.fillStyle = 'rgba(' + ((86 + shade) | 0) + ',' + ((54 + shade * 0.7) | 0) + ',' + ((28 + shade * 0.5) | 0) + ',0.35)';
        ctx.fillRect(0, y0, w, ph - 1);
        for (var g = 0; g < 26; g++) {
            var gy = y0 + 2 + rand() * (ph - 4);
            ctx.strokeStyle = 'rgba(60,36,16,' + (0.05 + rand() * 0.12) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, gy);
            var cx = 0;
            while (cx < w) { cx += 8 + rand() * 22; ctx.lineTo(cx, gy + (rand() - 0.5) * 3); }
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(30,18,8,0.55)';
        ctx.fillRect(0, y0 + ph - 1, w, 1);
    }
    Tex.speckle(ctx, w, h, { seed: (o.seed || 101) + 7, count: Math.round(w * h / 900), size: 2, base: [90, 60, 30], spread: 30, alpha: 0.12 });
});

Tex.define('wood.walnut', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 202);
    ctx.fillStyle = o.base || '#5a3a22';
    ctx.fillRect(0, 0, w, h);
    for (var g = 0; g < 70; g++) {
        var y = rand() * h;
        ctx.strokeStyle = 'rgba(' + (30 + rand() * 40 | 0) + ',' + (18 + rand() * 24 | 0) + ',10,' + (0.06 + rand() * 0.14) + ')';
        ctx.lineWidth = 0.6 + rand() * 1.8;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (rand() - 0.5) * 8);
        ctx.stroke();
    }
    for (var k = 0; k < 5; k++) {
        var kx = rand() * w, ky = rand() * h;
        ctx.strokeStyle = 'rgba(24,12,6,0.45)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(kx, ky, 6 + rand() * 8, 2 + rand() * 3, rand() * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
    }
    Tex.speckle(ctx, w, h, { seed: 209, count: Math.round(w * h / 1100), size: 2, base: [60, 38, 22], spread: 26, alpha: 0.14 });
});

Tex.define('wood.parquet', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 303);
    ctx.fillStyle = o.base || '#9a6a3c';
    ctx.fillRect(0, 0, w, h);
    var cols = o.cols || 4;
    var rows = o.rows || 4;
    var bw = w / cols, bh = h / rows;
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var vertical = ((r + c) % 2) === 0;
            var x = c * bw, y = r * bh;
            var t = -10 + rand() * 20;
            ctx.fillStyle = 'rgba(' + ((120 + t) | 0) + ',' + ((82 + t) | 0) + ',' + ((44 + t) | 0) + ',0.9)';
            ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
            ctx.strokeStyle = 'rgba(40,24,12,0.5)';
            ctx.lineWidth = 1;
            for (var i = 1; i < 6; i++) {
                ctx.beginPath();
                if (vertical) { ctx.moveTo(x + (bw / 6) * i, y + 2); ctx.lineTo(x + (bw / 6) * i, y + bh - 2); }
                else { ctx.moveTo(x + 2, y + (bh / 6) * i); ctx.lineTo(x + bw - 2, y + (bh / 6) * i); }
                ctx.stroke();
            }
            ctx.strokeStyle = 'rgba(30,18,8,0.85)';
            ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
        }
    }
});

// ---- Stone and aggregate surfaces ----
Tex.define('stone.marble', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 606);
    ctx.fillStyle = o.base || '#e8e6e0';
    ctx.fillRect(0, 0, w, h);
    for (var v = 0; v < 18; v++) {
        var x = rand() * w, y = rand() * h;
        ctx.strokeStyle = 'rgba(' + (110 + rand() * 60 | 0) + ',' + (110 + rand() * 60 | 0) + ',' + (120 + rand() * 60 | 0) + ',' + (0.12 + rand() * 0.2) + ')';
        ctx.lineWidth = 0.5 + rand() * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        var steps = 8 + (rand() * 10 | 0);
        for (var s = 0; s < steps; s++) { x += (rand() - 0.3) * 26; y += (rand() - 0.5) * 18; ctx.lineTo(x, y); }
        ctx.stroke();
    }
    Tex.speckle(ctx, w, h, { seed: 611, count: Math.round(w * h / 2500), size: 1, base: [200, 198, 194], spread: 24, alpha: 0.2 });
});

Tex.define('stone.granite', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 707);
    ctx.fillStyle = o.base || '#6c6c70';
    ctx.fillRect(0, 0, w, h);
    var chips = ['#2f2f33', '#8a8a90', '#b4b4ba', '#5a3a30', '#4a4a52'];
    ctx.globalAlpha = 0.5;
    for (var i = 0; i < Math.round(w * h / 60); i++) {
        ctx.fillStyle = chips[(rand() * chips.length) | 0];
        var s = 1 + rand() * 3.5;
        ctx.beginPath();
        ctx.arc(rand() * w, rand() * h, s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
});

Tex.define('stone.slate', function (ctx, w, h, o) {
    var rand = Tex.rng(o.seed || 808);
    ctx.fillStyle = o.base || '#3d4450';
    ctx.fillRect(0, 0, w, h);
    var rows = o.rows || 6;
    for (var r = 0; r < rows; r++) {
        var y = (r / rows) * h;
        var rh = h / rows;
        ctx.fillStyle = 'rgba(' + (50 + rand() * 20 | 0) + ',' + (58 + rand() * 20 | 0) + ',' + (70 + rand() * 20 | 0) + ',0.5)';
        ctx.fillRect(0, y, w, rh - 1);
        ctx.fillStyle = 'rgba(20,24,30,0.7)';
        ctx.fillRect(0, y + rh - 1, w, 1);
    }
    Tex.speckle(ctx, w, h, { seed: 813, count: Math.round(w * h / 500), size: 2, base: [70, 78, 92], spread: 30, alpha: 0.16 });
});
