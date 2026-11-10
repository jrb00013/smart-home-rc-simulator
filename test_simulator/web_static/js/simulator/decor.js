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
