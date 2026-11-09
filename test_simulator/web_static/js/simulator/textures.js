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
