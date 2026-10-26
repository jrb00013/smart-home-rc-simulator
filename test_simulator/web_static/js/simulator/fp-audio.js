// Procedural sound and a clock-driven day/night cycle. No audio files:
// footsteps, doors, the TV and the room tone are synthesized, and the sun,
// sky tint, fog and porch light follow the real time of day.
(function () {
    let ctx = null;
    let master = null;
    let ambient = null;
    let tvGain = null;
    let tvFilter = null;
    let tvOsc = null;
    let fridgeOsc = null;
    let fridgeGain = null;
    let started = false;
    const loops = [];

    let skyMesh = null;
    let sunMesh = null;
    let sunGlow = null;
    let sunLight = null;
    let ambientLight = null;
    let hemi = null;
    let stars = null;
    let dust = null;
    const bases = {};

    function volume() {
        const v = FP.settings.get('masterVolume');
        return typeof v === 'number' ? v : 0.8;
    }

    function ensure() {
        if (ctx) return true;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        try {
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = volume();
            master.connect(ctx.destination);
        } catch (err) {
            ctx = null;
            return false;
        }
        return true;
    }

    function noiseBuffer(seconds) {
        const n = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return buf;
    }

    function envGain(duration, peak) {
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        g.connect(master);
        return g;
    }

    function blip(freq, duration, peak, type) {
        if (!ensure() || ctx.state === 'suspended') return;
        const o = ctx.createOscillator();
        o.type = type || 'sine';
        o.frequency.value = freq;
        const g = envGain(duration, peak * volume());
        o.connect(g);
        o.start();
        o.stop(ctx.currentTime + duration + 0.02);
    }

    function noiseBurst(duration, peak, freq, q) {
        if (!ensure() || ctx.state === 'suspended') return;
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(duration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = freq;
        filter.Q.value = q;
        const g = envGain(duration, peak * volume());
        src.connect(filter);
        filter.connect(g);
        src.start();
    }

    const STEP = {
        wood: [180, 700, 0.9],
        tile: [400, 1400, 0.55],
        carpet: [120, 400, 1.3],
        grass: [160, 500, 1.1],
        concrete: [220, 900, 0.7],
    };

    function footstep(surface, sprint) {
        const s = STEP[surface] || STEP.wood;
        noiseBurst(s[2] * (sprint ? 0.7 : 1), sprint ? 0.22 : 0.14, s[0] + Math.random() * s[1], 0.7);
    }

    function loopNoise(freq, q, gainValue) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(2);
        src.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq;
        filter.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = gainValue;
        src.connect(filter);
        filter.connect(g);
        g.connect(master);
        src.start();
        loops.push(src);
        return { out: g, filter: filter };
    }

    function startBeds() {
        if (started || !ensure()) return;
        if (ctx.state === 'suspended') ctx.resume();
        ambient = loopNoise(420, 0.4, 0.012);
        const tv = loopNoise(900, 0.6, 0);
        tvGain = tv.out;
        tvFilter = tv.filter;
        tvOsc = ctx.createOscillator();
        tvOsc.type = 'triangle';
        tvOsc.frequency.value = 220;
        const og = ctx.createGain();
        og.gain.value = 0.04;
        tvOsc.connect(og);
        og.connect(tvGain);
        tvOsc.start();
        loops.push(tvOsc);
        fridgeOsc = ctx.createOscillator();
        fridgeOsc.type = 'sine';
        fridgeOsc.frequency.value = 58;
        fridgeGain = ctx.createGain();
        fridgeGain.gain.value = 0;
        fridgeOsc.connect(fridgeGain);
        fridgeGain.connect(master);
        fridgeOsc.start();
        loops.push(fridgeOsc);
        started = true;
    }

    function stopBeds() {
        for (let i = 0; i < loops.length; i++) {
            try { loops[i].stop(); } catch (err) { /* already stopped */ }
        }
        loops.length = 0;
        started = false;
        ambient = tvGain = tvFilter = tvOsc = fridgeOsc = fridgeGain = null;
    }

    function zoneName() {
        if (!FP.player || !FP.hud || !FP.hud.zoneAt) return 'Living room';
        const p = FP.player.position;
        return FP.hud.zoneAt(p.x, p.y, p.z);
    }

    function outdoors(zone) {
        return zone === 'Front yard' || zone === 'Backyard' || zone === 'Side yard' || zone === 'Street' || zone === 'Outside';
    }

    function mixBeds(dt) {
        if (!started) return;
        master.gain.setTargetAtTime(Math.max(0.0001, volume()), ctx.currentTime, 0.05);
        const zone = zoneName();
        const out = outdoors(zone);
        const p = FP.player.position;
        ambient.out.gain.setTargetAtTime(out ? 0.028 : 0.012, ctx.currentTime, 0.2);
        ambient.filter.frequency.setTargetAtTime(out ? 700 : 320, ctx.currentTime, 0.3);

        const tvOn = typeof tvState !== 'undefined' && tvState && tvState.powered_on && !tvState.muted;
        const dx = p.x - TV_POSITION.x;
        const dy = (p.y + 1.6) - TV_POSITION.y;
        const dz = p.z - TV_POSITION.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const near = 1 / (1 + dist * dist * 0.02);
        const sameRoom = zone === 'Living room';
        const level = tvOn ? near * (sameRoom ? 0.09 : 0.035) * (tvState.volume != null ? tvState.volume / 100 : 0.4) : 0;
        tvGain.gain.setTargetAtTime(level, ctx.currentTime, 0.08);
        tvFilter.frequency.setTargetAtTime(sameRoom ? 2200 : 480, ctx.currentTime, 0.1);
        const app = tvState && tvState.current_app;
        const tones = { YouTube: 494, Netflix: 330, 'Amazon Prime': 392, 'HBO Max': 262, Home: 523 };
        const tone = (app && tones[app]) || (180 + ((tvState && tvState.channel) || 1) % 30 * 7);
        tvOsc.frequency.setTargetAtTime(tone, ctx.currentTime, 0.1);

        const fridgeOn = tvState && tvState.room_state && tvState.room_state.fridge_on !== false;
        const fd = Math.hypot(p.x - 20.5, p.z - 12.5);
        fridgeGain.gain.setTargetAtTime(fridgeOn ? Math.min(0.03, 0.08 / (1 + fd)) : 0, ctx.currentTime, 0.2);
        void dt;
    }

    // --- day / night -------------------------------------------------------

    function solar(date) {
        const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
        const alt = Math.sin(((h - 6) / 12) * Math.PI); // 0 at 6:00 and 18:00, 1 at noon
        const az = ((h - 6) / 24) * Math.PI * 2;
        return { hour: h, alt: alt, az: az, day: Math.max(0, Math.min(1, alt)) };
    }

    function lerpColor(a, b, t) {
        const c = new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));
        return c;
    }

    function findLights() {
        if (!scene) return;
        scene.traverse((obj) => {
            if (obj.isMesh && obj.geometry && obj.geometry.type === 'SphereGeometry') {
                const r = obj.geometry.parameters && obj.geometry.parameters.radius;
                if (r === 350) skyMesh = obj;
                else if (r === 4) sunMesh = obj;
            }
            if (obj.isSprite && !sunGlow) sunGlow = obj;
            if (obj.isAmbientLight && !ambientLight) ambientLight = obj;
            if (obj.isHemisphereLight && !hemi) hemi = obj;
            if (obj.isDirectionalLight && obj.intensity > 1 && !sunLight) sunLight = obj;
        });
        if (ambientLight) bases.ambient = ambientLight.intensity;
        if (hemi) bases.hemi = hemi.intensity;
        if (sunLight) bases.sun = sunLight.intensity;
        if (roomLights && roomLights.porch) bases.porch = roomLights.porch.intensity || 0.4;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(500 * 3);
        for (let i = 0; i < 500; i++) {
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(Math.random() * 0.65 + 0.35);
            const rad = 180;
            pos[i * 3] = rad * Math.sin(ph) * Math.cos(th);
            pos[i * 3 + 1] = rad * Math.cos(ph) + 20;
            pos[i * 3 + 2] = rad * Math.sin(ph) * Math.sin(th);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        stars = new THREE.Points(geo, new THREE.PointsMaterial({
            color: 0xffffff, size: 0.6, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: false,
        }));
        scene.add(stars);
        const dustGeo = new THREE.BufferGeometry();
        const dp = new Float32Array(48 * 3);
        for (let i = 0; i < 48; i++) {
            dp[i * 3] = 16 + Math.random() * 5;
            dp[i * 3 + 1] = 0.4 + Math.random() * 3.2;
            dp[i * 3 + 2] = -10 + Math.random() * 6;
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
        dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
            color: 0xfff4d8, size: 0.035, transparent: true, opacity: 0.0, depthWrite: false,
        }));
        scene.add(dust);
    }

    function applySky(sun) {
        const night = Math.max(0, Math.min(1, -sun.alt));
        const golden = Math.max(0, 1 - Math.abs(sun.alt) * 4);
        const day = sun.day;
        if (scene && scene.background && scene.background.isColor) {
            const c = lerpColor(0x87ceeb, 0x090d18, night);
            if (golden > 0.2 && day < 0.45) c.lerp(new THREE.Color(0xff7a3c), golden * 0.65);
            scene.background.copy(c);
        }
        if (scene && scene.fog && scene.fog.color) {
            scene.fog.color.copy(scene.background);
            scene.fog.near = 40 + day * 20;
            scene.fog.far = 90 + day * 50;
        }
        if (skyMesh && skyMesh.material) {
            const tint = lerpColor(0xffffff, 0x1a2744, night);
            if (golden > 0.2) tint.lerp(new THREE.Color(0xff9966), golden * 0.5);
            skyMesh.material.color.copy(tint);
        }
        const elev = Math.max(-0.15, sun.alt);
        const pos = tmpSun(sun.az, elev);
        if (sunLight) {
            sunLight.position.copy(pos);
            sunLight.intensity = (bases.sun || 1.4) * Math.max(0.02, day);
            sunLight.color.set(golden > 0.25 ? 0xffc090 : 0xffeedd);
        }
        if (sunMesh) sunMesh.position.copy(pos);
        if (sunGlow) {
            sunGlow.position.copy(pos);
            if (sunGlow.material) sunGlow.material.opacity = Math.max(0, day);
        }
        if (ambientLight) ambientLight.intensity = (bases.ambient || 0.35) * (0.18 + day * 0.82);
        if (hemi) {
            hemi.intensity = (bases.hemi || 0.55) * (0.15 + day * 0.85);
            hemi.color.set(night > 0.5 ? 0x223355 : 0x87ceeb);
        }
        if (roomLights && roomLights.porch) {
            roomLights.porch.intensity = (bases.porch || 0.4) * (0.35 + night * 1.8);
        }
        if (stars && stars.material) stars.material.opacity = night * 0.85;
        if (dust && dust.material) {
            const indoorDay = day * (outdoors(zoneName()) ? 0.15 : 1);
            dust.material.opacity = indoorDay * 0.45;
            const arr = dust.geometry.attributes.position.array;
            for (let i = 1; i < arr.length; i += 3) {
                arr[i] += 0.004;
                if (arr[i] > 3.6) arr[i] = 0.4;
            }
            dust.geometry.attributes.position.needsUpdate = true;
        }
        FP.atmo.sun = sun;
    }

    function tmpSun(az, elev) {
        const r = 140;
        return new THREE.Vector3(Math.cos(az) * r, 10 + Math.max(0, elev) * 120, Math.sin(az) * r * 0.6);
    }

    let chirpIn = 2;

    function critters(dt, sun) {
        if (!started || !FP.player) return;
        const zone = zoneName();
        if (!outdoors(zone)) return;
        chirpIn -= dt;
        if (chirpIn > 0) return;
        if (sun.day > 0.25) {
            chirpIn = 1.4 + Math.random() * 3;
            blip(1400 + Math.random() * 1800, 0.09, 0.05, 'sine');
            blip(1800 + Math.random() * 1200, 0.07, 0.03, 'sine');
        } else if (sun.alt < 0.05) {
            chirpIn = 0.18 + Math.random() * 0.25;
            blip(4200 + Math.random() * 400, 0.03, 0.015, 'square');
        } else chirpIn = 1;
    }

    FP.atmo = { sun: null };

    FP.register({
        name: 'audio',
        init() {
            findLights();
            applySky(solar(new Date()));
            FP.on('step', (d) => footstep(d && d.surface, d && d.sprint));
            FP.on('jump', () => noiseBurst(0.12, 0.08, 200, 0.5));
            FP.on('land', (d) => noiseBurst(0.16, Math.min(0.3, 0.08 + (d && d.speed ? d.speed * 0.02 : 0)), 140, 0.6));
            FP.on('use', (d) => {
                if (!d) return;
                if (d.kind === 'door') noiseBurst(0.35, 0.16, d.open ? 180 : 120, 0.4);
                else if (d.kind === 'switch' || d.kind === 'device' || d.kind === 'blinds') blip(1800, 0.04, 0.06, 'square');
                else if (d.kind === 'fire') noiseBurst(0.4, 0.1, 300, 0.3);
                else if (d.kind === 'microwave' || d.kind === 'toaster' || d.kind === 'coffee') blip(880, 0.08, 0.05, 'square');
                else if (d.kind === 'drawer') noiseBurst(0.18, 0.08, 500, 1);
            });
            FP.on('settings', () => { if (master && ctx) master.gain.value = volume(); });
        },
        enter() {
            if (ensure() && ctx.state === 'suspended') ctx.resume();
            startBeds();
        },
        exit() { /* beds keep a quiet room tone in orbit; gain follows the camera only while walking */ },
        update(dt) {
            const sun = solar(new Date());
            applySky(sun);
            if (walkMode) {
                mixBeds(dt);
                critters(dt, sun);
            } else if (started && ctx) {
                const quiet = ctx.currentTime;
                if (tvGain) tvGain.gain.setTargetAtTime(0.0001, quiet, 0.2);
                if (fridgeGain) fridgeGain.gain.setTargetAtTime(0.0001, quiet, 0.2);
                if (ambient && ambient.out) ambient.out.gain.setTargetAtTime(0.0001, quiet, 0.2);
            }
        },
    });

    // Exposed so a teardown (tests, hot reload) can release the audio graph.
    FP.audio = { stop: stopBeds };
})();
