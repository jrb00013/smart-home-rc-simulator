// Decorative props built from the procedural texture library.
//
// decor.js keeps the hand-modelled scene.js focused on the house itself. Each prop
// is registered with Decor.add(name, build) and builds a small THREE group using
// shared, pre-warmed materials from Tex. Props are added before collision collection
// and static batching (see initScene), so they collide and merge like native scene
// meshes and cost almost nothing at runtime.

var Decor = (function () {
    'use strict';

    var entries = [];
    var materialCache = {};

    function add(name, build) {
        entries.push({ name: name, build: build });
        return Decor;
    }

    // Declarative prop: { position, rotation, parts: [{ type, size, position, texture, color, ... }] }
    // Collapses most furniture into data, so adding a prop is a manifest entry rather
    // than a new builder function.
    function addSpec(name, spec) {
        add(name, function (api) {
            var full = { name: name, position: spec.position, rotation: spec.rotation, parts: spec.parts };
            return api.spec(full);
        });
        return Decor;
    }

    function mat(name, texName, matProps, texOpts) {
        var key = name;
        if (!materialCache[key]) {
            materialCache[key] = Tex.material(texName, texOpts || {}, matProps || {});
        }
        return materialCache[key];
    }

    function init() {
        if (typeof THREE === 'undefined') return null;
        if (typeof roomGroup === 'undefined' || !roomGroup) return null;

        var group = new THREE.Group();
        group.name = 'decor-props';

        function buildSpec(spec) {
            if (!spec || !spec.parts) return null;
            var g = new THREE.Group();
            var base = spec.position || [0, 0, 0];
            var rot = spec.rotation || [0, 0, 0];
            g.position.set(base[0], base[1], base[2]);
            g.rotation.set(rot[0], rot[1], rot[2]);
            g.name = spec.name || 'decor-prop';
            spec.parts.forEach(function (p) {
                var material;
                if (p.material) {
                    material = p.material;
                } else if (p.texture) {
                    material = mat('spec-' + p.texture + '-' + JSON.stringify(p.matProps || {}) + JSON.stringify(p.texOpts || {}),
                        p.texture, p.matProps || {}, p.texOpts || {});
                } else {
                    material = new THREE.MeshStandardMaterial({
                        color: p.color != null ? p.color : 0x8a8a8a,
                        roughness: p.roughness != null ? p.roughness : 0.8,
                        metalness: p.metalness || 0
                    });
                }
                var size = p.size || [1, 1, 1];
                var geo;
                if (p.type === 'cyl') {
                    geo = new THREE.CylinderGeometry(p.radiusTop != null ? p.radiusTop : size[0] / 2, p.radiusBottom != null ? p.radiusBottom : size[0] / 2, size[1], p.segments || 16);
                } else if (p.type === 'sphere') {
                    geo = new THREE.SphereGeometry(p.radius || 0.5, p.segments || 16, p.segments || 12);
                } else if (p.type === 'cone') {
                    geo = new THREE.ConeGeometry(p.radius || size[0] / 2, size[1], p.segments || 12);
                } else {
                    geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
                }
                var mesh = new THREE.Mesh(geo, material);
                var pp = p.position || [0, 0, 0];
                mesh.position.set(pp[0], pp[1], pp[2]);
                if (p.rotation) mesh.rotation.set(p.rotation[0], p.rotation[1], p.rotation[2]);
                if (p.scale) mesh.scale.set(p.scale[0], p.scale[1], p.scale[2]);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                g.add(mesh);
            });
            group.add(g);
            return g;
        }

        var api = {
            THREE: THREE,
            Tex: Tex,
            group: group,
            mat: mat,
            add: function (obj) { if (obj) group.add(obj); return obj; },
            box: function (w, h, d, material, x, y, z) {
                var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
                m.position.set(x || 0, y || 0, z || 0);
                m.castShadow = true;
                m.receiveShadow = true;
                group.add(m);
                return m;
            },
            cyl: function (rt, rb, h, seg, material, x, y, z) {
                var m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), material);
                m.position.set(x || 0, y || 0, z || 0);
                m.castShadow = true;
                m.receiveShadow = true;
                group.add(m);
                return m;
            },
            spec: buildSpec,
            sphere: function (r, seg, material, x, y, z) {
                var m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 16, seg || 12), material);
                m.position.set(x || 0, y || 0, z || 0);
                m.castShadow = true;
                m.receiveShadow = true;
                group.add(m);
                return m;
            }
        };

        var failures = 0;
        var built = 0;
        for (var i = 0; i < entries.length; i++) {
            try {
                var result = entries[i].build(api);
                if (result !== false) built++;
            } catch (err) {
                failures++;
                console.warn('Decor "' + entries[i].name + '" failed:', err);
            }
        }

        roomGroup.add(group);
        if (typeof FP !== 'undefined' && FP.registerDecor) {
            try { FP.registerDecor(group); } catch (err) { console.warn('Decor collision registration skipped:', err); }
        }
        return { built: built, registered: entries.length, failed: failures };
    }

    function reset() {
        entries.length = 0;
        materialCache = {};
    }

    return {
        add: add,
        addSpec: addSpec,
        init: init,
        reset: reset,
        entries: entries,
        count: function () { return entries.length; },
        material: mat
    };
})();

