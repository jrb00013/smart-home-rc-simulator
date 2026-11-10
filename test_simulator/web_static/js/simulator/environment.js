// Time-of-day, weather and ambient effects for the 3D simulator.
//
// environment.js owns a lightweight state machine (clock in hours, weather id,
// wind) and drives the existing scene lights, sky dome tint and fog from it.
// Visual "effects" (stars, rain, fireflies, ...) register themselves with
// Env.addEffect(name, build): build(api) returns { update(dt) } and is created on
// Env.init() and ticked from the render loop. Keeping effects as separate
// registrations means each can live in its own commit and fail in isolation.

var Env = (function () {
    'use strict';

    var effects = [];
    var state = {
        enabled: false,
        initialized: false,
        time: 9.0,          // hours, 0..24
        timeScale: 0.0,     // hours advanced per real second (0 = frozen)
        weather: 'clear',   // clear | rain | snow | storm | fog
        wind: 0.35,
        daylight: 1.0
    };
    var refs = { scene: null, skyDome: null, sun: null, ambient: null, hemi: null };
    var api = null;

    // hour-keyed colour ramps; the clock interpolates between neighbouring stops.
    var SKY_STOPS = [
        [0, 0x0a1020], [5, 0x24304a], [7, 0x6a86b0], [12, 0x8ac8f5],
        [17, 0xa8d0f0], [19, 0x3a4a80], [21, 0x101830], [24, 0x0a1020]
    ];
    var FOG_STOPS = [
        [0, 0x0e1526], [5, 0x3a4258], [7, 0xd8a070], [12, 0xb8d4ec],
        [17, 0xc4dcf0], [19, 0xc07850], [21, 0x1a2440], [24, 0x0e1526]
    ];
    var SUN_STOPS = [
        [0, 0x334466], [6, 0xff9a4a], [8, 0xffd9a0], [12, 0xfff4e0],
        [17, 0xffe0b0], [19, 0xff7a3a], [21, 0x334466], [24, 0x334466]
    ];

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function hourColor(stops, hour, target) {
        var h = ((hour % 24) + 24) % 24;
        for (var i = 0; i < stops.length - 1; i++) {
            var a = stops[i], b = stops[i + 1];
            if (h >= a[0] && h <= b[0]) {
                var t = b[0] === a[0] ? 0 : (h - a[0]) / (b[0] - a[0]);
                target.setHex(a[1]);
                var tmp = new THREE.Color(b[1]);
                target.lerp(tmp, t);
                return target;
            }
        }
        target.setHex(stops[0][1]);
        return target;
    }

    function daylightAt(hour) {
        var h = ((hour % 24) + 24) % 24;
        if (h < 5 || h >= 21) return 0;
        if (h < 8) return (h - 5) / 3;
        if (h < 18) return 1;
        return 1 - (h - 18) / 3;
    }

    var _sunColor = null, _skyColor = null, _fogTmp = null;
    var _nightTint = null, _dayTint = null;

    function apply() {
        if (!refs.scene) return;
        if (!_sunColor) {
            _sunColor = new THREE.Color();
            _skyColor = new THREE.Color();
            _fogTmp = new THREE.Color();
            _nightTint = new THREE.Color(0x2a3350);
            _dayTint = new THREE.Color(0xffffff);
        }
        var hour = state.time;
        var day = daylightAt(hour);
        state.daylight = day;

        hourColor(SKY_STOPS, hour, _skyColor);
        if (refs.scene.background && refs.scene.background.isColor) {
            refs.scene.background.copy(_skyColor);
        }
        if (refs.scene.fog) {
            hourColor(FOG_STOPS, hour, _fogTmp);
            refs.scene.fog.color.copy(_fogTmp);
            var far = 46 + day * 60;
            if (state.weather === 'fog') far = 34;
            refs.scene.fog.far = far;
        }
        if (refs.skyDome && refs.skyDome.material) {
            _fogTmp.copy(_dayTint).lerp(_nightTint, clamp(1 - day, 0, 1) * 0.82);
            if (refs.skyDome.material.color) refs.skyDome.material.color.copy(_fogTmp);
        }
        if (refs.sun) {
            var theta = ((hour - 6) / 12) * Math.PI;
            refs.sun.position.set(Math.cos(theta) * 150, Math.sin(theta) * 130, -70);
            refs.sun.visible = Math.sin(theta) > -0.15;
            hourColor(SUN_STOPS, hour, _sunColor);
            refs.sun.color.copy(_sunColor);
            refs.sun.intensity = day * 1.6;
        }
        if (refs.ambient) refs.ambient.intensity = 0.08 + day * 0.34;
        if (refs.hemi) refs.hemi.intensity = 0.12 + day * 0.48;
    }

    function addEffect(name, build) {
        effects.push({ name: name, build: build, instance: null });
        if (state.initialized && api) {
            try { effects[effects.length - 1].instance = build(api); }
            catch (err) { console.warn('Env effect "' + name + '" failed to start:', err); }
        }
        return Env;
    }

    function init() {
        if (typeof scene === 'undefined' || !scene || typeof THREE === 'undefined') return null;
        refs.scene = scene;
        refs.skyDome = (typeof findSkyDome === 'function') ? findSkyDome() : null;
        scene.traverse(function (o) {
            if (o.isAmbientLight && !refs.ambient) refs.ambient = o;
            if (o.isHemisphereLight && !refs.hemi) refs.hemi = o;
            if (o.isDirectionalLight && !refs.sun) refs.sun = o;
        });
        api = { THREE: THREE, scene: scene, state: state, refs: refs };
        var failures = 0;
        var started = 0;
        for (var i = 0; i < effects.length; i++) {
            try {
                effects[i].instance = effects[i].build(api);
                started++;
            } catch (err) {
                failures++;
                console.warn('Env effect "' + effects[i].name + '" failed to start:', err);
            }
        }
        state.initialized = true;
        state.enabled = true;
        apply();
        var WEATHER_ORDER = ['clear', 'rain', 'snow', 'storm', 'fog'];

    function getState() {
        var PRESETS = {
        dawn:    { time: 5.5,  weather: 'clear', wind: 0.2, timeScale: 0 },
        morning: { time: 8.0,  weather: 'clear', wind: 0.3, timeScale: 0 },
        noon:    { time: 12.0, weather: 'clear', wind: 0.25, timeScale: 0 },
        golden:  { time: 17.5, weather: 'clear', wind: 0.3, timeScale: 0 },
        dusk:    { time: 19.5, weather: 'clear', wind: 0.25, timeScale: 0 },
        night:   { time: 22.0, weather: 'clear', wind: 0.15, timeScale: 0 },
        rainy:   { time: 14.0, weather: 'rain',  wind: 0.55, timeScale: 0 },
        snowy:   { time: 14.0, weather: 'snow',  wind: 0.3, timeScale: 0 },
        foggy:   { time: 7.0,  weather: 'fog',   wind: 0.1, timeScale: 0 },
        stormy:  { time: 15.0, weather: 'storm', wind: 0.9, timeScale: 0 }
    };

    function preset(name) {
        var p = PRESETS[name];
        if (!p) { console.warn('Env.preset: unknown preset "' + name + '"'); return Env; }
        state.time = ((p.time % 24) + 24) % 24;
        state.weather = p.weather;
        state.wind = p.wind;
        state.timeScale = p.timeScale;
        apply();
        return Env;
    }

    function pause() { state.enabled = false; return Env; }
    function resume() { if (state.initialized) state.enabled = true; return Env; }
    function toggle() { state.enabled = !state.enabled; return Env; }

    return {
            time: state.time,
            weather: state.weather,
            wind: state.wind,
            daylight: state.daylight,
            timeScale: state.timeScale,
            enabled: state.enabled
        };
    }

    function cycleWeather(step) {
        var i = WEATHER_ORDER.indexOf(state.weather);
        if (i < 0) i = 0;
        var n = WEATHER_ORDER.length;
        var d = (step === undefined) ? 1 : step;
        setWeather(WEATHER_ORDER[((i + d) % n + n) % n]);
        return Env;
    }

    return { effects: effects.length, started: started, failed: failures };
    }

    function update(dt) {
        if (!state.enabled) return;
        if (state.timeScale) {
            state.time = (state.time + state.timeScale * dt) % 24;
            if (state.time < 0) state.time += 24;
        }
        apply();
        for (var i = 0; i < effects.length; i++) {
            var inst = effects[i].instance;
            if (inst && typeof inst.update === 'function') {
                try { inst.update(dt, state); }
                catch (err) { console.warn('Env effect "' + effects[i].name + '" update failed:', err); }
            }
        }
    }

    function setTime(hour) { state.time = ((hour % 24) + 24) % 24; apply(); }
    function getTime() { return state.time; }
    function setWeather(weather) { state.weather = weather; apply(); }
    function setTimeScale(scale) { state.timeScale = Math.max(0, scale || 0); }
    function setWind(w) { state.wind = clamp(w, 0, 1); }

    return {
        state: state,
        init: init,
        update: update,
        addEffect: addEffect,
        setTime: setTime,
        getTime: getTime,
        setWeather: setWeather,
        setTimeScale: setTimeScale,
        setWind: setWind,
        getState: getState,
        cycleWeather: cycleWeather,
        WEATHER_ORDER: WEATHER_ORDER,
        preset: preset,
        PRESETS: PRESETS,
        pause: pause,
        resume: resume,
        toggle: toggle,
        effects: effects
    };
})();

