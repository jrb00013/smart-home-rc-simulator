// First-person core: shared namespace for the immersive walk mode.
//
// Feature modules (movement, interaction, audio, HUD) live in their own fp-*.js
// files and plug in here, so each one works on its own and none of them needs
// to edit another's code:
//
//   FP.register({ name, init(), update(dt), enter(), exit() })
//   FP.on(event, fn) / FP.off(event, fn) / FP.emit(event, data)
//   FP.settings.get(key) / FP.settings.set(key, value)   (persisted, emits 'settings')
//   FP.interactables.add(object3D, { prompt, onUse, range })   (see fp-interact.js)
//
// Events emitted by the core and controls.js: 'enter', 'exit'. Modules document
// the events they add (e.g. 'step', 'jump', 'land', 'focus', 'use').
const FP = (function () {
    const listeners = {};
    const modules = [];
    let initialized = false;

    function on(event, fn) {
        (listeners[event] || (listeners[event] = [])).push(fn);
    }

    function off(event, fn) {
        const list = listeners[event];
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
    }

    function emit(event, data) {
        const list = listeners[event];
        if (!list) return;
        for (const fn of list.slice()) {
            try {
                fn(data);
            } catch (err) {
                console.error('[FP] listener for "' + event + '" failed:', err);
            }
        }
    }

    // A failing module is logged and skipped so it can't break the render loop
    function callModule(mod, method, arg) {
        if (typeof mod[method] !== 'function') return;
        try {
            mod[method](arg);
        } catch (err) {
            console.error('[FP] ' + mod.name + '.' + method + ' failed:', err);
        }
    }

    function register(mod) {
        if (!mod || !mod.name) throw new Error('FP.register needs a module with a name');
        modules.push(mod);
        if (initialized) callModule(mod, 'init');
        if (initialized && isActive()) callModule(mod, 'enter');
    }

    function init() {
        if (initialized) return;
        initialized = true;
        for (const mod of modules) callModule(mod, 'init');
    }

    function update(dt) {
        if (!initialized) return;
        for (const mod of modules) callModule(mod, 'update', dt);
    }

    function isActive() {
        return typeof walkMode !== 'undefined' && walkMode === true;
    }

    on('enter', () => { for (const mod of modules) callModule(mod, 'enter'); });
    on('exit', () => { for (const mod of modules) callModule(mod, 'exit'); });

    const SETTINGS_KEY = 'fp.settings.v1';
    const defaults = {
        mouseSensitivity: 1.0, // multiplier on the base look speed
        invertY: false,
        fov: 75,
        headBob: true,
        masterVolume: 0.8,
        showFps: false,
    };
    let values = Object.assign({}, defaults);
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        for (const k of Object.keys(defaults)) {
            if (saved && typeof saved[k] === typeof defaults[k]) values[k] = saved[k];
        }
    } catch (err) {
        // storage unavailable (private mode, blocked): keep defaults
    }

    const settings = {
        defaults: Object.freeze(Object.assign({}, defaults)),
        get(key) { return values[key]; },
        set(key, value) {
            if (!(key in defaults) || typeof value !== typeof defaults[key]) return;
            values[key] = value;
            try {
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(values));
            } catch (err) {
                // not persisted; still applied for this session
            }
            emit('settings', { key, value });
        },
        all() { return Object.assign({}, values); },
        reset() {
            values = Object.assign({}, defaults);
            try { localStorage.removeItem(SETTINGS_KEY); } catch (err) { /* ignore */ }
            for (const k of Object.keys(defaults)) emit('settings', { key: k, value: values[k] });
        },
    };

    // Objects the player can look at and use. fp-interact.js drives focus/use;
    // anything (scene.js, room-devices.js, other modules) may add entries.
    const interactables = {
        list: [],
        add(object3D, opts) {
            if (!object3D) return;
            const entry = Object.assign({ range: 2.5, prompt: 'Use' }, opts || {}, { object: object3D });
            object3D.userData.fpInteractable = entry;
            this.list.push(entry);
            emit('interactable-added', entry);
            return entry;
        },
        remove(object3D) {
            const i = this.list.findIndex((e) => e.object === object3D);
            if (i >= 0) this.list.splice(i, 1);
            if (object3D) delete object3D.userData.fpInteractable;
        },
    };

    return { on, off, emit, register, init, update, isActive, settings, interactables };
})();

window.FP = FP;