Decor.add('marble-side-table', function (api) {
    var top = api.mat('decor-marble', 'stone.marble', { roughness: 0.32, metalness: 0.05 });
    var leg = api.mat('decor-walnut', 'wood.walnut', { roughness: 0.55, metalness: 0.0 });
    api.cyl(0.52, 0.52, 0.07, 24, top, -16, 1.02, -12);
    api.cyl(0.06, 0.09, 1.0, 10, leg, -16, 0.51, -12);
    api.cyl(0.34, 0.34, 0.04, 20, leg, -16, 0.03, -12);
    return true;
});

Decor.add('oak-console', function (api) {
    var wood = api.mat('decor-oak', 'wood.oak', { roughness: 0.6 });
    api.box(4.0, 0.12, 1.1, wood, 15.5, 1.05, -20.4);
    api.box(0.12, 1.0, 1.0, wood, 13.7, 0.5, -20.4);
    api.box(0.12, 1.0, 1.0, wood, 17.3, 0.5, -20.4);
    api.box(3.6, 0.08, 0.9, wood, 15.5, 0.6, -20.4);
    return true;
});

Decor.add('leather-ottoman', function (api) {
    var hide = api.mat('decor-leather', 'leather', { roughness: 0.7, metalness: 0.0 }, { seed: 1701 });
    var m = api.cyl(0.9, 0.9, 0.45, 24, hide, 12, 0.45, 4);
    m.scale.set(1.3, 1, 1.3);
    api.cyl(0.92, 0.92, 0.05, 24, api.mat('decor-chrome', 'metal.chrome', { roughness: 0.25, metalness: 0.8 }), 12, 0.22, 4).scale.set(1.3, 1, 1.3);
    return true;
});

Decor.add('ceramic-vase-trio', function (api) {
    var clay = api.mat('decor-ceramic', 'tile.ceramic', { roughness: 0.35, metalness: 0.0 }, { repeat: [1, 1] });
    var terra = api.mat('decor-terracotta', 'stone.limestone', { roughness: 0.85 });
    api.cyl(0.16, 0.22, 0.9, 18, clay, -18.4, 0.45, -6.0);
    api.cyl(0.20, 0.16, 0.65, 18, terra, -17.8, 0.33, -6.6);
    api.sphere(0.26, 16, clay, -18.4, 0.26, -6.8);
    return true;
});

Decor.add('fern-planter', function (api) {
    var pot = api.mat('decor-terracotta2', 'stone.limestone', { roughness: 0.9 }, { seed: 3301 });
    api.cyl(0.42, 0.32, 0.7, 20, pot, -18, 0.35, 10);
    var leaf = new THREE.MeshStandardMaterial({ color: 0x2f6a2f, roughness: 0.8, side: THREE.DoubleSide });
    for (var i = 0; i < 14; i++) {
        var a = (i / 14) * Math.PI * 2;
        var frond = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.3, 6), leaf);
        frond.position.set(-18 + Math.cos(a) * 0.18, 1.25, 10 + Math.sin(a) * 0.18);
        frond.rotation.z = Math.cos(a) * 0.6;
        frond.rotation.x = Math.sin(a) * 0.6;
        frond.castShadow = true;
        api.add(frond);
    }
    return true;
});