// Star field: a shell of points that fades in after dusk.
Env.addEffect('stars', function (api) {
    var THREE = api.THREE;
    var count = 900;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3);
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4001) : Math.random;
    for (var i = 0; i < count; i++) {
        var u = rand() * Math.PI * 2;
        var v = Math.acos(1 - rand() * 0.9);
        var r = 320;
        pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
        pos[i * 3 + 1] = Math.cos(v) * r + 20;
        pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, transparent: true, opacity: 0, depthWrite: false });
    var points = new THREE.Points(geo, mat);
    points.name = 'env-stars';
    api.scene.add(points);
    var t = 0;
    return {
        update: function (dt, st) {
            var target = Math.max(0, (1 - st.daylight) - 0.25) / 0.75;
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3);
            t += dt;
            mat.size = 1.2 + Math.sin(t * 2) * 0.15;
            points.visible = mat.opacity > 0.02;
        }
    };
});

// Moon: a pale disc opposite the sun, only above the horizon at night.
Env.addEffect('moon', function (api) {
    var THREE = api.THREE;
    var mat = new THREE.MeshBasicMaterial({ color: 0xdfe6f2, transparent: true, opacity: 0, fog: false });
    var moon = new THREE.Mesh(new THREE.SphereGeometry(7, 24, 16), mat);
    moon.name = 'env-moon';
    api.scene.add(moon);
    var glowCanvas = (typeof Tex !== 'undefined') ? Tex.canvas(128, 128) : document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 128;
    var gctx = glowCanvas.getContext('2d');
    var grd = gctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grd.addColorStop(0, 'rgba(210,224,255,0.5)');
    grd.addColorStop(0.4, 'rgba(180,200,240,0.15)');
    grd.addColorStop(1, 'rgba(180,200,240,0)');
    gctx.fillStyle = grd;
    gctx.fillRect(0, 0, 128, 128);
    var halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    halo.name = 'env-moon-halo';
    halo.scale.set(46, 46, 1);
    api.scene.add(halo);
    return {
        update: function (dt, st) {
            var night = 1 - st.daylight;
            var target = Math.max(0, night - 0.2) / 0.8;
            var theta = ((st.time - 18) / 12) * Math.PI;
            var x = Math.cos(theta) * 150;
            var y = Math.sin(theta) * 130;
            moon.position.set(-x, y, -70);
            halo.position.copy(moon.position);
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 2);
            halo.material.opacity = mat.opacity * 0.8;
            moon.visible = halo.visible = mat.opacity > 0.02 && y > 10;
        }
    };
});

