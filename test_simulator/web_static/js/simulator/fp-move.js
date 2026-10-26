// First-person movement: gravity, stairs, collision, sprint / crouch / jump,
// head bob and a bit of weight in the hand that holds the remote.
//
// Owns FP.player and FP.input (the HUD and touch controls already call these).
// Camera placement runs from the module update, which is after controls.js
// updateCamera — that function steps aside while FP.player exists.
(function () {
    const WORLD = 58;
    const WALK = 4.25;
    const SPRINT = 7.6;
    const CROUCH_SPEED = 2.05;
    const GRAVITY = 18;
    const JUMP = 5.5;
    const RADIUS = 0.28;
    const STAND_H = 1.68;
    const CROUCH_H = 1.08;
    const STAND_EYE = 1.62;
    const CROUCH_EYE = 1.02;

    const position = new THREE.Vector3();
    const _look = new THREE.Vector3();
    let vy = 0;
    let eye = STAND_EYE;
    let bob = 0;
    let bobPhase = 0;
    let dip = 0;
    let stepAcc = 0;
    let grounded = true;
    let crouch = false;
    let shift = false;
    let jumpQueued = false;
    let fovApplied = -1;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function paused() {
        return FP.hud && FP.hud.isMenuOpen;
    }

    function sprinting() {
        return !crouch && (shift || !!(FP.input && FP.input.sprint));
    }

    function bodyH() { return crouch ? CROUCH_H : STAND_H; }

    function clampLook() {
        const lim = Math.PI / 2 - 0.12;
        if (playerPitch > lim) playerPitch = lim;
        if (playerPitch < -lim) playerPitch = -lim;
    }

    const input = {
        moveX: 0,
        moveY: 0,
        sprint: false,
        crouch: false,
        lookDelta(dx, dy) {
            if (!walkMode || paused()) return;
            const sens = (FP.settings.get('mouseSensitivity') || 1) * 0.002;
            const inv = FP.settings.get('invertY') ? -1 : 1;
            playerYaw -= dx * sens;
            playerPitch -= dy * sens * inv;
            clampLook();
        },
        jump() { jumpQueued = true; },
        setSprint(on) { this.sprint = !!on; },
        setCrouch(on) { crouch = !!on; this.crouch = crouch; },
    };
    FP.input = input;

    function surface() {
        const zone = FP.hud && FP.hud.zoneAt ? FP.hud.zoneAt(position.x, position.y, position.z) : '';
        if (zone === 'Street' || zone === 'Garage') return 'concrete';
        if (zone === 'Front yard' || zone === 'Backyard' || zone === 'Side yard' || zone === 'Outside') return 'grass';
        if (zone === 'Kitchen') return 'tile';
        if (zone === 'Bedroom' || zone === 'Upstairs') return 'carpet';
        return 'wood';
    }

    function applyFov(extra) {
        if (typeof camera === 'undefined' || !camera) return;
        const next = FP.settings.get('fov') + (extra || 0);
        if (Math.abs(next - fovApplied) < 0.05) return;
        fovApplied = next;
        camera.fov = next;
        camera.updateProjectionMatrix();
    }

    function placeCamera(dt) {
        const targetEye = crouch ? CROUCH_EYE : STAND_EYE;
        eye += (targetEye - eye) * (1 - Math.exp(-dt * 10));
        camera.position.set(position.x, position.y + eye + bob - dip, position.z);
        _look.set(
            Math.sin(playerYaw) * Math.cos(playerPitch),
            Math.sin(playerPitch),
            Math.cos(playerYaw) * Math.cos(playerPitch)
        ).add(camera.position);
        camera.lookAt(_look);
        applyFov(sprinting() && grounded ? 3 : 0);
        swayHand(dt);
    }

    function swayHand() {
        if (typeof remoteGroup === 'undefined' || !remoteGroup) return;
        if (typeof firstPersonHolder === 'undefined' || remoteGroup.parent !== firstPersonHolder) return;
        const sway = bob * 0.85;
        remoteGroup.position.set(0.22, -0.35 - (crouch ? 0.12 : 0) + sway, -0.95);
        remoteGroup.rotation.set(0.28 + sway, -0.15, 0.08 + sway * 0.4);
    }

    function settleAt(x, yHint, z) {
        let px = Math.max(-WORLD, Math.min(WORLD, x));
        let pz = Math.max(-WORLD, Math.min(WORLD, z));
        const feetY = FP.collide ? FP.collide.groundAt(px, pz, yHint) : 0;
        if (FP.collide) {
            const out = FP.collide.pushOut(px, pz, feetY, bodyH(), RADIUS);
            px = out.x;
            pz = out.z;
        }
        position.set(px, FP.collide ? FP.collide.groundAt(px, pz, feetY) : feetY, pz);
        vy = 0;
        grounded = true;
    }

    FP.register({
        name: 'move',
        init() {
            FP.on('settings', (d) => {
                if (!d || d.key === 'fov' || d.key === undefined) fovApplied = -1;
            });
        },
        enter() {
            const yHint = camera.position.y - STAND_EYE;
            settleAt(camera.position.x, yHint, camera.position.z);
            eye = crouch ? CROUCH_EYE : STAND_EYE;
            bob = 0;
            dip = 0;
            stepAcc = 0;
            vy = 0;
            fovApplied = -1;
            if (playerPosition) playerPosition.copy(position);
            placeCamera(1);
        },
        exit() {
            fovApplied = -1;
            input.moveX = 0;
            input.moveY = 0;
            shift = false;
            jumpQueued = false;
        },
        update(dt) {
            if (!walkMode || typeof camera === 'undefined' || !camera) return;
            dt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
            const menu = paused();
            let fwd = menu ? 0 : ((moveForward ? 1 : 0) - (moveBackward ? 1 : 0) + (input.moveY || 0));
            let str = menu ? 0 : ((moveRight ? 1 : 0) - (moveLeft ? 1 : 0) + (input.moveX || 0));
            const len = Math.hypot(fwd, str);
            if (len > 1) { fwd /= len; str /= len; }

            const speed = crouch ? CROUCH_SPEED : (sprinting() ? SPRINT : WALK);
            const sin = Math.sin(playerYaw);
            const cos = Math.cos(playerYaw);
            const dx = (sin * fwd + cos * str) * speed * dt;
            const dz = (cos * fwd - sin * str) * speed * dt;

            const h = bodyH();
            if (FP.collide && FP.collide.ready) {
                const slid = FP.collide.move(position.x, position.z, dx, dz, position.y, h, RADIUS);
                position.x = slid.x;
                position.z = slid.z;
            } else {
                position.x += dx;
                position.z += dz;
            }
            position.x = Math.max(-WORLD, Math.min(WORLD, position.x));
            position.z = Math.max(-WORLD, Math.min(WORLD, position.z));

            const support = FP.collide ? FP.collide.groundAt(position.x, position.z, position.y) : 0;
            if (!menu && jumpQueued && grounded && !crouch) {
                vy = JUMP;
                grounded = false;
                FP.emit('jump');
            }
            jumpQueued = false;

            if (position.y <= support + 0.02 && vy <= 0) {
                const impact = grounded ? 0 : -vy;
                position.y = support;
                vy = 0;
                if (!grounded && impact > 2.2) {
                    dip = Math.min(0.09, impact * 0.012);
                    FP.emit('land', { speed: impact, surface: surface() });
                }
                grounded = true;
            } else {
                grounded = false;
                vy -= GRAVITY * dt;
                position.y += vy * dt;
                if (position.y < -2) {
                    settleAt(position.x, 0, position.z);
                }
            }

            const moved = Math.hypot(dx, dz);
            if (grounded && moved > 0.0008 && !menu) {
                const stride = crouch ? 0.48 : (sprinting() ? 1.15 : 0.74);
                stepAcc += moved;
                if (stepAcc >= stride) {
                    stepAcc = 0;
                    FP.emit('step', { surface: surface(), sprint: sprinting() });
                }
                if (FP.settings.get('headBob') && !reduced) {
                    bobPhase += moved * (sprinting() ? 9 : 11);
                    bob = Math.sin(bobPhase) * (crouch ? 0.012 : sprinting() ? 0.05 : 0.03);
                } else bob = 0;
            } else {
                bob += (0 - bob) * Math.min(1, dt * 8);
            }
            dip *= Math.exp(-dt * 7);

            if (playerPosition) playerPosition.copy(position);
            placeCamera(dt);
        },
    });

    window.addEventListener('keydown', (e) => {
        if (!walkMode || e.repeat || paused()) return;
        if (typeof isTypingTarget === 'function' && isTypingTarget(e.target)) return;
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true;
        else if (e.code === 'KeyC') {
            crouch = !crouch;
            input.crouch = crouch;
            if (crouch) input.sprint = false;
        } else if (e.code === 'Space') {
            e.preventDefault();
            input.jump();
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false;
    });
    window.addEventListener('blur', () => { shift = false; });

    FP.player = {
        position: position,
        radius: RADIUS,
        get sprinting() { return sprinting(); },
        get crouching() { return crouch; },
        get grounded() { return grounded; },
        get velocityY() { return vy; },
    };
})();
