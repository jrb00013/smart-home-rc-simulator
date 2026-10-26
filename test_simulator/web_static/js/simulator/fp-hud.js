// First-person HUD: everything on screen around the 3D view in walk mode.
//
//   FP.hud.toast(text, ms?)      short message ("Kitchen lights on")
//   FP.hud.setPrompt(text|null)  interaction prompt under the crosshair ("E  Open door")
//   FP.hud.showMenu() / hideMenu() / isMenuOpen   pause + settings menu
//   FP.hud.enter()               the "Explore the house" entry (pointer lock or touch)
//   FP.hud.dismissOnboarding()   hide the first-entry controls card early
//   FP.hud.zoneAt(x, y, z)       named area at a world position (feet), e.g. 'Kitchen'
//
// Listens to: 'enter', 'exit', 'resume', 'focus' {entry, prompt}, 'settings'.
// Emits: 'pause', 'unpause'. Owns all walk-mode DOM; defined synchronously so
// fp-interact.js can tell a HUD is present and skip its fallback prompt.
// Optional collaborators (each checked before use): FP.player, FP.input,
// FP.startWalk/stopWalk, FP.interact.
(function () {
    const ONBOARDED_KEY = 'fp.hud.onboarded.v1';
    const $ = (sel, root) => (root || document).querySelector(sel);

    // Named areas, first match wins. Boxes are world-space X/Z (scene.js: house
    // shell x -22..22, z -22..24, front door at z +22, street south of z +27);
    // `minY` is the feet height, so the mezzanine/upstairs wins over rooms below.
    const zones = [
        { name: 'Upstairs', minY: 2.5, x: [-36, 22], z: [-24, 24] },
        { name: 'Kitchen', x: [11, 22.2], z: [-22.2, -6.5] },
        { name: 'Kitchen', x: [17.5, 22.2], z: [0, 14] },
        { name: 'Dining room', x: [5, 11], z: [-16, -9] },
        { name: 'Dining room', x: [8, 17.5], z: [7.5, 13] },
        { name: 'Office', x: [9, 17.5], z: [1, 7.5] },
        { name: 'Foyer', x: [-4.4, 4.4], z: [14, 24.5] },
        { name: 'Garage', x: [-17.6, -4.4], z: [11, 24.5] },
        { name: 'Bedroom', x: [-36, -22.2], z: [-20, -4] },
        { name: 'Living room', x: [-22.2, 22.2], z: [-22.2, 24.5] },
        { name: 'Street', x: [-10, 10], z: [27, 60] },
        { name: 'Front yard', x: [-40, 40], z: [24.5, 60] },
        { name: 'Backyard', x: [-40, 40], z: [-60, -22.2] },
        { name: 'Side yard', x: [-60, 60], z: [-60, 60] },
    ];

    function zoneAt(x, y, z) {
        for (const zone of zones) {
            if (zone.minY !== undefined && !(y >= zone.minY)) continue;
            if (x >= zone.x[0] && x <= zone.x[1] && z >= zone.z[0] && z <= zone.z[1]) return zone.name;
        }
        return 'Outside';
    }

    function isTouchDevice() {
        const mm = (q) => window.matchMedia && window.matchMedia(q).matches;
        return mm('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && !mm('(pointer: fine)'));
    }

    function typingTarget(t) {
        if (typeof isTypingTarget === 'function') return isTypingTarget(t);
        return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    }

    function el(tag, attrs, children) {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs || {})) {
            if (k === 'text') node.textContent = v;
            else if (k === 'html') node.innerHTML = v;
            else node.setAttribute(k, v);
        }
        for (const c of children || []) node.appendChild(c);
        return node;
    }

    // ---------- DOM ----------
    const CONTROLS = [
        ['W A S D', 'Move'],
        ['Mouse', 'Look around'],
        ['Shift', 'Sprint'],
        ['C', 'Crouch'],
        ['Space', 'Jump'],
        ['E', 'Use / interact'],
        ['R', 'Stow / draw remote'],
        ['Click', 'Press remote buttons'],
        ['Esc', 'Pause menu'],
    ];
    const TOUCH_CONTROLS = [
        ['Left stick', 'Move'],
        ['Drag right side', 'Look around'],
        ['Tap', 'Press remote buttons'],
        ['Use / Jump', 'Buttons, bottom right'],
        ['Run / Crouch', 'Toggle buttons'],
        ['II', 'Pause menu'],
    ];

    function keyList(rows) {
        return el('dl', { class: 'fp-keys' }, rows.flatMap(([keys, what]) => [
            el('dt', {}, keys.split(' / ').map((k) => el('kbd', { text: k }))),
            el('dd', { text: what }),
        ]));
    }

    const root = el('div', { id: 'fp-hud', class: 'fp-hud' });
    root.innerHTML = `
        <div class="fp-crosshair" aria-hidden="true"><span class="fp-crosshair-dot"></span></div>
        <div class="fp-prompt" role="status" aria-live="polite"><kbd class="fp-prompt-key">E</kbd><span class="fp-prompt-text"></span></div>
        <div class="fp-zone" aria-live="polite"><span class="fp-zone-name"></span></div>
        <div class="fp-toasts" role="status" aria-live="polite"></div>
        <div class="fp-fps" aria-hidden="true"></div>
        <div class="fp-stance" aria-hidden="true"><span data-stance="sprint">Sprint</span><span data-stance="crouch">Crouch</span></div>
        <div class="fp-hint" aria-hidden="true"><kbd>Esc</kbd> Menu</div>
        <div class="fp-onboard" role="note" aria-labelledby="fp-onboard-title" aria-hidden="true">
            <h2 id="fp-onboard-title">Explore the house</h2>
            <div class="fp-onboard-keys"></div>
            <p class="fp-onboard-foot">Press <kbd>Esc</kbd> any time for settings</p>
        </div>
        <button type="button" class="fp-resume" hidden>
            <span class="fp-resume-title">Click to resume</span>
            <span class="fp-resume-sub">Mouse look was released</span>
        </button>
        <div class="fp-touch" aria-hidden="true">
            <div class="fp-look-zone"></div>
            <div class="fp-stick-zone"><div class="fp-stick"><div class="fp-stick-knob"></div></div></div>
            <div class="fp-touch-buttons">
                <button type="button" class="fp-tbtn" data-act="crouch" aria-pressed="false">Crouch</button>
                <button type="button" class="fp-tbtn" data-act="sprint" aria-pressed="false">Run</button>
                <button type="button" class="fp-tbtn fp-tbtn-big" data-act="use">Use</button>
                <button type="button" class="fp-tbtn fp-tbtn-big" data-act="jump">Jump</button>
            </div>
            <button type="button" class="fp-tbtn fp-pause-btn" data-act="pause" aria-label="Pause menu">II</button>
        </div>
        <div class="fp-menu" id="fp-menu" role="dialog" aria-modal="true" aria-labelledby="fp-menu-title" hidden>
            <div class="fp-menu-card">
                <section class="fp-view" data-view="main">
                    <h2 id="fp-menu-title">Paused</h2>
                    <nav class="fp-menu-nav" aria-label="Pause menu">
                        <button type="button" class="fp-btn fp-btn-primary" data-cmd="resume">Resume</button>
                        <button type="button" class="fp-btn" data-cmd="view:settings">Settings</button>
                        <button type="button" class="fp-btn" data-cmd="view:controls">Controls</button>
                        <button type="button" class="fp-btn fp-btn-quiet" data-cmd="exit">Exit to overview</button>
                    </nav>
                </section>
                <section class="fp-view" data-view="settings" hidden aria-labelledby="fp-settings-title">
                    <h2 id="fp-settings-title">Settings</h2>
                    <div class="fp-settings">
                        <label class="fp-row" for="fp-set-mouseSensitivity"><span>Mouse sensitivity</span>
                            <input type="range" id="fp-set-mouseSensitivity" data-key="mouseSensitivity" min="0.2" max="3" step="0.1">
                            <output for="fp-set-mouseSensitivity"></output></label>
                        <label class="fp-row" for="fp-set-fov"><span>Field of view</span>
                            <input type="range" id="fp-set-fov" data-key="fov" min="60" max="100" step="1">
                            <output for="fp-set-fov"></output></label>
                        <label class="fp-row" for="fp-set-masterVolume"><span>Master volume</span>
                            <input type="range" id="fp-set-masterVolume" data-key="masterVolume" min="0" max="1" step="0.05">
                            <output for="fp-set-masterVolume"></output></label>
                        <label class="fp-row fp-switch"><span>Invert mouse Y</span>
                            <input type="checkbox" role="switch" data-key="invertY"><i aria-hidden="true"></i></label>
                        <label class="fp-row fp-switch"><span>Head bob</span>
                            <input type="checkbox" role="switch" data-key="headBob"><i aria-hidden="true"></i></label>
                        <label class="fp-row fp-switch"><span>Show FPS</span>
                            <input type="checkbox" role="switch" data-key="showFps"><i aria-hidden="true"></i></label>
                    </div>
                    <div class="fp-menu-foot">
                        <button type="button" class="fp-btn fp-btn-quiet" data-cmd="reset">Reset to defaults</button>
                        <button type="button" class="fp-btn" data-cmd="view:main">Back</button>
                    </div>
                </section>
                <section class="fp-view" data-view="controls" hidden aria-labelledby="fp-controls-title">
                    <h2 id="fp-controls-title">Controls</h2>
                    <div class="fp-controls-list"></div>
                    <div class="fp-menu-foot">
                        <button type="button" class="fp-btn" data-cmd="view:main">Back</button>
                    </div>
                </section>
            </div>
        </div>`;
    document.body.appendChild(root);

    const ui = {
        crosshair: $('.fp-crosshair', root),
        prompt: $('.fp-prompt', root),
        promptKey: $('.fp-prompt-key', root),
        promptText: $('.fp-prompt-text', root),
        zone: $('.fp-zone', root),
        zoneName: $('.fp-zone-name', root),
        toasts: $('.fp-toasts', root),
        fps: $('.fp-fps', root),
        stance: $('.fp-stance', root),
        onboard: $('.fp-onboard', root),
        resume: $('.fp-resume', root),
        touch: $('.fp-touch', root),
        stick: $('.fp-stick', root),
        knob: $('.fp-stick-knob', root),
        menu: $('#fp-menu', root),
    };

    // ---------- state ----------
    let touchMode = isTouchDevice();
    let usingLock = false;   // walk mode was entered with pointer lock (desktop)
    let menuOpen = false;
    let returnFocus = null;
    let onboardTimer = 0;
    let zoneTimer = 0;
    let currentZone = null;
    let zoneAccum = 0;
    let fpsFrames = 0;
    let fpsTime = 0;
    let baseFov = null;

    const walking = () => FP.isActive();
    const cssClass = (name, on) => document.body.classList.toggle(name, !!on);

    function refreshTouchClass() {
        // Touch controls need the movement module's virtual input + lock-free walk
        cssClass('fp-touch-mode', touchMode);
        cssClass('fp-touch-ready', touchMode && !!(FP.input && FP.startWalk));
        const show = (sel, on) => { const b = $(sel, ui.touch); if (b) b.hidden = !on; };
        show('[data-act="use"]', !!(FP.interact && FP.interact.use));
        show('[data-act="jump"]', !!(FP.input && FP.input.jump));
        show('[data-act="sprint"]', !!(FP.input && FP.input.setSprint));
        show('[data-act="crouch"]', !!(FP.input && FP.input.setCrouch));
        $('.fp-onboard-keys', root).replaceChildren(keyList(touchMode ? TOUCH_CONTROLS : CONTROLS));
        $('.fp-controls-list', root).replaceChildren(keyList(touchMode ? TOUCH_CONTROLS : CONTROLS));
        $('.fp-onboard-foot', root).hidden = touchMode;
    }

    // ---------- toasts / prompt / zone ----------
    function toast(text, ms) {
        if (!text) return;
        const t = el('div', { class: 'fp-toast', text: String(text) });
        ui.toasts.appendChild(t);
        while (ui.toasts.children.length > 3) ui.toasts.firstElementChild.remove();
        requestAnimationFrame(() => t.classList.add('fp-in'));
        setTimeout(() => {
            t.classList.remove('fp-in');
            t.classList.add('fp-out');
            setTimeout(() => t.remove(), 400);
        }, Math.max(800, ms || 2200));
    }

    function setPrompt(text) {
        const on = !!text;
        if (on) {
            ui.promptText.textContent = String(text);
            ui.promptKey.textContent = touchMode ? 'Use' : 'E';
        }
        ui.prompt.classList.toggle('fp-on', on);
        ui.crosshair.classList.toggle('fp-focus', on);
    }

    function showZone(name) {
        ui.zoneName.textContent = name;
        ui.zone.classList.remove('fp-on');
        void ui.zone.offsetWidth; // restart the fade when areas change quickly
        ui.zone.classList.add('fp-on');
        clearTimeout(zoneTimer);
        zoneTimer = setTimeout(() => ui.zone.classList.remove('fp-on'), 2600);
    }

    function playerFeet() {
        if (FP.player && FP.player.position) return FP.player.position;
        if (typeof camera === 'undefined' || !camera) return null;
        const eye = typeof EYE_HEIGHT === 'number' ? EYE_HEIGHT : 1.62;
        return { x: camera.position.x, y: camera.position.y - eye, z: camera.position.z };
    }

    function updateZone(force) {
        const p = playerFeet();
        if (!p) return;
        const name = zoneAt(p.x, p.y, p.z);
        if (name !== currentZone || force) {
            currentZone = name;
            showZone(name);
        }
    }

    // ---------- onboarding ----------
    function showOnboarding() {
        ui.onboard.classList.add('fp-on');
        ui.onboard.setAttribute('aria-hidden', 'false');
        clearTimeout(onboardTimer);
        onboardTimer = setTimeout(hideOnboarding, 9000);
        try { localStorage.setItem(ONBOARDED_KEY, '1'); } catch (err) { /* not persisted */ }
    }

    function hideOnboarding() {
        clearTimeout(onboardTimer);
        ui.onboard.classList.remove('fp-on');
        ui.onboard.setAttribute('aria-hidden', 'true');
    }

    function onboarded() {
        try { return localStorage.getItem(ONBOARDED_KEY) === '1'; } catch (err) { return false; }
    }

    // ---------- entry / exit ----------
    function enter() {
        if (walking()) return;
        if (touchMode && FP.startWalk) {
            FP.startWalk();
            return;
        }
        if (typeof window.enterWalkMode === 'function') window.enterWalkMode();
    }

    function exitToOverview() {
        hideMenu(true);
        if (FP.stopWalk) {
            FP.stopWalk();
            if (document.pointerLockElement) document.exitPointerLock();
        } else if (typeof window.exitWalkMode === 'function') {
            window.exitWalkMode();
        }
    }

    function requestLock() {
        const canvas = typeof renderer !== 'undefined' && renderer ? renderer.domElement : null;
        if (!canvas || !canvas.requestPointerLock) return false;
        try {
            const p = canvas.requestPointerLock();
            if (p && p.catch) p.catch(() => showResumeOverlay());
        } catch (err) {
            showResumeOverlay();
        }
        return true;
    }

    function resume() {
        hideMenu(true);
        if (usingLock && !touchMode) requestLock();
    }

    function showResumeOverlay() {
        if (!walking()) return;
        hideMenu(true);
        ui.resume.hidden = false;
        requestAnimationFrame(() => ui.resume.classList.add('fp-on'));
        ui.resume.focus({ preventScroll: true });
    }

    function hideResumeOverlay() {
        ui.resume.classList.remove('fp-on');
        ui.resume.hidden = true;
    }

    // Called by controls.js when pointer lock is lost while walking. Returning true
    // keeps walk mode alive (paused) instead of falling back to the orbit view.
    function onPointerLockLost() {
        if (!walking()) return false;
        // Lost focus (alt-tab, devtools, notification): offer a one-click resume.
        // Otherwise it was the player's Esc: open the pause menu.
        if (document.hidden || !document.hasFocus()) showResumeOverlay();
        else showMenu();
        return true;
    }

    // ---------- menu ----------
    function focusables() {
        return Array.from(ui.menu.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])'))
            .filter((n) => !n.disabled && n.offsetParent !== null);
    }

    function setView(name) {
        for (const v of ui.menu.querySelectorAll('.fp-view')) v.hidden = v.dataset.view !== name;
        const view = ui.menu.querySelector(`.fp-view[data-view="${name}"]`);
        ui.menu.setAttribute('aria-labelledby', view.querySelector('h2').id);
        const first = view.querySelector('input, button');
        if (first) first.focus({ preventScroll: true });
    }

    function showMenu() {
        if (menuOpen) return;
        menuOpen = true;
        hideResumeOverlay();
        hideOnboarding();
        syncSettings();
        returnFocus = document.activeElement;
        ui.menu.hidden = false;
        cssClass('fp-menu-open', true);
        requestAnimationFrame(() => ui.menu.classList.add('fp-in'));
        setView('main');
        releaseTouchInput();
        FP.emit('pause');
    }

    // `quiet`: closing as part of resume/exit (focus goes back to the canvas, not the old element)
    function hideMenu(quiet) {
        if (!menuOpen) return;
        menuOpen = false;
        ui.menu.classList.remove('fp-in');
        ui.menu.hidden = true;
        cssClass('fp-menu-open', false);
        const back = returnFocus;
        returnFocus = null;
        if (quiet) {
            if (document.activeElement && ui.menu.contains(document.activeElement)) document.activeElement.blur();
        } else if (back && back.focus && document.contains(back)) {
            back.focus({ preventScroll: true });
        }
        FP.emit('unpause');
    }

    function fmt(key, v) {
        if (key === 'fov') return Math.round(v) + '°';
        if (key === 'masterVolume') return Math.round(v * 100) + '%';
        if (key === 'mouseSensitivity') return Number(v).toFixed(1) + '×';
        return String(v);
    }

    function syncSettings() {
        for (const input of ui.menu.querySelectorAll('[data-key]')) {
            const key = input.dataset.key;
            const v = FP.settings.get(key);
            if (input.type === 'checkbox') {
                input.checked = !!v;
            } else {
                input.value = String(v);
                input.setAttribute('aria-valuetext', fmt(key, v));
                const out = input.parentElement.querySelector('output');
                if (out) out.textContent = fmt(key, v);
            }
        }
    }

    ui.menu.addEventListener('input', (e) => {
        const input = e.target;
        const key = input.dataset && input.dataset.key;
        if (!key) return;
        FP.settings.set(key, input.type === 'checkbox' ? input.checked : Number(input.value));
    });

    ui.menu.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-cmd]');
        if (!btn) return;
        const cmd = btn.dataset.cmd;
        if (cmd === 'resume') resume();
        else if (cmd === 'exit') exitToOverview();
        else if (cmd === 'reset') { FP.settings.reset(); toast('Settings reset'); }
        else if (cmd.startsWith('view:')) setView(cmd.slice(5));
    });

    // Click on the dimmed backdrop (outside the card) resumes, like most games
    ui.menu.addEventListener('mousedown', (e) => {
        if (e.target === ui.menu) resume();
    });

    ui.resume.addEventListener('click', () => {
        hideResumeOverlay();
        if (!requestLock()) showMenu();
    });

    // ---------- keyboard ----------
    window.addEventListener('keydown', (e) => {
        if (menuOpen) {
            // The menu owns the keyboard: no walking or TV shortcuts behind it
            e.stopImmediatePropagation();
            if (e.code === 'Escape') {
                e.preventDefault();
                if (ui.menu.querySelector('.fp-view[data-view="main"]').hidden) setView('main');
                else resume();
            } else if (e.key === 'Tab') {
                const items = focusables();
                if (!items.length) return;
                const first = items[0];
                const last = items[items.length - 1];
                if (e.shiftKey && (document.activeElement === first || !ui.menu.contains(document.activeElement))) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && (document.activeElement === last || !ui.menu.contains(document.activeElement))) {
                    e.preventDefault(); first.focus();
                }
            }
            return;
        }
        if (e.repeat || typingTarget(e.target)) return;
        if (walking()) {
            if (e.code === 'Escape' && !document.pointerLockElement) {
                // Lock-free walk (touch, or before/after a lock): Esc opens the menu
                e.preventDefault();
                showMenu();
            } else if (/^Key[WASD]$/.test(e.code) && ui.onboard.classList.contains('fp-on')) {
                setTimeout(hideOnboarding, 1500); // they've got it
            }
            return;
        }
        const onControl = e.target && /^(BUTTON|A)$/.test(e.target.tagName);
        if (e.code === 'Enter' && !onControl && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            enter();
        }
    }, true);

    // ---------- touch controls ----------
    const stick = { id: null, cx: 0, cy: 0, radius: 56 };
    const look = { id: null, x: 0, y: 0, startX: 0, startY: 0, t: 0, moved: false };

    function setMove(x, y) {
        if (!FP.input) return;
        FP.input.moveX = x;
        FP.input.moveY = y;
    }

    function releaseTouchInput() {
        stick.id = null;
        look.id = null;
        ui.stick.classList.remove('fp-active');
        ui.knob.style.transform = '';
        setMove(0, 0);
    }

    function capture(zone, id) {
        try { zone.setPointerCapture(id); } catch (err) { /* synthetic or already-ended pointer */ }
    }

    const stickZone = $('.fp-stick-zone', root);
    stickZone.addEventListener('pointerdown', (e) => {
        if (stick.id !== null) return;
        e.preventDefault();
        stick.id = e.pointerId;
        capture(stickZone, e.pointerId);
        const zr = stickZone.getBoundingClientRect();
        stick.cx = e.clientX;
        stick.cy = e.clientY;
        ui.stick.style.left = (e.clientX - zr.left) + 'px';
        ui.stick.style.top = (e.clientY - zr.top) + 'px';
        ui.stick.classList.add('fp-active');
    });
    stickZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stick.id) return;
        let dx = e.clientX - stick.cx;
        let dy = e.clientY - stick.cy;
        const len = Math.hypot(dx, dy);
        if (len > stick.radius) { dx *= stick.radius / len; dy *= stick.radius / len; }
        ui.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        // moveY: +1 = forward (stick pushed up), moveX: +1 = strafe right
        setMove(dx / stick.radius, -dy / stick.radius);
    });
    const endStick = (e) => {
        if (e.pointerId !== stick.id) return;
        stick.id = null;
        ui.stick.classList.remove('fp-active');
        ui.stick.style.left = ui.stick.style.top = '';
        ui.knob.style.transform = '';
        setMove(0, 0);
    };
    stickZone.addEventListener('pointerup', endStick);
    stickZone.addEventListener('pointercancel', endStick);

    const lookZone = $('.fp-look-zone', root);
    lookZone.addEventListener('pointerdown', (e) => {
        if (look.id !== null) return;
        e.preventDefault();
        capture(lookZone, e.pointerId);
        Object.assign(look, { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, t: performance.now(), moved: false });
    });
    lookZone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== look.id) return;
        const dx = e.clientX - look.x;
        const dy = e.clientY - look.y;
        look.x = e.clientX;
        look.y = e.clientY;
        if (Math.hypot(e.clientX - look.startX, e.clientY - look.startY) > 8) look.moved = true;
        if (FP.input && FP.input.lookDelta) FP.input.lookDelta(dx, dy);
    });
    const endLook = (e) => {
        if (e.pointerId !== look.id) return;
        look.id = null;
        // A quick tap goes through to the 3D view, so remote buttons stay clickable
        if (e.type === 'pointerup' && !look.moved && performance.now() - look.t < 300) {
            const canvas = typeof renderer !== 'undefined' && renderer ? renderer.domElement : null;
            if (canvas) canvas.dispatchEvent(new MouseEvent('click', { clientX: e.clientX, clientY: e.clientY, bubbles: true }));
        }
    };
    lookZone.addEventListener('pointerup', endLook);
    lookZone.addEventListener('pointercancel', endLook);

    ui.touch.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.dataset.act;
        if (act === 'pause') showMenu();
        else if (act === 'use' && FP.interact && FP.interact.use) FP.interact.use();
        else if (act === 'jump' && FP.input && FP.input.jump) FP.input.jump();
        else if (act === 'sprint' || act === 'crouch') {
            const on = btn.getAttribute('aria-pressed') !== 'true';
            btn.setAttribute('aria-pressed', String(on));
            const setter = act === 'sprint' ? 'setSprint' : 'setCrouch';
            if (FP.input && FP.input[setter]) FP.input[setter](on);
            if (on) { // sprint and crouch are exclusive
                const other = $(`[data-act="${act === 'sprint' ? 'crouch' : 'sprint'}"]`, ui.touch);
                if (other.getAttribute('aria-pressed') === 'true') other.click();
            }
        }
    });

    function resetTouchToggles() {
        for (const b of ui.touch.querySelectorAll('[aria-pressed="true"]')) b.click();
    }

    // First real touch switches a hybrid laptop into touch layout
    window.addEventListener('touchstart', () => {
        if (touchMode) return;
        touchMode = true;
        refreshTouchClass();
    }, { passive: true, once: true });

    // ---------- FOV fallback (until a movement module applies it) ----------
    function applyFov(on) {
        if (FP.player || typeof camera === 'undefined' || !camera) return;
        if (on) {
            if (baseFov === null) baseFov = camera.fov;
            camera.fov = FP.settings.get('fov');
        } else if (baseFov !== null) {
            camera.fov = baseFov;
            baseFov = null;
        }
        camera.updateProjectionMatrix();
    }

    // ---------- events ----------
    FP.on('focus', (data) => setPrompt(data && (data.entry || data.prompt) ? (data.prompt || 'Use') : null));
    FP.on('resume', () => { hideMenu(true); hideResumeOverlay(); });
    FP.on('settings', (d) => {
        if (menuOpen) syncSettings();
        if (d && d.key === 'showFps') cssClass('fp-show-fps', d.value);
        if (d && d.key === 'fov' && walking()) applyFov(true);
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement) { hideMenu(true); hideResumeOverlay(); }
    });
    document.addEventListener('pointerlockerror', () => {
        if (walking()) showResumeOverlay();
        else if (FP.startWalk) FP.startWalk();
        else toast('Mouse look is unavailable here. Click the view and try again.', 3500);
    });

    // Server notifications (#notification, e.g. "Kitchen lights on") become HUD
    // toasts while walking; the orbit-mode banner is hidden by fp-hud.css then.
    const note = document.getElementById('notification');
    if (note && window.MutationObserver) {
        let last = '';
        let lastAt = 0;
        new MutationObserver(() => {
            if (!walking() || !note.classList.contains('show')) return;
            const text = note.textContent.trim();
            const now = performance.now();
            if (!text || (text === last && now - lastAt < 500)) return;
            last = text;
            lastAt = now;
            toast(text);
        }).observe(note, { attributes: true, attributeFilter: ['class'], childList: true, characterData: true, subtree: true });
    }

    FP.register({
        name: 'hud',
        init() {
            refreshTouchClass();
            cssClass('fp-show-fps', FP.settings.get('showFps'));
        },
        enter() {
            usingLock = !!document.pointerLockElement;
            refreshTouchClass();
            cssClass('fp-walking', true);
            hideResumeOverlay();
            setPrompt(null);
            applyFov(true);
            currentZone = null;
            zoneAccum = 0;
            updateZone(true);
            if (!onboarded()) showOnboarding();
        },
        exit() {
            hideMenu(true);
            hideResumeOverlay();
            hideOnboarding();
            setPrompt(null);
            releaseTouchInput();
            resetTouchToggles();
            applyFov(false);
            ui.zone.classList.remove('fp-on');
            cssClass('fp-walking', false);
        },
        update(dt) {
            if (!walking()) return;
            zoneAccum += dt;
            if (zoneAccum >= 0.2) { zoneAccum = 0; updateZone(false); }
            if (FP.settings.get('showFps')) {
                fpsFrames++;
                fpsTime += dt;
                if (fpsTime >= 0.5) {
                    ui.fps.textContent = Math.round(fpsFrames / fpsTime) + ' FPS';
                    fpsFrames = 0;
                    fpsTime = 0;
                }
            }
            if (FP.player) {
                ui.stance.classList.toggle('fp-sprint', !!FP.player.sprinting);
                ui.stance.classList.toggle('fp-crouch', !!FP.player.crouching);
            }
        },
    });

    refreshTouchClass();

    FP.hud = {
        toast,
        setPrompt,
        showMenu,
        hideMenu: () => hideMenu(false),
        get isMenuOpen() { return menuOpen; },
        enter,
        resume,
        dismissOnboarding: hideOnboarding,
        onPointerLockLost,
        zones,
        zoneAt,
        get zone() { return currentZone; },
    };
})();