// Drifting cloud sprites high above the neighbourhood.
Env.addEffect('clouds', function (api) {
    var THREE = api.THREE;
    var c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    var ctx = c.getContext('2d');
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4100) : Math.random;
    for (var b = 0; b < 26; b++) {
        var x = 40 + rand() * 176, y = 50 + rand() * 40, r = 18 + rand() * 34;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.5)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 128);
    }
    var cloudTex = new THREE.CanvasTexture(c);
    var group = new THREE.Group();
    group.name = 'env-clouds';
    var clouds = [];
    for (var i = 0; i < 10; i++) {
        var m = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5, depthWrite: false, fog: false });
        var s = new THREE.Sprite(m);
        s.position.set(-160 + rand() * 320, 70 + rand() * 45, -180 + rand() * 120);
        var sc = 40 + rand() * 70;
        s.scale.set(sc, sc * 0.5, 1);
        group.add(s);
        clouds.push({ sprite: s, speed: 1.5 + rand() * 3 });
    }
    api.scene.add(group);
    return {
        update: function (dt, st) {
            for (var i = 0; i < clouds.length; i++) {
                var cl = clouds[i];
                cl.sprite.position.x += cl.speed * dt * (0.4 + st.wind);
                if (cl.sprite.position.x > 200) cl.sprite.position.x = -200;
                cl.sprite.material.opacity = 0.18 + st.daylight * 0.35;
            }
        }
    };
});

