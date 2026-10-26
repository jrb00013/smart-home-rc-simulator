// Look-at interaction for walk mode. A ray from the camera picks the nearest
// FP.interactables entry and emits 'focus' { prompt }. E, or FP.interact.use(),
// runs it. Doors hinged by fp-collide swing here; everything else is a small
// prop or a button the server already understands.
(function () {
    const raycaster = new THREE.Raycaster();
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    let focus = null;
    let lastPrompt = undefined;
    let heldRemote = true;
    let remoteEntry = null;
    const anims = [];

    function menuOpen() { return FP.hud && FP.hud.isMenuOpen; }

    function toast(text) {
        if (FP.hud && FP.hud.toast) FP.hud.toast(text);
    }

    function press(code) {
        if (code == null) return false;
        if (typeof socket !== 'undefined' && socket && socket.connected) {
            socket.emit('button_press', { button_code: code });
            return true;
        }
        return false;
    }

    function room() {
        if (typeof tvState === 'undefined' || !tvState) return null;
        if (!tvState.room_state) tvState.room_state = {};
        return tvState.room_state;
    }

    function refreshDevices() {
        if (typeof updateRoomDevicesFromTVState === 'function') updateRoomDevicesFromTVState();
    }

    function toggleKey(key, code, label, onVal, offVal) {
        const online = press(code);
        if (online) {
            FP.emit('use', { kind: 'device', name: label });
            return;
        }
        const rs = room();
        if (!rs) return;
        const on = rs[key] !== false && rs[key] !== 0;
        rs[key] = on ? (offVal !== undefined ? offVal : false) : (onVal !== undefined ? onVal : true);
        refreshDevices();
        toast(label + (on ? ' off' : ' on'));
        FP.emit('use', { kind: 'device', name: label });
    }

    function ghostMat() {
        return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
    }

    function addProxy(x, y, z, size, opts) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), ghostMat());
        mesh.position.set(x, y, z);
        mesh.name = opts.name || 'fp-proxy';
        (roomGroup || scene).add(mesh);
        return FP.interactables.add(mesh, opts);
    }

    function setFocus(entry, prompt) {
        const text = prompt || null;
        if (text === lastPrompt && entry === focus) return;
        focus = entry;
        lastPrompt = text;
        FP.emit('focus', { entry: entry, prompt: text });
    }

    function promptOf(entry) {
        if (!entry) return null;
        const p = entry.prompt;
        return typeof p === 'function' ? p() : p;
    }

    function consider(entry, distance) {
        if (!entry || distance > (entry.range || 2.5)) return null;
        return { entry: entry, distance: distance };
    }

    function pick() {
        if (typeof camera === 'undefined' || !camera) return null;
        camera.getWorldDirection(dir);
        origin.copy(camera.position);
        raycaster.set(origin, dir);
        raycaster.far = 3.2;
        const roots = [];
        const list = FP.interactables.list;
        for (let i = 0; i < list.length; i++) {
            if (list[i].object) roots.push(list[i].object);
        }
        if (!roots.length) return null;
        const hits = raycaster.intersectObjects(roots, true);
        let best = null;
        for (let i = 0; i < hits.length; i++) {
            let obj = hits[i].object;
            let entry = null;
            while (obj && !entry) {
                entry = obj.userData && obj.userData.fpInteractable;
                obj = obj.parent;
            }
            const found = consider(entry, hits[i].distance);
            if (found && (!best || found.distance < best.distance)) best = found;
        }
        return best;
    }

    function useFocused() {
        if (!walkMode || menuOpen() || !focus || typeof focus.onUse !== 'function') return false;
        focus.onUse(focus);
        return true;
    }

    function animateDoors(dt) {
        const doors = (FP.world && FP.world.doors) || [];
        for (let i = 0; i < doors.length; i++) {
            const d = doors[i];
            if (d.kind === 'lift') {
                d.lift += (d.targetLift - d.lift) * (1 - Math.exp(-dt * 4));
                d.group.position.y = d.lift;
            } else {
                d.angle += (d.target - d.angle) * (1 - Math.exp(-dt * 7));
                d.group.rotation.y = d.angle;
            }
        }
        for (let i = 0; i < anims.length; i++) anims[i](dt);
    }

    function registerDoors() {
        const doors = (FP.world && FP.world.doors) || [];
        for (let i = 0; i < doors.length; i++) {
            const door = doors[i];
            FP.interactables.add(door.group, {
                range: 2.8,
                prompt: function () { return door.prompt(); },
                onUse: function () { door.toggle(); },
            });
        }
    }

    function isDoorway(x, z) {
        if (!FP.collide || FP.collide.blocked(x, z, 0, 1.5, 0.18)) return false;
        const side = (px, pz) => FP.collide.blocked(px, pz, 0, 1.5, 0.2);
        // Doorways are wide and the wall is thin, so sample well along the wall.
        return side(x + 0.15, z) || side(x - 0.15, z) || side(x, z + 2.4) || side(x, z - 2.4);
    }

    function swingDoor(spec) {
        if (!isDoorway(spec.x, spec.z)) return;
        const hinge = new THREE.Group();
        hinge.position.set(spec.hx, 0, spec.hz);
        hinge.userData.fpDynamic = true;
        (roomGroup || scene).add(hinge);
        const mat = new THREE.MeshStandardMaterial({ color: spec.color || 0x6a4a2a, roughness: 0.82 });
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(spec.thick, spec.height, spec.width), mat);
        leaf.position.set(spec.thick / 2, spec.height / 2, spec.width / 2);
        const knob = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0xd8d0b0, metalness: 0.6, roughness: 0.3 })
        );
        knob.position.set(spec.thick + 0.02, spec.height * 0.48, spec.width - 0.12);
        hinge.add(leaf);
        hinge.add(knob);
        const door = {
            name: spec.name,
            group: hinge,
            kind: 'yaw',
            angle: 0,
            target: 0,
            lift: 0,
            targetLift: 0,
            blocks: true,
            openTarget: spec.openAngle || 1.4,
            get open() { return Math.abs(this.target) > 0.3; },
            toggle() {
                this.target = Math.abs(this.target) > 0.3 ? 0 : this.openTarget;
                FP.emit('use', { kind: 'door', name: spec.name, open: this.open });
            },
            prompt() { return this.open ? 'Close ' + spec.name : 'Open ' + spec.name; },
        };
        // makeDoor in collide pushed the shell doors; interior ones join the same list
        // so FP.collide.move treats them as dynamic solids.
        FP.world.doors.push(door);
        FP.world.movers.push(door);
        FP.interactables.add(hinge, {
            range: 2.4,
            prompt: function () { return door.prompt(); },
            onUse: function () { door.toggle(); },
        });
    }

    function addInteriorDoors() {
        // Only where the shell already left a walking gap, so a new leaf can't
        // seal the player inside a solid wall.
        swingDoor({ name: 'kitchen door', hx: 11, hz: -3.15, x: 11, z: -2.2, thick: 0.06, height: 2.15, width: 1.15, openAngle: -1.45 });
        swingDoor({ name: 'office door', hx: 13.2, hz: 9.15, x: 13.2, z: 9.9, thick: 0.06, height: 2.15, width: 1.15, openAngle: 1.45 });
    }

    function bindRef(ref, prompt, range, onUse) {
        if (!ref || !ref.isObject3D) return;
        FP.interactables.add(ref, { prompt: prompt, range: range || 2.2, onUse: onUse });
    }

    function addGadgets() {
        bindRef(roomDeviceRefs.lamp_left_shade, 'Toggle lamp', 2.4, function () {
            toggleKey('lights_lamp_left', null, 'Lamp', 100, 0);
        });
        bindRef(roomDeviceRefs.lamp_right_shade, 'Toggle lamp', 2.4, function () {
            toggleKey('lights_lamp_right', null, 'Lamp', 100, 0);
        });
        bindRef(roomDeviceRefs.ceiling_bulb, 'Toggle ceiling lights', 3.2, function () {
            const rs = room();
            const on = rs && rs.lights_main > 20;
            if (rs) {
                rs.lights_main = on ? 0 : 100;
                refreshDevices();
            }
            toast(on ? 'Ceiling lights off' : 'Ceiling lights on');
            FP.emit('use', { kind: 'switch', name: 'ceiling' });
        });
        bindRef(roomDeviceRefs.blinds, 'Toggle blinds', 3, function () {
            const g = roomDeviceRefs.blinds;
            const open = !g.userData.fpOpen;
            g.userData.fpOpen = open;
            for (let i = 0; i < g.children.length; i++) g.children[i].rotation.x = open ? 0.9 : 0;
            toast(open ? 'Blinds open' : 'Blinds closed');
            FP.emit('use', { kind: 'blinds', open: open });
        });
        bindRef(roomDeviceRefs.thermostat, function () {
            return 'Thermostat ' + (roomDeviceRefs.thermostat.userData.fpTemp || 21) + '°C';
        }, 2.2, function () {
            const t = roomDeviceRefs.thermostat;
            const next = ((t.userData.fpTemp || 21) - 16 + 1) % 12 + 16;
            t.userData.fpTemp = next;
            if (t.material && t.material.emissive) {
                t.material.emissiveIntensity = 0.25 + (next - 16) / 12 * 0.6;
            }
            toast('Thermostat ' + next + '°C');
            FP.emit('use', { kind: 'thermostat', value: next });
        });
        if (typeof tvMesh !== 'undefined' && tvMesh) {
            FP.interactables.add(tvMesh, {
                range: 3.2,
                prompt: 'Power TV',
                onUse: function () {
                    if (!press(0x10) && typeof tvState !== 'undefined' && tvState) {
                        tvState.powered_on = !tvState.powered_on;
                        if (typeof startPowerAnimation === 'function') startPowerAnimation(tvState.powered_on);
                        toast(tvState.powered_on ? 'Power on' : 'Power off');
                    }
                    FP.emit('use', { kind: 'tv' });
                },
            });
        }
        addProxy(20.5, 1.0, 12.5, [1.0, 1.7, 1.0], {
            name: 'fridge',
            prompt: 'Toggle fridge',
            range: 2.4,
            onUse: function () { toggleKey('fridge_on', 0xEB, 'Fridge'); },
        });
        addProxy(20.5, 1.05, -2.5, [0.5, 0.35, 0.4], {
            name: 'microwave',
            prompt: 'Use microwave',
            range: 2.2,
            onUse: function (entry) {
                entry.object.userData.on = !entry.object.userData.on;
                toast(entry.object.userData.on ? 'Microwave on' : 'Microwave off');
                FP.emit('use', { kind: 'microwave', on: !!entry.object.userData.on });
            },
        });
        const drawer = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.18, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.55 })
        );
        drawer.position.set(20.2, 0.55, 4.2);
        (roomGroup || scene).add(drawer);
        let drawerOpen = 0;
        let drawerTarget = 0;
        anims.push(function () { drawer.position.z += (4.2 - drawerTarget - drawer.position.z) * 0.2; });
        FP.interactables.add(drawer, {
            prompt: function () { return drawerTarget > 0.1 ? 'Close drawer' : 'Open drawer'; },
            range: 2.2,
            onUse: function () {
                drawerTarget = drawerTarget > 0.1 ? 0 : 0.28;
                drawerOpen = drawerTarget;
                FP.emit('use', { kind: 'drawer', open: drawerOpen > 0 });
            },
        });
        const flameMat = new THREE.MeshStandardMaterial({ color: 0xff7722, emissive: 0xff4400, emissiveIntensity: 0.4, transparent: true, opacity: 0.9 });
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 8), flameMat);
        flame.position.set(21.5, 0.55, -5.72);
        flame.visible = false;
        (roomGroup || scene).add(flame);
        let fireOn = false;
        anims.push(function (dt) {
            if (!fireOn) return;
            const t = performance.now() * 0.006;
            flame.scale.y = 0.85 + Math.sin(t) * 0.2;
            flame.scale.x = flame.scale.z = 0.9 + Math.sin(t * 1.7) * 0.08;
            if (roomLights.fireplace) roomLights.fireplace.intensity = 0.7 + Math.sin(t * 2) * 0.25;
        });
        addProxy(21.5, 0.7, -5.7, [1.1, 0.9, 0.5], {
            name: 'fireplace',
            prompt: function () { return fireOn ? 'Douse fireplace' : 'Light fireplace'; },
            range: 2.6,
            onUse: function () {
                fireOn = !fireOn;
                flame.visible = fireOn;
                if (roomLights.fireplace) roomLights.fireplace.intensity = fireOn ? 0.9 : 0.15;
                toast(fireOn ? 'Fireplace lit' : 'Fireplace out');
                FP.emit('use', { kind: 'fire', on: fireOn });
            },
        });
        if (window._fanBlades) {
            FP.interactables.add(window._fanBlades, {
                range: 3.5,
                prompt: function () { return window._fanSpeed === 0 ? 'Start ceiling fan' : 'Stop ceiling fan'; },
                onUse: function () {
                    window._fanSpeed = window._fanSpeed === 0 ? 2.4 : 0;
                    toast(window._fanSpeed ? 'Fan on' : 'Fan off');
                    FP.emit('use', { kind: 'fan', on: window._fanSpeed > 0 });
                },
            });
        }
        addProxy(20.5, 1.05, 0.5, [0.35, 0.25, 0.3], {
            name: 'toaster',
            prompt: 'Use toaster',
            onUse: function () {
                toast('Toaster down');
                FP.emit('use', { kind: 'toaster' });
            },
        });
        addProxy(20.5, 1.05, 8.5, [0.35, 0.3, 0.35], {
            name: 'coffee',
            prompt: 'Brew coffee',
            onUse: function () {
                toast('Coffee brewing');
                FP.emit('use', { kind: 'coffee' });
            },
        });
    }

    function stowRemote() {
        if (!heldRemote || typeof remoteGroup === 'undefined' || !remoteGroup || !FP.player) return;
        const feet = FP.player.position;
        const x = feet.x + Math.sin(playerYaw) * 0.75;
        const z = feet.z + Math.cos(playerYaw) * 0.75;
        const y = FP.collide ? FP.collide.groundAt(x, z, feet.y) : feet.y;
        if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
        scene.add(remoteGroup);
        remoteGroup.position.set(x, y + 0.04, z);
        remoteGroup.rotation.set(0, playerYaw, 0);
        remoteGroup.scale.setScalar(1);
        heldRemote = false;
        remoteEntry = FP.interactables.add(remoteGroup, {
            range: 2.2,
            prompt: 'Pick up remote',
            onUse: function () { drawRemote(); },
        });
        toast('Remote set down');
        FP.emit('use', { kind: 'remote', held: false });
    }

    function drawRemote() {
        if (heldRemote || typeof remoteGroup === 'undefined' || !remoteGroup || !firstPersonHolder) return;
        if (remoteEntry) {
            FP.interactables.remove(remoteGroup);
            remoteEntry = null;
        }
        if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
        remoteGroup.position.set(0.22, -0.35, -0.95);
        remoteGroup.rotation.set(0.28, -0.15, 0.08);
        remoteGroup.scale.setScalar(1);
        firstPersonHolder.add(remoteGroup);
        heldRemote = true;
        toast('Remote in hand');
        FP.emit('use', { kind: 'remote', held: true });
        setFocus(null, null);
    }

    FP.register({
        name: 'interact',
        init() {
            registerDoors();
            addInteriorDoors();
            addGadgets();
        },
        enter() {
            if (!heldRemote) drawRemote();
        },
        update(dt) {
            animateDoors(dt);
            if (!walkMode || menuOpen()) {
                if (lastPrompt) setFocus(null, null);
                return;
            }
            const best = pick();
            if (!best) setFocus(null, null);
            else setFocus(best.entry, promptOf(best.entry));
        },
    });

    window.addEventListener('keydown', (e) => {
        if (!walkMode || e.repeat || menuOpen()) return;
        if (typeof isTypingTarget === 'function' && isTypingTarget(e.target)) return;
        if (e.code === 'KeyE') {
            e.preventDefault();
            useFocused();
        } else if (e.code === 'KeyR') {
            e.preventDefault();
            if (heldRemote) stowRemote();
            else drawRemote();
        }
    });

    FP.interact = {
        use: useFocused,
        get focus() { return focus; },
        get holdingRemote() { return heldRemote; },
    };
})();