Decor.add('denim-floor-cushion', function (api) {
    var denim = api.mat('decor-denim', 'fabric.upholstery', { roughness: 0.95 }, { base: '#3a4a66', seed: 1503 });
    var c = api.box(1.4, 0.28, 1.4, denim, 8, 0.16, -6);
    c.rotation.y = 0.3;
    return true;
});

Decor.add('wall-clock', function (api) {
    var chrome = api.mat('decor-chrome2', 'metal.chrome', { roughness: 0.2, metalness: 0.85 });
    var face = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.5 });
    var clock = new THREE.Group();
    var rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 12, 32), chrome);
    var dial = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), face);
    dial.position.z = 0.02;
    clock.add(rim); clock.add(dial);
    for (var i = 0; i < 12; i++) {
        var a = (i / 12) * Math.PI * 2;
        var tick = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 0.02), chrome);
        tick.position.set(Math.sin(a) * 0.4, Math.cos(a) * 0.4, 0.04);
        tick.rotation.z = -a;
        clock.add(tick);
    }
    clock.position.set(11, 7.4, -21.4);
    api.add(clock);
    return true;
});

Decor.add('framed-canvas', function (api) {
    var frameMat = api.mat('decor-walnut2', 'wood.walnut', { roughness: 0.5 });
    var canvas = new THREE.MeshStandardMaterial({ color: 0x24506e, roughness: 0.85 });
    var g = new THREE.Group();
    var f = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 0.1), frameMat);
    var art = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.4), canvas);
    art.position.z = 0.06;
    g.add(f); g.add(art);
    g.position.set(-21.3, 6.4, 3);
    g.rotation.y = Math.PI / 2;
    api.add(g);
    return true;
});

Decor.addSpec('oval-wool-rug', {
    position: [6, 0.02, -8],
    parts: [
        { type: 'cyl', size: [4.6, 0.03], texture: 'carpet.pile', texOpts: { base: '#7a4a3a', repeat: [2, 2] }, matProps: { roughness: 0.98 }, scale: [1.5, 1, 1] },
        { type: 'cyl', size: [3.6, 0.035], texture: 'fabric.tweed', texOpts: { base: '#8a5a44' }, matProps: { roughness: 0.95 }, scale: [1.5, 1, 1] }
    ]
});

Decor.addSpec('walnut-bookshelf', {
    position: [-20.2, 0, -16],
    parts: [
        { size: [0.18, 4.2, 3.2], texture: 'wood.walnut', position: [0, 2.1, -1.5] },
        { size: [0.18, 4.2, 3.2], texture: 'wood.walnut', position: [0, 2.1, 1.5] },
        { size: [0.9, 0.12, 3.2], texture: 'wood.walnut', position: [0.4, 0.06, 0] },
        { size: [0.9, 0.12, 3.2], texture: 'wood.walnut', position: [0.4, 2.1, 0] },
        { size: [0.9, 0.12, 3.2], texture: 'wood.walnut', position: [0.4, 4.1, 0] },
        { size: [0.8, 1.4, 0.9], color: 0x24506e, position: [0.4, 0.85, -0.9] },
        { size: [0.7, 1.1, 0.6], color: 0x7a3030, position: [0.4, 0.7, 0.1] },
        { size: [0.75, 1.25, 0.7], color: 0x2f6a4a, position: [0.4, 0.78, 0.95] }
    ]
});

Decor.addSpec('floor-lamp', {
    position: [-14, 0, -18.5],
    parts: [
        { type: 'cyl', size: [0.9, 0.12], texture: 'metal.chrome', matProps: { metalness: 0.8, roughness: 0.25 }, position: [0, 0.12, 0] },
        { type: 'cyl', size: [0.09, 4.2], texture: 'metal.chrome', matProps: { metalness: 0.8, roughness: 0.25 }, position: [0, 2.2, 0] },
        { type: 'cyl', radiusTop: 0.55, radiusBottom: 0.85, size: [1.7, 1.1], texture: 'fabric.linen', texOpts: { base: '#efe6d2' }, matProps: { roughness: 0.9 }, position: [0, 4.4, 0] }
    ]
});