// Rain: a column of falling points around the house, active in rain/storm weather.
Env.addEffect('rain', function (api) {
    var THREE = api.THREE;
    var count = 1800;
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(count * 3);
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4200) : Math.random;
    for (var i = 0; i < count; i++) {
        arr[i * 3] = rand() * 120 - 60;
        arr[i * 3 + 1] = rand() * 44;
        arr[i * 3 + 2] = rand() * 120 - 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage));
    var mat = new THREE.PointsMaterial({ color: 0xa8c6e6, size: 0.28, transparent: true, opacity: 0, depthWrite: false });
    var points = new THREE.Points(geo, mat);
    points.name = 'env-rain';
    api.scene.add(points);
    return {
        update: function (dt, st) {
            var active = st.weather === 'rain' || st.weather === 'storm';
            var target = active ? (st.weather === 'storm' ? 0.75 : 0.5) : 0;
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 2);
            points.visible = mat.opacity > 0.02;
            if (!points.visible) return;
            var fall = (st.weather === 'storm' ? 40 : 27) * dt;
            for (var i = 0; i < count; i++) {
                arr[i * 3 + 1] -= fall;
                if (arr[i * 3 + 1] < 0) {
                    arr[i * 3 + 1] = 44;
                    arr[i * 3] = rand() * 120 - 60;
                    arr[i * 3 + 2] = rand() * 120 - 60;
                }
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
});

// Snow: slow falling flakes with sideways sway.
Env.addEffect('snow', function (api) {
    var THREE = api.THREE;
    var count = 1200;
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(count * 3);
    var phases = new Float32Array(count);
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4300) : Math.random;
    for (var i = 0; i < count; i++) {
        arr[i * 3] = rand() * 140 - 70;
        arr[i * 3 + 1] = rand() * 46;
        arr[i * 3 + 2] = rand() * 140 - 70;
        phases[i] = rand() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage));
    var mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0, depthWrite: false });
    var points = new THREE.Points(geo, mat);
    points.name = 'env-snow';
    api.scene.add(points);
    var t = 0;
    return {
        update: function (dt, st) {
            var target = st.weather === 'snow' ? 0.85 : 0;
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 2);
            points.visible = mat.opacity > 0.02;
            if (!points.visible) return;
            t += dt;
            for (var i = 0; i < count; i++) {
                arr[i * 3 + 1] -= (2.4 + st.wind * 2) * dt;
                arr[i * 3] += Math.sin(t + phases[i]) * 0.6 * dt;
                if (arr[i * 3 + 1] < 0) {
                    arr[i * 3 + 1] = 46;
                    arr[i * 3] = rand() * 140 - 70;
                    arr[i * 3 + 2] = rand() * 140 - 70;
                }
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
});

