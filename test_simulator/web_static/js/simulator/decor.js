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