// Fireflies: warm points that hover near the ground on summer nights.
Env.addEffect('fireflies', function (api) {
    var THREE = api.THREE;
    var count = 140;
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(count * 3);
    var phases = new Float32Array(count);
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4400) : Math.random;
    for (var i = 0; i < count; i++) {
        arr[i * 3] = rand() * 70 - 35;
        arr[i * 3 + 1] = 0.5 + rand() * 4;
        arr[i * 3 + 2] = rand() * 70 - 35;
        phases[i] = rand() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage));
    var mat = new THREE.PointsMaterial({ color: 0xd8ff8a, size: 0.45, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    var points = new THREE.Points(geo, mat);
    points.name = 'env-fireflies';
    api.scene.add(points);
    var t = 0;
    return {
        update: function (dt, st) {
            var target = (st.daylight < 0.25 && st.weather === 'clear') ? 0.9 : 0;
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 1.5);
            points.visible = mat.opacity > 0.02;
            if (!points.visible) return;
            t += dt;
            for (var i = 0; i < count; i++) {
                arr[i * 3] += Math.sin(t * 1.3 + phases[i]) * 0.5 * dt;
                arr[i * 3 + 1] += Math.cos(t * 0.9 + phases[i]) * 0.3 * dt;
                arr[i * 3 + 2] += Math.cos(t * 1.1 + phases[i]) * 0.5 * dt;
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
});

// Falling leaves blown around when the wind is up.
Env.addEffect('leaves', function (api) {
    var THREE = api.THREE;
    var count = 220;
    var geo = new THREE.BufferGeometry();
    var arr = new Float32Array(count * 3);
    var phases = new Float32Array(count);
    var rand = (typeof Tex !== 'undefined') ? Tex.rng(4500) : Math.random;
    for (var i = 0; i < count; i++) {
        arr[i * 3] = rand() * 120 - 60;
        arr[i * 3 + 1] = rand() * 20;
        arr[i * 3 + 2] = rand() * 120 - 60;
        phases[i] = rand() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3).setUsage(THREE.DynamicDrawUsage));
    var mat = new THREE.PointsMaterial({ color: 0xb07a3a, size: 0.4, transparent: true, opacity: 0, depthWrite: false });
    var points = new THREE.Points(geo, mat);
    points.name = 'env-leaves';
    api.scene.add(points);
    var t = 0;
    return {
        update: function (dt, st) {
            var target = st.wind > 0.45 ? Math.min(1, (st.wind - 0.45) * 3) : 0;
            mat.opacity += (target - mat.opacity) * Math.min(1, dt * 1.5);
            points.visible = mat.opacity > 0.02;
            if (!points.visible) return;
            t += dt;
            for (var i = 0; i < count; i++) {
                arr[i * 3] += (6 * st.wind) * dt;
                arr[i * 3 + 1] -= (1.2 + st.wind) * dt;
                arr[i * 3 + 2] += Math.sin(t + phases[i]) * 1.2 * dt;
                if (arr[i * 3 + 1] < 0 || arr[i * 3] > 70) {
                    arr[i * 3] = -60 + rand() * 20;
                    arr[i * 3 + 1] = 16 + rand() * 8;
                    arr[i * 3 + 2] = rand() * 120 - 60;
                }
            }
            geo.attributes.position.needsUpdate = true;
        }
    };
});

// Lightning: random white flashes during storm weather.
Env.addEffect('lightning', function (api) {
    var THREE = api.THREE;
    var bolt = new THREE.DirectionalLight(0xdfe8ff, 0);
    bolt.position.set(-40, 120, -80);
    api.scene.add(bolt);
    var timer = 2 + Math.random() * 4;
    var flash = 0;
    return {
        update: function (dt, st) {
            if (st.weather === 'storm') {
                timer -= dt;
                if (timer <= 0) {
                    flash = 4.5;
                    timer = 3 + Math.random() * 6;
                }
            }
            if (flash > 0) {
                bolt.intensity = flash;
                flash = Math.max(0, flash - dt * 14);
            } else {
                bolt.intensity = 0;
            }
        }
    };
});

// Interior lights: warm point lights switch on as daylight fades.
Env.addEffect('interior-lights', function (api) {
    var THREE = api.THREE;
    var spots = [[0, 8, 0], [-10, 7, 6], [10, 7, -6], [0, 7, 14]];
    var lights = spots.map(function (p) {
        var l = new THREE.PointLight(0xffd9a0, 0, 34, 2);
        l.position.set(p[0], p[1], p[2]);
        api.scene.add(l);
        return l;
    });
    return {
        update: function (dt, st) {
            var target = st.daylight < 0.5 ? (1 - st.daylight) * 1.6 : 0;
            lights.forEach(function (l) {
                l.intensity += (target - l.intensity) * Math.min(1, dt * 2);
            });
        }
    };
});
