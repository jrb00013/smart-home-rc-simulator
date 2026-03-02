// 3D Virtual TV Simulator using Three.js
// Full Interactive 3D Experience with Remote Control

let scene, camera, renderer, controls;
let tvMesh, screenMesh, roomGroup, remoteMesh, remoteGroup, handGroup;
let tvFrame, tvPowerLED, tvGlowLight;
let tvState = {};
let socket;
let irSignal = null;
let activeButton = null;
let buttonPressTime = 0;
let raycaster, mouse;

// Power animation state - Enhanced with more effects
let powerAnimation = {
    isAnimating: false,
    startTime: 0,
    duration: 2000, // 2 seconds for power on/off
    targetState: false,
    currentBrightness: 0,
    flickerPhase: 0,
    scanLinePosition: 0,
    particles: [],              // Particle effects during power on
    glowIntensity: 0,           // Bezel glow intensity
    colorShift: 0,              // Color temperature shift
    rippleEffect: 0,            // Ripple effect on screen
    energyWaves: []             // Energy wave effects
};

// Channel change animation - Enhanced with blur, zoom, particles
let channelAnimation = {
    isAnimating: false,
    startTime: 0,
    duration: 800,
    oldChannel: 1,
    newChannel: 1,
    slideProgress: 0,
    blurAmount: 0,              // Blur during transition
    zoomLevel: 1,               // Zoom effect
    particles: [],              // Particle burst on change
    glowIntensity: 0,           // Glow around channel number
    rippleWaves: []             // Ripple effects
};

// App switching animation
let appAnimation = {
    isAnimating: false,
    startTime: 0,
    duration: 2500, // Extended to 2.5 seconds for in-depth animations
    oldApp: 'Home',
    newApp: 'Home',
    fadeProgress: 0,
    phase: 'loading', // 'loading', 'logo', 'content'
    logoScale: 0,
    logoRotation: 0,
    logoOpacity: 0,
    particles: [],
    loadingProgress: 0,
    slideOffset: 0,
    zoomScale: 1
};

// Volume change animation - Enhanced with waveform visualization
let volumeAnimation = {
    isAnimating: false,
    startTime: 0,
    duration: 500,
    oldVolume: 50,
    newVolume: 50,
    wavePhase: 0,
    waveform: [],               // Waveform visualization data
    rippleEffect: 0,            // Ripple from volume bar
    glowPulse: 0,               // Glow pulse effect
    particles: []                // Volume indicator particles
};

// HDMI input switching animation
let hdmiAnimation = {
    isAnimating: false,
    startTime: 0,
    duration: 1500,
    oldInput: 'HDMI 1',
    newInput: 'HDMI 1',
    slideProgress: 0,
    fadeProgress: 0,
    logoScale: 0
};

// Channel overlay animation
let channelOverlay = {
    visible: false,
    startTime: 0,
    duration: 3000,
    channel: 1,
    opacity: 0,
    scale: 0,
    slideY: -50
};

// Remote default position (used for camera "Look at remote" view)
let remoteLookClose = {
    basePosition: new THREE.Vector3(1.3, 0.95, 2.5),
    baseScale: 1,
    baseRotationY: -Math.PI / 5
};

// 3D UI elements
let ui3DElements = {
    channelOverlayMesh: null,
    hdmiOverlayMesh: null,
    volumeBarMesh: null,
    infoPanelMesh: null
};

// Screen effects
let screenEffects = {
    scanLines: true,
    pixelShimmer: true,
    vignette: true,
    reflection: true,
};

// Volume Stabilizer System - Prevents volume spikes when switching apps
let volumeStabilizer = {
    enabled: true,
    targetVolume: 50,           // Target normalized volume
    maxVolume: 70,              // Maximum allowed volume (prevents spikes)
    minVolume: 20,              // Minimum volume floor
    smoothingTime: 1000,        // Time to smooth volume changes (ms)
    isStabilizing: false,
    startVolume: 50,
    targetVol: 50,
    startTime: 0,
    appVolumeLevels: {          // Per-app volume adjustments
        'Home': 0,              // No adjustment
        'YouTube': -5,          // Slightly quieter
        'Netflix': -3,          // Slightly quieter
        'Amazon Prime': -4,     // Slightly quieter
        'HBO Max': -2           // Slightly quieter
    },
    lastApp: 'Home'
};

// TV Shows Database - Multiple different shows for different channels
let tvShows = {
    // News Channels (1-5)
    1: { name: 'Morning News', type: 'news', genre: 'News', color: { r: 200, g: 200, b: 255 } },
    2: { name: 'Evening News', type: 'news', genre: 'News', color: { r: 150, g: 150, b: 200 } },
    3: { name: 'Breaking News', type: 'news', genre: 'News', color: { r: 255, g: 100, b: 100 } },
    4: { name: 'Weather Channel', type: 'weather', genre: 'Weather', color: { r: 100, g: 200, b: 255 } },
    5: { name: 'Business Report', type: 'news', genre: 'Business', color: { r: 255, g: 200, b: 100 } },
    
    // Unique Creative Shows (6-15)
    6: { name: 'Big Red Dog', type: 'bigreddog', genre: 'Comedy', color: { r: 255, g: 0, b: 0 } },
    7: { name: 'Pabst Blue Ribbon', type: 'pabst', genre: 'Drama', color: { r: 0, g: 100, b: 200 } },
    8: { name: 'Pool Lifeguard Live', type: 'lifeguard', genre: 'Reality', color: { r: 0, g: 200, b: 255 } },
    9: { name: 'Cup Show', type: 'cups', genre: 'Documentary', color: { r: 200, g: 200, b: 255 } },
    10: { name: 'Trash Can Life', type: 'trashcan', genre: 'Fantasy', color: { r: 100, g: 100, b: 100 } },
    11: { name: 'Loch Ness Kid', type: 'lochness', genre: 'Adventure', color: { r: 0, g: 150, b: 100 } },
    12: { name: 'Rotten Banana', type: 'banana', genre: 'Nature', color: { r: 255, g: 255, b: 0 } },
    13: { name: 'Endless Drive', type: 'driving', genre: 'Action', color: { r: 100, g: 100, b: 150 } },
    14: { name: 'Ocean Meets Volcano', type: 'oceanvolcano', genre: 'Nature', color: { r: 255, g: 100, b: 0 } },
    15: { name: 'Fridge Planet', type: 'fridgeplanet', genre: 'Sitcom', color: { r: 200, g: 255, b: 255 } },
    
    // More Creative Shows (16-20)
    16: { name: 'Talking Toaster', type: 'toaster', genre: 'Comedy', color: { r: 255, g: 200, b: 100 } },
    17: { name: 'Cloud Watching', type: 'clouds', genre: 'Relaxation', color: { r: 200, g: 220, b: 255 } },
    18: { name: 'Paint Drying Live', type: 'paint', genre: 'Documentary', color: { r: 150, g: 150, b: 200 } },
    19: { name: 'Rubber Duck Adventures', type: 'rubberduck', genre: 'Adventure', color: { r: 255, g: 255, b: 0 } },
    20: { name: 'The Office', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 200, b: 100 } },
    
    // Sports (21-30)
    21: { name: 'Football Live', type: 'sports', genre: 'Sports', color: { r: 0, g: 150, b: 0 } },
    22: { name: 'Basketball Game', type: 'sports', genre: 'Sports', color: { r: 255, g: 150, b: 0 } },
    23: { name: 'Baseball Tonight', type: 'sports', genre: 'Sports', color: { r: 200, g: 100, b: 0 } },
    24: { name: 'Soccer Highlights', type: 'sports', genre: 'Sports', color: { r: 0, g: 200, b: 100 } },
    25: { name: 'Tennis Championship', type: 'sports', genre: 'Sports', color: { r: 255, g: 255, b: 200 } },
    
    // Movies (31-40)
    31: { name: 'Action Movie', type: 'movie', genre: 'Action', color: { r: 255, g: 50, b: 50 } },
    32: { name: 'Sci-Fi Film', type: 'movie', genre: 'Sci-Fi', color: { r: 100, g: 100, b: 255 } },
    33: { name: 'Comedy Special', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 200, b: 0 } },
    34: { name: 'Horror Night', type: 'horror', genre: 'Horror', color: { r: 50, g: 0, b: 0 } },
    35: { name: 'Romance Film', type: 'romance', genre: 'Romance', color: { r: 255, g: 150, b: 200 } },
    
    // Kids Channels (41-50)
    41: { name: 'Cartoon Network', type: 'cartoon', genre: 'Kids', color: { r: 255, g: 200, b: 100 } },
    42: { name: 'Disney Channel', type: 'cartoon', genre: 'Kids', color: { r: 100, g: 200, b: 255 } },
    43: { name: 'Nickelodeon', type: 'cartoon', genre: 'Kids', color: { r: 255, g: 100, b: 100 } },
    44: { name: 'PBS Kids', type: 'educational', genre: 'Educational', color: { r: 100, g: 255, b: 100 } },
    45: { name: 'Animal Planet', type: 'documentary', genre: 'Nature', color: { r: 100, g: 200, b: 100 } },
    
    // Music Channels (51-60)
    51: { name: 'MTV', type: 'music', genre: 'Music', color: { r: 255, g: 0, b: 100 } },
    52: { name: 'VH1', type: 'music', genre: 'Music', color: { r: 200, g: 100, b: 255 } },
    53: { name: 'Classic Rock', type: 'music', genre: 'Music', color: { r: 150, g: 100, b: 50 } },
    54: { name: 'Jazz Channel', type: 'music', genre: 'Music', color: { r: 100, g: 150, b: 200 } },
    55: { name: 'Country Music', type: 'music', genre: 'Music', color: { r: 255, g: 200, b: 150 } },
    
    // Default fallback
    default: { name: 'TV Channel', type: 'general', genre: 'General', color: { r: 100, g: 100, b: 150 } }
};

// Get TV show for channel
function getTVShow(channel) {
    return tvShows[channel] || tvShows.default;
}

// Initialize WebSocket connection
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        console.log('[Volume Stabilizer] Server connection established - volume stabilization active');
        document.getElementById('loading').style.display = 'none';
        // Initialize IR visualization
        if (typeof initIRVisualization === 'function') {
            initIRVisualization();
        }
        // Request initial state when connected
        socket.emit('request_state');
        
        // Verify volume stabilizer is connected
        if (volumeStabilizer.enabled) {
            console.log('[Volume Stabilizer] Volume stabilizer enabled and connected to server');
            console.log(`[Volume Stabilizer] Max volume: ${volumeStabilizer.maxVolume}%, Target: ${volumeStabilizer.targetVolume}%`);
        }
    });
    
    socket.on('disconnect', () => {
        console.warn('[Volume Stabilizer] Server disconnected - volume stabilization paused');
    });
    
    socket.on('tv_state_update', (state) => {
        updateTVState(state);
    });
    
    socket.on('connected', (data) => {
        console.log('Server:', data.message);
    });
    
    // Handle volume updates from stabilizer
    socket.on('volume_stabilized', (data) => {
        if (data.volume !== undefined) {
            tvState.volume = data.volume;
            console.log(`[Volume Stabilizer] Volume updated to ${data.volume}%`);
        }
    });
    
    // Async event handler for hardware interrupts from assembly/C
    socket.on('hardware_interrupt', async (interruptData) => {
        await handleHardwareInterrupt(interruptData);
    });
    
    // Button press event from interrupt handler
    socket.on('button_press_interrupt', async (buttonData) => {
        await handleButtonPressInterrupt(buttonData);
    });
}

// Async event handler for hardware interrupts (bridges assembly -> C -> JavaScript)
// This is ONLY called for actual hardware interrupts, not UI button clicks
async function handleHardwareInterrupt(interruptData) {
    try {
        console.log('[Interrupt Handler] Hardware interrupt received:', interruptData);
        
        // Process interrupt asynchronously
        if (interruptData.type === 'gpio' && interruptData.button_code) {
            // Forward to button press interrupt handler
            await handleButtonPressInterrupt({
                button_code: interruptData.button_code,
                button_name: interruptData.button_name,
                timestamp: interruptData.timestamp
            });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error processing interrupt:', error);
    }
}

// Async event handler for button press interrupts (from hardware, not UI clicks)
async function handleButtonPressInterrupt(buttonData) {
    try {
        console.log('[Interrupt Handler] Hardware button press interrupt:', buttonData);
        
        const buttonCode = buttonData.button_code;
        const buttonName = buttonData.button_name || getButtonNameFromCode(buttonCode);
        
        // Send button press to server (which will handle all button logic)
        // The server will update state and broadcast to all clients
        if (socket && socket.connected) {
            socket.emit('button_press', { button_code: buttonCode });
        }
        
        // Visual feedback
        if (buttonName) {
            triggerIRSignal(buttonName);
        }
        
        // Note: Channel changes and other button logic are handled by the server
        // in handle_button_press(), which then broadcasts tv_state_update
    } catch (error) {
        console.error('[Interrupt Handler] Error handling button press:', error);
    }
}

// Async channel change handler
async function handleChannelChange(direction) {
    try {
        const oldChannel = tvState.channel;
        let newChannel = oldChannel;
        
        if (direction > 0) {
            newChannel = (oldChannel % 999) + 1;
        } else {
            newChannel = ((oldChannel - 2) % 999) + 1;
        }
        
        console.log(`[Interrupt Handler] Channel change: ${oldChannel} -> ${newChannel}`);
        
        // Update state
        tvState.channel = newChannel;
        
        // Trigger channel animation
        startChannelAnimation(oldChannel, newChannel);
        showChannelOverlay(newChannel);
        
        // Send update to server
        if (socket && socket.connected) {
            socket.emit('update_channel', { channel: newChannel });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error changing channel:', error);
    }
}

// Async channel number input handler
async function handleChannelNumberInput(digit) {
    try {
        if (!tvState.channel_input) {
            tvState.channel_input = '';
        }
        
        tvState.channel_input += digit.toString();
        
        // If we have 3 digits or user presses OK, change channel
        if (tvState.channel_input.length >= 3) {
            const newChannel = parseInt(tvState.channel_input);
            if (newChannel >= 1 && newChannel <= 999) {
                await handleChannelChangeTo(newChannel);
            }
            tvState.channel_input = '';
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error handling channel number input:', error);
    }
}

// Async channel change to specific number
async function handleChannelChangeTo(channel) {
    try {
        const oldChannel = tvState.channel;
        const newChannel = Math.max(1, Math.min(999, channel));
        
        console.log(`[Interrupt Handler] Channel change to: ${oldChannel} -> ${newChannel}`);
        
        tvState.channel = newChannel;
        
        startChannelAnimation(oldChannel, newChannel);
        showChannelOverlay(newChannel);
        
        if (socket && socket.connected) {
            socket.emit('update_channel', { channel: newChannel });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error changing to channel:', error);
    }
}

// Button map from C (injected by server from include/remote_buttons.h + get_button_name)
// Build name->code reverse map once
var BUTTON_NAME_TO_CODE = null;
function buildButtonNameToCode() {
    if (BUTTON_NAME_TO_CODE) return;
    var codes = window.BUTTON_CODES_FROM_C || {};
    BUTTON_NAME_TO_CODE = {};
    for (var code in codes) { BUTTON_NAME_TO_CODE[codes[code]] = parseInt(code, 10); }
}

function getButtonNameFromCode(buttonCode) {
    buildButtonNameToCode();
    var codes = window.BUTTON_CODES_FROM_C || {};
    var c = typeof buttonCode === 'number' ? buttonCode : parseInt(buttonCode, 10);
    var name = codes[c] || codes[String(c)];
    return name || ('Unknown (0x' + (c >>> 0).toString(16).toUpperCase() + ')');
}

// Update TV state and visual representation
function updateTVState(state) {
    const wasPoweredOn = tvState.powered_on;
    const oldChannel = tvState.channel;
    const oldApp = tvState.current_app;
    const oldVolume = tvState.volume;
    
    tvState = state;
    
    // Log power state changes
    if (wasPoweredOn !== state.powered_on) {
        console.log(`TV Power changed: ${wasPoweredOn} -> ${state.powered_on}`);
        
        // Start power animation
        startPowerAnimation(state.powered_on);
    }
    
    // Channel change animation
    if (oldChannel !== state.channel && state.powered_on) {
        startChannelAnimation(oldChannel, state.channel);
        showChannelOverlay(state.channel);
    }
    
    // App switching animation
    if (oldApp !== state.current_app && state.powered_on) {
        startAppAnimation(oldApp, state.current_app);
        
        // Volume Stabilizer: Prevent volume spikes when switching apps
        if (volumeStabilizer.enabled) {
            stabilizeVolumeOnAppSwitch(oldApp, state.current_app, state.volume);
        }
    }
    
    // Volume Stabilizer: Apply volume limiting to prevent spikes
    if (volumeStabilizer.enabled && state.powered_on && !state.muted) {
        const stabilizedVolume = applyVolumeStabilization(state.volume, state.current_app);
        if (Math.abs(stabilizedVolume - state.volume) > 1) {
            // Volume was adjusted, update state and send to server
            state.volume = stabilizedVolume;
            if (socket && socket.connected) {
                try {
                    socket.emit('update_volume', { volume: stabilizedVolume });
                    console.log(`[Volume Stabilizer] Volume spike prevented: ${state.volume}% -> ${stabilizedVolume}%`);
                } catch (error) {
                    console.error('[Volume Stabilizer] Error sending stabilized volume to server:', error);
                }
            } else {
                console.warn('[Volume Stabilizer] Socket not connected, cannot send stabilized volume');
            }
        }
    }
    
    // HDMI input switching animation
    const oldInput = tvState.input_source;
    if (oldInput !== state.input_source && state.powered_on) {
        startHDMIAnimation(oldInput, state.input_source);
    }
    
    // Volume change animation
    if (Math.abs(oldVolume - state.volume) > 0 && state.powered_on) {
        startVolumeAnimation(oldVolume, state.volume);
        
        // Apply volume stabilization after volume change (prevents spikes from button presses)
        if (volumeStabilizer.enabled && !state.muted) {
            const stabilizedVolume = applyVolumeStabilization(state.volume, state.current_app);
            if (Math.abs(stabilizedVolume - state.volume) > 1) {
                // Volume needs adjustment, smoothly transition
                console.log(`[Volume Stabilizer] Volume change detected: ${state.volume}% -> stabilizing to ${stabilizedVolume}%`);
                smoothVolumeTransition(state.volume, stabilizedVolume);
            }
        }
    }
    
    // Update UI
    if (document.getElementById('power-status')) {
        document.getElementById('power-status').textContent = state.powered_on ? 'ON' : 'OFF';
        document.getElementById('power-status').className = `status-value ${state.powered_on ? 'on' : 'off'}`;
        document.getElementById('volume-status').textContent = state.volume + '%';
        document.getElementById('channel-status').textContent = state.channel;
        document.getElementById('app-status').textContent = state.current_app || 'Home';
        document.getElementById('mute-status').textContent = state.muted ? 'Yes' : 'No';
        document.getElementById('game-mode-status').textContent = state.game_mode ? 'ON' : 'OFF';
        
        if (state.last_button) {
            document.getElementById('last-button').textContent = state.last_button;
            // Trigger IR signal visualization
            if (state.last_button && state.last_button !== '-') {
                triggerIRSignal(state.last_button);
                
                // Start IR visualization (protocol, code, timeline, waveform)
                if (typeof startIRVisualization === 'function') {
                    const buttonCode = getButtonCodeFromName(state.last_button);
                    if (buttonCode !== null) {
                        startIRVisualization(buttonCode, state.last_button);
                    }
                }
            }
        }
    }
    
    // Show notification
    if (state.notification) {
        showNotification(state.notification);
    }
    
    // Update 3D TV screen (always update, especially on power change)
    updateTVScreen(state);
}

// Start power on/off animation
function startPowerAnimation(turningOn) {
    powerAnimation.isAnimating = true;
    powerAnimation.startTime = Date.now();
    powerAnimation.targetState = turningOn;
    powerAnimation.flickerPhase = 0;
    powerAnimation.currentBrightness = turningOn ? 0 : 1;
    powerAnimation.scanLinePosition = 0;
    powerAnimation.glowIntensity = 0;
    powerAnimation.colorShift = 0;
    powerAnimation.rippleEffect = 0;
    
    // Initialize particles for power on effect
    if (turningOn) {
        powerAnimation.particles = [];
        for (let i = 0; i < 100; i++) {
            powerAnimation.particles.push({
                x: Math.random() * 512,
                y: Math.random() * 512,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 1,
                size: Math.random() * 4 + 2,
                color: { r: 100, g: 150, b: 255 }
            });
        }
        
        // Initialize energy waves
        powerAnimation.energyWaves = [];
        for (let i = 0; i < 5; i++) {
            powerAnimation.energyWaves.push({
                radius: 0,
                maxRadius: 512,
                speed: 2 + Math.random() * 2,
                opacity: 0.5,
                phase: i * 0.2
            });
        }
    }
    
    console.log(`Starting power ${turningOn ? 'ON' : 'OFF'} animation`);
}

// Start channel change animation - Enhanced with particles and effects
function startChannelAnimation(oldCh, newCh) {
    channelAnimation.isAnimating = true;
    channelAnimation.startTime = Date.now();
    channelAnimation.oldChannel = oldCh;
    channelAnimation.newChannel = newCh;
    channelAnimation.slideProgress = 0;
    channelAnimation.blurAmount = 0;
    channelAnimation.zoomLevel = 1;
    channelAnimation.glowIntensity = 0;
    
    // Initialize particle burst
    channelAnimation.particles = [];
    for (let i = 0; i < 50; i++) {
        channelAnimation.particles.push({
            x: 256 + (Math.random() - 0.5) * 200,
            y: 200 + (Math.random() - 0.5) * 100,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1,
            size: Math.random() * 4 + 2,
            color: { r: 100, g: 200, b: 255 }
        });
    }
    
    // Initialize ripple waves
    channelAnimation.rippleWaves = [];
    for (let i = 0; i < 3; i++) {
        channelAnimation.rippleWaves.push({
            x: 256,
            y: 200,
            radius: 0,
            maxRadius: 300,
            speed: 5 + i * 2,
            opacity: 0.6 - i * 0.15,
            phase: i * 0.3
        });
    }
}

// Show channel overlay animation
function showChannelOverlay(channel) {
    channelOverlay.visible = true;
    channelOverlay.startTime = Date.now();
    channelOverlay.channel = channel;
    channelOverlay.opacity = 0;
    channelOverlay.scale = 0.8;
    channelOverlay.slideY = -50;
}

// Get service-specific color
function getAppColor(appName) {
    const colors = {
        'YouTube': { r: 255, g: 0, b: 0 },
        'Netflix': { r: 229, g: 9, b: 20 },
        'Amazon Prime': { r: 0, g: 168, b: 225 },
        'HBO Max': { r: 128, g: 0, b: 128 },
        'Home': { r: 26, g: 26, b: 46 }
    };
    return colors[appName] || colors['Home'];
}

// Get service-specific logo text
function getAppLogo(appName) {
    const logos = {
        'YouTube': 'YT',
        'Netflix': 'N',
        'Amazon Prime': 'PRIME',
        'HBO Max': 'HBO',
        'Home': 'HOME'
    };
    return logos[appName] || appName;
}

// Get button code from button name (uses C names from server-injected BUTTON_CODES_FROM_C)
function getButtonCodeFromName(buttonName) {
    buildButtonNameToCode();
    if (BUTTON_NAME_TO_CODE && BUTTON_NAME_TO_CODE[buttonName] !== undefined) {
        return BUTTON_NAME_TO_CODE[buttonName];
    }
    return null;
}

// Start app switching animation with in-depth effects
function startAppAnimation(oldApp, newApp) {
    appAnimation.isAnimating = true;
    appAnimation.startTime = Date.now();
    appAnimation.oldApp = oldApp;
    appAnimation.newApp = newApp;
    appAnimation.fadeProgress = 0;
    appAnimation.phase = 'loading';
    appAnimation.logoScale = 0;
    appAnimation.logoRotation = 0;
    appAnimation.logoOpacity = 0;
    appAnimation.loadingProgress = 0;
    appAnimation.slideOffset = 0;
    appAnimation.zoomScale = 1;
    
    // Initialize particles for transition effect
    appAnimation.particles = [];
    const particleCount = 50;
    const newAppColor = getAppColor(newApp);
    for (let i = 0; i < particleCount; i++) {
        appAnimation.particles.push({
            x: Math.random() * 512,
            y: Math.random() * 512,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.8 + 0.2,
            color: newAppColor
        });
    }
}

// Start volume change animation - Enhanced with waveform and effects
function startVolumeAnimation(oldVol, newVol) {
    volumeAnimation.isAnimating = true;
    volumeAnimation.startTime = Date.now();
    volumeAnimation.oldVolume = oldVol;
    volumeAnimation.newVolume = newVol;
    volumeAnimation.wavePhase = 0;
    volumeAnimation.rippleEffect = 0;
    volumeAnimation.glowPulse = 0;
    
    // Initialize waveform data
    volumeAnimation.waveform = [];
    const wavePoints = 50;
    for (let i = 0; i < wavePoints; i++) {
        volumeAnimation.waveform.push({
            amplitude: Math.random() * (newVol / 100) * 20,
            phase: (i / wavePoints) * Math.PI * 4,
            frequency: 0.5 + Math.random() * 0.5
        });
    }
    
    // Initialize particles
    volumeAnimation.particles = [];
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        volumeAnimation.particles.push({
            x: 256 + (Math.random() - 0.5) * 200,
            y: 432 + Math.random() * 20,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 2,
            life: 1,
            size: Math.random() * 3 + 1,
            color: { r: 76, g: 175, b: 80 }
        });
    }
}

// Volume Stabilizer Functions

/**
 * Stabilize volume when switching apps to prevent commercial volume spikes
 */
function stabilizeVolumeOnAppSwitch(oldApp, newApp, currentVolume) {
    if (!volumeStabilizer.enabled) return;
    
    console.log(`[Volume Stabilizer] App switch: ${oldApp} -> ${newApp}, current volume: ${currentVolume}%`);
    
    // Get volume adjustment for new app
    const appAdjustment = volumeStabilizer.appVolumeLevels[newApp] || 0;
    const oldAdjustment = volumeStabilizer.appVolumeLevels[oldApp] || 0;
    
    // Calculate target volume with app-specific adjustment
    let targetVolume = volumeStabilizer.targetVolume + appAdjustment;
    
    // Clamp to safe range
    targetVolume = Math.max(volumeStabilizer.minVolume, Math.min(volumeStabilizer.maxVolume, targetVolume));
    
    // If current volume is too high (spike detected), reduce it
    if (currentVolume > volumeStabilizer.maxVolume) {
        console.log(`[Volume Stabilizer] Volume spike detected (${currentVolume}%), reducing to ${targetVolume}%`);
        targetVolume = Math.min(targetVolume, volumeStabilizer.maxVolume);
    }
    
    // Start smooth volume transition
    volumeStabilizer.isStabilizing = true;
    volumeStabilizer.startVolume = currentVolume;
    volumeStabilizer.targetVol = targetVolume;
    volumeStabilizer.startTime = Date.now();
    volumeStabilizer.lastApp = newApp;
    
    // Smoothly transition to target volume
    smoothVolumeTransition(currentVolume, targetVolume);
}

/**
 * Apply volume stabilization to prevent spikes
 */
function applyVolumeStabilization(currentVolume, currentApp) {
    if (!volumeStabilizer.enabled) return currentVolume;
    
    // Hard limit: Never exceed max volume
    if (currentVolume > volumeStabilizer.maxVolume) {
        console.log(`[Volume Stabilizer] Hard limit applied: ${currentVolume}% -> ${volumeStabilizer.maxVolume}%`);
        return volumeStabilizer.maxVolume;
    }
    
    // Apply app-specific adjustment
    const appAdjustment = volumeStabilizer.appVolumeLevels[currentApp] || 0;
    const adjustedVolume = currentVolume + appAdjustment;
    
    // Clamp to safe range
    return Math.max(volumeStabilizer.minVolume, Math.min(volumeStabilizer.maxVolume, adjustedVolume));
}

/**
 * Smoothly transition volume to target
 */
function smoothVolumeTransition(fromVolume, toVolume) {
    if (Math.abs(fromVolume - toVolume) < 1) {
        volumeStabilizer.isStabilizing = false;
        return;
    }
    
    // Use requestAnimationFrame for smooth transition
    const animate = () => {
        if (!volumeStabilizer.isStabilizing) return;
        
        const elapsed = Date.now() - volumeStabilizer.startTime;
        const progress = Math.min(elapsed / volumeStabilizer.smoothingTime, 1);
        
        // Smooth easing
        const eased = Easing.easeInOutSine(progress);
        const currentVol = volumeStabilizer.startVolume + 
                          (volumeStabilizer.targetVol - volumeStabilizer.startVolume) * eased;
        
        // Update volume in state and send to server
        if (tvState && socket && socket.connected) {
            const roundedVol = Math.round(currentVol);
            if (Math.abs(roundedVol - tvState.volume) > 0) {
                tvState.volume = roundedVol;
                // Send to server - ensure connection is verified
                try {
                    socket.emit('update_volume', { volume: roundedVol });
                    console.log(`[Volume Stabilizer] Sent volume update to server: ${roundedVol}%`);
                } catch (error) {
                    console.error('[Volume Stabilizer] Error sending volume update to server:', error);
                }
            }
        } else if (!socket || !socket.connected) {
            console.warn('[Volume Stabilizer] Socket not connected, cannot send volume update');
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            volumeStabilizer.isStabilizing = false;
            console.log(`[Volume Stabilizer] Volume stabilized at ${Math.round(volumeStabilizer.targetVol)}%`);
        }
    };
    
    requestAnimationFrame(animate);
}

// IR signal particle system
let irParticles = null;
let irParticleSystem = null;

// Trigger IR signal visualization with enhanced effects
function triggerIRSignal(buttonName) {
    if (!remoteMesh || !tvMesh) return;
    
    // Remove existing IR signal
    if (irSignal) {
        scene.remove(irSignal);
        irSignal = null;
    }
    
    // Remove existing particles
    if (irParticleSystem) {
        scene.remove(irParticleSystem);
        irParticleSystem = null;
    }
    
    // Get remote position (IR emitter location)
    const remotePosition = new THREE.Vector3();
    remoteMesh.getWorldPosition(remotePosition);
    remotePosition.y += 0.1; // IR emitter on top of remote
    
    // Get TV position (IR receiver location)
    const tvPosition = new THREE.Vector3();
    tvMesh.getWorldPosition(tvPosition);
    tvPosition.y += 0.5; // IR receiver on TV
    
    // Create IR signal beam with multiple layers
    const direction = new THREE.Vector3().subVectors(tvPosition, remotePosition);
    const distance = direction.length();
    direction.normalize();
    
    // Main IR beam (core)
    const irGeometry = new THREE.ConeGeometry(0.03, distance, 16, 1, true);
    const irMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    irSignal = new THREE.Mesh(irGeometry, irMaterial);
    irSignal.position.copy(remotePosition);
    irSignal.lookAt(tvPosition);
    irSignal.rotateX(Math.PI / 2);
    scene.add(irSignal);
    
    // Outer glow layer
    const glowGeometry = new THREE.ConeGeometry(0.08, distance, 16, 1, true);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4444,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glowBeam = new THREE.Mesh(glowGeometry, glowMaterial);
    glowBeam.position.copy(remotePosition);
    glowBeam.lookAt(tvPosition);
    glowBeam.rotateX(Math.PI / 2);
    scene.add(glowBeam);
    
    // Create particle trail
    const particleCount = 50;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        const pos = remotePosition.clone().lerp(tvPosition, t);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        
        // Red particles with varying intensity
        colors[i * 3] = 1.0; // R
        colors[i * 3 + 1] = 0.2 + (t * 0.3); // G
        colors[i * 3 + 2] = 0.1 + (t * 0.2); // B
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    
    irParticleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(irParticleSystem);
    
    // Animate IR signal with detailed effects
    let startTime = Date.now();
    const duration = 400; // 400ms for more visible effect
    
    function animateIR() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Core beam pulse
            if (irSignal && irSignal.material) {
                const pulse = Math.sin(progress * Math.PI * 6) * 0.3 + 0.7;
                irSignal.material.opacity = 0.8 * pulse * (1 - progress * 0.5);
                irSignal.scale.set(1 + progress * 0.3, 1, 1);
            }
            
            // Glow beam expansion
            if (glowBeam && glowBeam.material) {
                glowBeam.material.opacity = 0.3 * (1 - progress);
                glowBeam.scale.set(1 + progress * 1.5, 1, 1);
            }
            
            // Particle fade
            if (irParticleSystem) {
                const fadeProgress = progress;
                irParticleSystem.material.opacity = 0.8 * (1 - fadeProgress);
                
                // Animate particles (slight movement)
                const positions = irParticleSystem.geometry.attributes.position.array;
                for (let i = 0; i < particleCount; i++) {
                    const offset = Math.sin(progress * Math.PI * 2 + i) * 0.02;
                    positions[i * 3 + 1] += offset * 0.01;
                }
                irParticleSystem.geometry.attributes.position.needsUpdate = true;
            }
            
            requestAnimationFrame(animateIR);
        } else {
            // Remove IR signal and particles
            if (irSignal) {
                scene.remove(irSignal);
            }
            if (glowBeam) {
                scene.remove(glowBeam);
            }
            if (irParticleSystem) {
                scene.remove(irParticleSystem);
            }
            irSignal = null;
            irParticleSystem = null;
        }
    }
    
    animateIR();
    
    // Highlight button on remote
    highlightRemoteButton(buttonName);
}

// Highlight button on remote control
function highlightRemoteButton(buttonName) {
    if (!remoteGroup) return;
    
    // Reset previous button
    if (activeButton) {
        // Handle both single meshes and groups
        if (activeButton.isGroup) {
            activeButton.children.forEach(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
            activeButton.position.z = 0;
        } else if (activeButton.material) {
            activeButton.material.emissive.setHex(0x000000);
            activeButton.material.emissiveIntensity = 0;
            activeButton.position.z = 0;
        }
    }
    
    // Button name mapping (handle variations)
    const buttonNameMap = {
        'Power': 'Power',
        'Volume Up': 'Volume Up',
        'Volume Down': 'Volume Down',
        'Channel Up': 'Channel Up',
        'Channel Down': 'Channel Down',
        'Home': 'Home',
        'Menu': 'Menu',
        'Back': 'Back',
        'YouTube': 'YouTube',
        'Netflix': 'Netflix',
        'Amazon Prime': 'Amazon Prime',
        'HBO Max': 'HBO Max',
        'Game Mode': 'Game Mode',
        '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
        '6': '6', '7': '7', '8': '8', '9': '9', '0': '0'
    };
    
    // Normalize button name
    const normalizedName = buttonNameMap[buttonName] || buttonName;
    
    // Find and highlight button (search recursively for groups)
    function findButton(obj) {
        if (obj.userData && obj.userData.buttonName) {
            if (obj.userData.buttonName === normalizedName || 
                obj.userData.buttonName === buttonName ||
                buttonName.includes(obj.userData.buttonName) ||
                obj.userData.buttonName.includes(buttonName)) {
                return obj;
            }
        }
        for (let child of obj.children) {
            const found = findButton(child);
            if (found) return found;
        }
        return null;
    }
    
    const button = findButton(remoteGroup);
    if (button) {
        activeButton = button;
        buttonPressTime = Date.now();
        
        // Highlight button (handle groups)
        if (button.isGroup) {
            button.children.forEach(child => {
                if (child.material && child.material.emissive !== undefined) {
                    child.material.emissive.setHex(0x00ff00);
                    child.material.emissiveIntensity = 0.8;
                }
            });
            button.position.z = -0.01; // Press animation
        } else if (button.material) {
            button.material.emissive.setHex(0x00ff00);
            button.material.emissiveIntensity = 0.8;
            button.position.z = -0.01; // Press animation
        }
    }
}

// Show notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Initialize Three.js scene
function initScene() {
    const container = document.getElementById('canvas-container');
    
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 10, 50);
    
    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1.5, 5);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    
    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);
    
    // Point light for TV glow (will be animated)
    const tvGlow = new THREE.PointLight(0xffffff, 0, 10);
    tvGlow.position.set(0, 1.2, -8);
    scene.add(tvGlow);
    tvGlowLight = tvGlow; // Store reference for animation
    
    // Create room
    createRoom();
    
    // Create TV
    createTV();
    
    // Create 3D Remote Control
    createRemoteControl();
    
    // Initialize raycasting for interaction
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Enhanced VR-like controls
    initControls();
    
    // Add subtle ambient effects
    addAmbientEffects();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Create room environment
function createRoom() {
    roomGroup = new THREE.Group();
    
    // Floor with texture pattern
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    roomGroup.add(floor);
    
    // Back wall
    const wallGeometry = new THREE.PlaneGeometry(20, 10);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.9
    });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -10;
    backWall.position.y = 5;
    roomGroup.add(backWall);
    
    // Side walls
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -10;
    leftWall.position.y = 5;
    roomGroup.add(leftWall);
    
    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 10;
    rightWall.position.y = 5;
    roomGroup.add(rightWall);
    
    // Ceiling
    const ceiling = new THREE.Mesh(floorGeometry, wallMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    roomGroup.add(ceiling);
    
    scene.add(roomGroup);
}

// Create 3D TV model
function createTV() {
    const tvGroup = new THREE.Group();
    
    // TV frame/bezel
    const frameGeometry = new THREE.BoxGeometry(3.2, 2, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.3,
        metalness: 0.7,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = 0.1;
    frame.castShadow = true;
    tvGroup.add(frame);
    tvFrame = frame; // Store reference for animation
    
    // TV screen (the actual display)
    const screenGeometry = new THREE.PlaneGeometry(3, 1.8);
    // Create initial black texture
    const initialCanvas = document.createElement('canvas');
    initialCanvas.width = 512;
    initialCanvas.height = 512;
    const initialCtx = initialCanvas.getContext('2d');
    initialCtx.fillStyle = '#000000';
    initialCtx.fillRect(0, 0, initialCanvas.width, initialCanvas.height);
    const initialTexture = new THREE.CanvasTexture(initialCanvas);
    initialTexture.needsUpdate = true;
    
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x000000,
        emissiveIntensity: 0,
        map: initialTexture,
        side: THREE.FrontSide,
        transparent: false
    });
    screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
    screenMesh.position.z = 0.11;
    tvGroup.add(screenMesh);
    
    // TV stand/base
    const standGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.8);
    const standMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.5,
        metalness: 0.3
    });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = -1.15;
    stand.position.z = 0.2;
    stand.castShadow = true;
    tvGroup.add(stand);
    
    // IR receiver indicator (small LED)
    const irReceiverGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const irReceiverMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        emissive: 0x00ff00,
        emissiveIntensity: 0.5
    });
    const irReceiver = new THREE.Mesh(irReceiverGeometry, irReceiverMaterial);
    irReceiver.position.set(1.4, 0.8, 0.12);
    tvGroup.add(irReceiver);
    
    // Power indicator LED (red when off, green when on)
    const powerLEDGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const powerLEDMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.8
    });
    const powerLED = new THREE.Mesh(powerLEDGeometry, powerLEDMaterial);
    powerLED.position.set(-1.4, 0.8, 0.12);
    tvGroup.add(powerLED);
    tvPowerLED = powerLED; // Store reference for animation
    
    // Position TV in room
    tvGroup.position.set(0, 1.2, -8);
    tvGroup.rotation.y = 0;
    
    tvMesh = tvGroup;
    scene.add(tvMesh);
}

// Create 3D Remote Control
function createRemoteControl() {
    remoteGroup = new THREE.Group();
    
    // Remote body with rounded edges (using beveled box)
    const bodyGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.05, 8, 8, 1);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.3,
        metalness: 0.15,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    remoteGroup.add(body);
    remoteMesh = body;
    
    // Add subtle texture detail with a darker front panel
    const frontPanelGeometry = new THREE.PlaneGeometry(0.28, 0.78);
    const frontPanelMaterial = new THREE.MeshStandardMaterial({
        color: 0x151515,
        roughness: 0.5,
        metalness: 0.1
    });
    const frontPanel = new THREE.Mesh(frontPanelGeometry, frontPanelMaterial);
    frontPanel.position.z = 0.026;
    frontPanel.raycast = function() {}; // don't block button clicks
    remoteGroup.add(frontPanel);
    
    // Add brand logo area (subtle detail)
    const logoGeometry = new THREE.PlaneGeometry(0.12, 0.03);
    const logoMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.6,
        metalness: 0.2
    });
    const logo = new THREE.Mesh(logoGeometry, logoMaterial);
    logo.position.set(0, 0.35, 0.027);
    logo.raycast = function() {}; // don't block button clicks
    remoteGroup.add(logo);
    
    // Power button (top)
    const powerButton = createButton(0.08, 0.08, 0x10, 'Power', 0xff0000);
    powerButton.position.set(0, 0.3, 0.03);
    remoteGroup.add(powerButton);
    
    // Volume buttons
    const volUpButton = createButton(0.06, 0.06, 0x11, 'Volume Up', 0x4CAF50);
    volUpButton.position.set(-0.08, 0.15, 0.03);
    remoteGroup.add(volUpButton);
    
    const volDownButton = createButton(0.06, 0.06, 0x12, 'Volume Down', 0xf44336);
    volDownButton.position.set(-0.08, 0.05, 0.03);
    remoteGroup.add(volDownButton);
    
    // Channel buttons
    const chUpButton = createButton(0.06, 0.06, 0x14, 'Channel Up', 0x2196F3);
    chUpButton.position.set(0.08, 0.15, 0.03);
    remoteGroup.add(chUpButton);
    
    const chDownButton = createButton(0.06, 0.06, 0x15, 'Channel Down', 0x2196F3);
    chDownButton.position.set(0.08, 0.05, 0.03);
    remoteGroup.add(chDownButton);
    
    // Home button
    const homeButton = createButton(0.06, 0.06, 0x20, 'Home', 0xFFC107);
    homeButton.position.set(0, 0.1, 0.03);
    remoteGroup.add(homeButton);
    
    // Number pad (1-9)
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const numButton = createButton(0.05, 0.05, 0x51 + i, `${i + 1}`, 0xffffff);
        numButton.position.set(
            (col - 1) * 0.07,
            -0.1 - row * 0.07,
            0.03
        );
        remoteGroup.add(numButton);
    }
    
    // Zero button (below number pad, centered)
    const zeroButton = createButton(0.05, 0.05, 0x50, '0', 0xffffff);
    zeroButton.position.set(0, -0.31, 0.03);
    remoteGroup.add(zeroButton);
    
    // Streaming service buttons (below number pad)
    const streamingButtons = [
        { name: 'YouTube', code: 0x01, color: 0xff0000, label: 'YT' },
        { name: 'Netflix', code: 0x02, color: 0xe50914, label: 'NF' },
        { name: 'Amazon Prime', code: 0x03, color: 0x00a8e1, label: 'PR' },
        { name: 'HBO Max', code: 0x04, color: 0x800080, label: 'HB' }
    ];
    
    for (let i = 0; i < streamingButtons.length; i++) {
        const btn = streamingButtons[i];
        const streamButton = createButton(0.06, 0.04, btn.code, btn.name, btn.color);
        streamButton.position.set(
            (i - 1.5) * 0.08,
            -0.35,
            0.03
        );
        remoteGroup.add(streamButton);
    }
    
    // IR emitter (red LED on top) with glow effect
    const irEmitterGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const irEmitterMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const irEmitter = new THREE.Mesh(irEmitterGeometry, irEmitterMaterial);
    irEmitter.position.set(0, 0.4, 0.03);
    remoteGroup.add(irEmitter);
    
    // Add button labels using text geometry (simplified - using small planes as placeholders)
    // Volume Up label
    const volUpLabel = createLabelPlane('VOL+', 0.04, 0.01);
    volUpLabel.position.set(-0.08, 0.15, 0.04);
    remoteGroup.add(volUpLabel);
    
    // Volume Down label
    const volDownLabel = createLabelPlane('VOL-', 0.04, 0.01);
    volDownLabel.position.set(-0.08, 0.05, 0.04);
    remoteGroup.add(volDownLabel);
    
    // Channel Up label
    const chUpLabel = createLabelPlane('CH+', 0.04, 0.01);
    chUpLabel.position.set(0.08, 0.15, 0.04);
    remoteGroup.add(chUpLabel);
    
    // Channel Down label
    const chDownLabel = createLabelPlane('CH-', 0.04, 0.01);
    chDownLabel.position.set(0.08, 0.05, 0.04);
    remoteGroup.add(chDownLabel);
    
    // Add subtle side details (grip texture simulation)
    const sideDetailGeometry = new THREE.PlaneGeometry(0.28, 0.05);
    const sideDetailMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f0f0f,
        roughness: 0.7,
        metalness: 0.05
    });
    const topGrip = new THREE.Mesh(sideDetailGeometry, sideDetailMaterial);
    topGrip.position.set(0, 0.25, 0.027);
    topGrip.raycast = function() {}; // don't block button clicks
    remoteGroup.add(topGrip);
    
    const bottomGrip = new THREE.Mesh(sideDetailGeometry, sideDetailMaterial);
    bottomGrip.position.set(0, -0.25, 0.027);
    bottomGrip.raycast = function() {}; // don't block button clicks
    remoteGroup.add(bottomGrip);
    
    // Position remote in front of camera (on a virtual table)
    remoteGroup.position.copy(remoteLookClose.basePosition);
    remoteGroup.scale.setScalar(remoteLookClose.baseScale);
    remoteGroup.rotation.y = remoteLookClose.baseRotationY;
    
    scene.add(remoteGroup);
    
    // Hand near the remote, not touching (gap so it's clearly separate)
    createHand();
}

// Hand under the remote (rounded, readable shape – not touching)
function createHand() {
    handGroup = new THREE.Group();
    const skinColor = 0xC4956A;
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.75,
        metalness: 0.02,
        emissive: 0x221108,
        emissiveIntensity: 0.04
    });
    
    const s = 1.4;
    // Palm – rounded look via segments
    const palmGeom = new THREE.BoxGeometry(0.2 * s, 0.1 * s, 0.04 * s, 4, 4, 2);
    const palm = new THREE.Mesh(palmGeom, skinMaterial);
    palm.castShadow = true;
    handGroup.add(palm);
    
    // Fingers – cylinders so they’re round, not blocky
    const fingerRad = 0.022 * s;
    const fingerLen = 0.06 * s;
    const fingerGeom = new THREE.CylinderGeometry(fingerRad * 0.9, fingerRad, fingerLen, 10);
    [0.06, 0.03, -0.01, -0.05].forEach((y) => {
        const f = new THREE.Mesh(fingerGeom, skinMaterial);
        f.rotation.x = Math.PI / 2;
        f.position.set(0.13 * s, y, 0.025 * s);
        f.castShadow = true;
        handGroup.add(f);
    });
    
    // Thumb – cylinder, angled
    const thumbGeom = new THREE.CylinderGeometry(0.018 * s, 0.022 * s, 0.05 * s, 10);
    const thumb = new THREE.Mesh(thumbGeom, skinMaterial);
    thumb.rotation.x = Math.PI / 2;
    thumb.rotation.z = -0.5;
    thumb.position.set(0.07 * s, 0.1 * s, -0.01 * s);
    thumb.castShadow = true;
    handGroup.add(thumb);
    
    handGroup.position.set(0.06, -0.4, -0.02);
    handGroup.rotation.x = 0.32;
    handGroup.rotation.z = 0.12;
    handGroup.raycast = function() {};
    remoteGroup.add(handGroup);
}

// Helper function to create label planes (simplified text representation)
// Raycast disabled so clicks pass through to buttons underneath
function createLabelPlane(text, width, height) {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x333333,
        emissiveIntensity: 0.1
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.userData.labelText = text;
    plane.raycast = function() {}; // don't block button clicks
    return plane;
}

// Create a button for the remote with enhanced details
function createButton(width, height, buttonCode, buttonName, color) {
    const buttonGroup = new THREE.Group();
    
    // Main button body with beveled edges (using more segments for smoother look)
    const buttonGeometry = new THREE.BoxGeometry(width, height, 0.02, 4, 4, 1);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.5,
        metalness: 0.25,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    button.castShadow = true;
    button.receiveShadow = true;
    buttonGroup.add(button);
    
    // Add button top surface with slight inset for depth
    const topSurfaceGeometry = new THREE.PlaneGeometry(width * 0.9, height * 0.9);
    const topSurfaceMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.3,
        emissive: color,
        emissiveIntensity: 0.05
    });
    const topSurface = new THREE.Mesh(topSurfaceGeometry, topSurfaceMaterial);
    topSurface.position.z = 0.011;
    buttonGroup.add(topSurface);
    
    // Add button label for number buttons and key buttons
    if (buttonName.match(/^\d+$/) || ['Power', 'Home'].includes(buttonName)) {
        const labelGeometry = new THREE.PlaneGeometry(width * 0.6, height * 0.6);
        const labelMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const label = new THREE.Mesh(labelGeometry, labelMaterial);
        label.position.z = 0.012;
        buttonGroup.add(label);
    }
    
    buttonGroup.userData.buttonCode = buttonCode;
    buttonGroup.userData.buttonName = buttonName;
    return buttonGroup;
}

// Update TV screen content
function updateTVScreen(state) {
    if (!screenMesh) {
        console.warn('Screen mesh not initialized yet');
        return;
    }
    
    if (!state) {
        console.warn('No state provided to updateTVScreen');
        return;
    }
    
    // Get current animation brightness (for smooth transitions)
    const effectivePoweredOn = powerAnimation.isAnimating 
        ? powerAnimation.currentBrightness > 0.1 
        : state.powered_on;
    const brightness = powerAnimation.isAnimating 
        ? powerAnimation.currentBrightness 
        : (state.powered_on ? 1.0 : 0.0);
    
    // Create screen texture based on state
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
        console.error('Failed to get canvas context');
        return;
    }
    
    if (!effectivePoweredOn || brightness < 0.1) {
        // Black screen when off (with possible flicker during animation)
        const blackLevel = powerAnimation.isAnimating && powerAnimation.targetState
            ? Math.min(255, powerAnimation.flickerPhase * 50) // Flicker effect
            : 0;
        ctx.fillStyle = `rgb(${blackLevel}, ${blackLevel}, ${blackLevel})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Enhanced boot-up sequence during power-on animation
        if (powerAnimation.isAnimating && powerAnimation.targetState && brightness > 0.05) {
            drawBootSequence(ctx, canvas, brightness, powerAnimation);
        }
    } else {
        // Screen content based on app (with brightness modulation and smooth transitions)
        const appColors = {
            'Home': '#1a1a2e',
            'YouTube': '#FF0000',
            'Netflix': '#E50914',
            'Amazon Prime': '#00A8E1',
            'HBO Max': '#800080'
        };
        
        // Smooth color transition during app switch
        let bgColor = appColors[state.current_app] || '#1a1a2e';
        let oldBgColor = appColors[appAnimation.oldApp] || '#1a1a2e';
        
        if (appAnimation.isAnimating) {
            const progress = appAnimation.fadeProgress;
            // Interpolate between old and new app colors
            const oldRgb = hexToRgb(oldBgColor);
            const newRgb = hexToRgb(bgColor);
            const rgb = {
                r: Math.floor(oldRgb.r + (newRgb.r - oldRgb.r) * progress),
                g: Math.floor(oldRgb.g + (newRgb.g - oldRgb.g) * progress),
                b: Math.floor(oldRgb.b + (newRgb.b - oldRgb.b) * progress)
            };
            bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        
        const rgb = hexToRgb(bgColor);
        const brightRgb = {
            r: Math.floor(rgb.r * brightness),
            g: Math.floor(rgb.g * brightness),
            b: Math.floor(rgb.b * brightness)
        };
        
        // Base background with smooth color transition
        ctx.fillStyle = `rgb(${brightRgb.r}, ${brightRgb.g}, ${brightRgb.b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add gradient for depth (with brightness and color transition)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgba(${brightRgb.r}, ${brightRgb.g}, ${brightRgb.b}, ${brightness})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.5})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Enhanced channel change animation with blur, zoom, and particles
        let channelX = 0;
        let channelOpacity = brightness;
        let channelScale = 1;
        let channelBlur = 0;
        let channelParticles = [];
        
        if (channelAnimation.isAnimating) {
            const elapsed = Date.now() - channelAnimation.startTime;
            const progress = Math.min(elapsed / channelAnimation.duration, 1);
            channelAnimation.slideProgress = progress;
            
            // Enhanced slide with zoom and blur effects
            const slideEase = Easing.easeInOutCubic(progress);
            const zoomEase = progress < 0.5 
                ? Easing.easeOutBack(progress * 2) 
                : Easing.easeInBack((progress - 0.5) * 2);
            
            // Slide effect: old channel slides out left, new slides in from right
            channelX = (slideEase - 0.5) * canvas.width * 2.2;
            channelScale = 1 + (zoomEase - 0.5) * 0.3; // Zoom in/out effect
            channelBlur = Math.sin(progress * Math.PI) * 8; // Blur during transition
            channelOpacity = brightness * (1 - Math.abs(progress - 0.5) * 1.5);
            
            // Generate particles during transition
            if (Math.random() > 0.7 && progress > 0.2 && progress < 0.8) {
                channelParticles.push({
                    x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                    y: canvas.height / 2 - 100 + (Math.random() - 0.5) * 100,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 1,
                    size: Math.random() * 3 + 2,
                    color: { r: 100, g: 150, b: 255 }
                });
            }
            
            // Update particles
            channelParticles = channelParticles.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= 0.05;
                p.vx *= 0.95;
                p.vy *= 0.95;
                return p.life > 0;
            });
        }
        
        // Channel number (only visible when bright enough)
        if (brightness > 0.3) {
            // Draw and update particles with enhanced effects
            if (channelAnimation.particles) {
                channelAnimation.particles.forEach((p, index) => {
                    // Update particle
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= 0.03;
                    p.vx *= 0.95;
                    p.vy *= 0.95;
                    
                    if (p.life > 0) {
                        ctx.save();
                        const alpha = p.life * brightness * 0.8;
                        ctx.globalAlpha = alpha;
                        
                        // Glow effect
                        const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
                        glowGradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`);
                        glowGradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
                        ctx.fillStyle = glowGradient;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
                        ctx.fill();
                        
                        // Core particle
                        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                });
                
                // Remove dead particles
                channelAnimation.particles = channelAnimation.particles.filter(p => p.life > 0);
            }
            
            // Draw ripple waves
            if (channelAnimation.rippleWaves) {
                channelAnimation.rippleWaves.forEach((ripple, index) => {
                    ripple.radius += ripple.speed;
                    ripple.opacity = Math.max(0, ripple.opacity * 0.98);
                    
                    if (ripple.radius < ripple.maxRadius && ripple.opacity > 0.01) {
                        ctx.save();
                        ctx.globalAlpha = ripple.opacity * brightness;
                        ctx.strokeStyle = `rgba(100, 200, 255, ${ripple.opacity})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            }
            
            // Old channel (sliding out with effects)
            if (channelAnimation.isAnimating && channelAnimation.slideProgress < 0.6) {
                ctx.save();
                ctx.globalAlpha = channelOpacity * 0.8;
                ctx.translate(canvas.width / 2 + channelX, canvas.height / 2 - 100);
                ctx.scale(channelScale, channelScale);
                
                // Glow effect
                ctx.shadowColor = `rgba(100, 150, 255, ${channelOpacity * 0.5})`;
                ctx.shadowBlur = 20;
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`CH ${channelAnimation.oldChannel}`, 0, 0);
                ctx.shadowBlur = 0;
                ctx.restore();
            }
            
            // New channel (sliding in with effects)
            ctx.save();
            ctx.globalAlpha = channelOpacity;
            ctx.translate(canvas.width / 2 + channelX, canvas.height / 2 - 100);
            ctx.scale(channelScale, channelScale);
            
            // Enhanced glow for new channel
            const glowIntensity = channelAnimation.isAnimating 
                ? Math.sin(channelAnimation.slideProgress * Math.PI) * 0.6 + 0.4
                : 1;
            ctx.shadowColor = `rgba(100, 200, 255, ${glowIntensity * brightness})`;
            ctx.shadowBlur = 30;
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const channelText = state.channel_input || `CH ${state.channel}`;
            ctx.fillText(channelText, 0, 0);
            ctx.shadowBlur = 0;
            ctx.restore();
            
            // Channel number background glow
            if (channelAnimation.isAnimating) {
                ctx.save();
                ctx.globalAlpha = channelOpacity * 0.3;
                const glowGradient = ctx.createRadialGradient(
                    canvas.width / 2 + channelX, 
                    canvas.height / 2 - 100, 
                    0,
                    canvas.width / 2 + channelX, 
                    canvas.height / 2 - 100, 
                    100
                );
                glowGradient.addColorStop(0, `rgba(100, 150, 255, ${brightness * 0.5})`);
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            
            // In-depth streaming app animation
            if (appAnimation.isAnimating) {
                const phase = appAnimation.phase;
                const appColor = getAppColor(state.current_app);
                
                // Phase 1: Enhanced slide out old app with blur and rotation
                if (phase === 'slideOut') {
                    ctx.save();
                    const slideProgress = appAnimation.fadeProgress * 5;
                    ctx.translate(canvas.width / 2 + appAnimation.slideOffset, canvas.height / 2);
                    ctx.rotate(-slideProgress * 0.1); // Slight rotation
                    ctx.scale(appAnimation.zoomScale, appAnimation.zoomScale);
                    ctx.globalAlpha = brightness * (1 - slideProgress);
                    
                    // Glow effect fading out
                    ctx.shadowColor = `rgba(255, 255, 255, ${brightness * (1 - slideProgress) * 0.5})`;
                    ctx.shadowBlur = 20 * (1 - slideProgress);
                    ctx.font = 'bold 36px Arial';
                    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(appAnimation.oldApp || 'Home', 0, 0);
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
                // Phase 2: Loading screen with particles
                else if (phase === 'loading') {
                    // Animated background with service color
                    const loadingColor = appColor;
                    const loadingGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                    loadingGradient.addColorStop(0, `rgba(${loadingColor.r}, ${loadingColor.g}, ${loadingColor.b}, ${brightness * 0.8})`);
                    loadingGradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.6})`);
                    ctx.fillStyle = loadingGradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Enhanced particle system with physics and glow
                    if (appAnimation.particles && appAnimation.particles.length > 0) {
                        appAnimation.particles.forEach((p, index) => {
                            // Update particle physics
                            p.x += p.vx;
                            p.y += p.vy;
                            p.vy += 0.05; // Gravity
                            p.opacity *= 0.99;
                            p.size *= 0.998;
                            
                            // Bounce off edges
                            if (p.x < 0 || p.x > 512) {
                                p.vx *= -0.8;
                                p.x = Math.max(0, Math.min(512, p.x));
                            }
                            if (p.y < 0 || p.y > 512) {
                                p.vy *= -0.8;
                                p.y = Math.max(0, Math.min(512, p.y));
                            }
                            
                            if (p.opacity > 0.01 && p.size > 0.5) {
                                ctx.save();
                                ctx.globalAlpha = p.opacity * brightness;
                                
                                // Glow effect
                                const glowGradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
                                glowGradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`);
                                glowGradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity * 0.5})`);
                                glowGradient.addColorStop(1, 'transparent');
                                ctx.fillStyle = glowGradient;
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                                ctx.fill();
                                
                                // Core particle
                                ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.opacity})`;
                                ctx.beginPath();
                                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.restore();
                            }
                        });
                        
                        // Remove dead particles and add new ones during loading
                        appAnimation.particles = appAnimation.particles.filter(p => p.opacity > 0.01 && p.size > 0.5);
                        
                        // Add new particles during loading phase
                        if (appAnimation.phase === 'loading' && Math.random() > 0.95) {
                            const appColor = getAppColor(appAnimation.newApp);
                            appAnimation.particles.push({
                                x: Math.random() * 512,
                                y: Math.random() * 512,
                                vx: (Math.random() - 0.5) * 3,
                                vy: (Math.random() - 0.5) * 3,
                                opacity: 1,
                                size: Math.random() * 4 + 2,
                                color: appColor
                            });
                        }
                    }
                    
                    // Loading bar
                    const barWidth = canvas.width * 0.6;
                    const barHeight = 8;
                    const barX = (canvas.width - barWidth) / 2;
                    const barY = canvas.height * 0.7;
                    
                    // Background bar
                    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
                    ctx.fillRect(barX, barY, barWidth, barHeight);
                    
                    // Progress bar
                    const progressWidth = barWidth * appAnimation.loadingProgress;
                    ctx.fillStyle = `rgba(${loadingColor.r}, ${loadingColor.g}, ${loadingColor.b}, ${brightness})`;
                    ctx.fillRect(barX, barY, progressWidth, barHeight);
                    
                    // Loading text
                    ctx.save();
                    ctx.globalAlpha = brightness;
                    ctx.font = '24px Arial';
                    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Loading...', canvas.width / 2, barY - 30);
                    ctx.restore();
                }
                // Phase 3: Enhanced logo animation with particles and glow
                else if (phase === 'logo') {
                    // Background with service color and animated gradient
                    const logoColor = appColor;
                    const time = Date.now() * 0.001;
                    const pulse = Math.sin(time * 2) * 0.1 + 1;
                    const logoGradient = ctx.createRadialGradient(
                        canvas.width / 2, canvas.height / 2, 0,
                        canvas.width / 2, canvas.height / 2, canvas.width * pulse
                    );
                    logoGradient.addColorStop(0, `rgba(${logoColor.r}, ${logoColor.g}, ${logoColor.b}, ${brightness})`);
                    logoGradient.addColorStop(0.5, `rgba(${logoColor.r * 0.7}, ${logoColor.g * 0.7}, ${logoColor.b * 0.7}, ${brightness * 0.8})`);
                    logoGradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.5})`);
                    ctx.fillStyle = logoGradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Particle burst effect
                    for (let i = 0; i < 30; i++) {
                        const angle = (i / 30) * Math.PI * 2 + appAnimation.logoRotation;
                        const distance = appAnimation.logoScale * 80;
                        const x = canvas.width / 2 + Math.cos(angle) * distance;
                        const y = canvas.height / 2 + Math.sin(angle) * distance;
                        const particleAlpha = appAnimation.logoOpacity * brightness * (1 - appAnimation.logoScale * 0.5);
                        
                        ctx.fillStyle = `rgba(${logoColor.r}, ${logoColor.g}, ${logoColor.b}, ${particleAlpha})`;
                        ctx.beginPath();
                        ctx.arc(x, y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Animated logo with enhanced effects
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(appAnimation.logoRotation);
                    ctx.scale(appAnimation.logoScale, appAnimation.logoScale);
                    ctx.globalAlpha = appAnimation.logoOpacity * brightness;
                    
                    // Enhanced logo shadow with glow
                    ctx.shadowColor = `rgba(${logoColor.r}, ${logoColor.g}, ${logoColor.b}, ${appAnimation.logoOpacity * 0.8})`;
                    ctx.shadowBlur = 40 * appAnimation.logoScale;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    
                    // Draw logo text with gradient
                    const logoText = getAppLogo(state.current_app);
                    const textGradient = ctx.createLinearGradient(-40, 0, 40, 0);
                    textGradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
                    textGradient.addColorStop(0.5, `rgba(${logoColor.r}, ${logoColor.g}, ${logoColor.b}, ${brightness})`);
                    textGradient.addColorStop(1, `rgba(255, 255, 255, ${brightness})`);
                    
                    ctx.font = `bold ${80 * appAnimation.logoScale}px Arial`;
                    ctx.fillStyle = textGradient;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(logoText, 0, 0);
                    
                    // Service name below logo with glow
                    ctx.shadowBlur = 20 * appAnimation.logoScale;
                    ctx.font = `bold ${32 * appAnimation.logoScale}px Arial`;
                    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                    ctx.fillText(state.current_app, 0, 60 * appAnimation.logoScale);
                    
                    ctx.shadowBlur = 0;
                    ctx.restore();
                }
                // Phase 4: Content fade in
                else if (phase === 'content') {
                    // Final content with service color
                    const contentColor = appColor;
                    const contentGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                    contentGradient.addColorStop(0, `rgba(${contentColor.r}, ${contentColor.g}, ${contentColor.b}, ${brightness})`);
                    contentGradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.3})`);
                    ctx.fillStyle = contentGradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // App name with fade in
                    const contentOpacity = brightness * (1 - appAnimation.logoOpacity);
                    ctx.save();
                    ctx.globalAlpha = contentOpacity;
                    ctx.font = 'bold 48px Arial';
                    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(state.current_app || 'Home', canvas.width / 2, canvas.height / 2);
                    ctx.restore();
                }
            } else {
                // Rich content display based on app or TV channel
                const appName = state.current_app;
                const time = Date.now() * 0.001;
                
                // If current_app is explicitly set to an app name, show that app
                // Otherwise (null/undefined/empty), show TV channel content
                if (appName === 'Home') {
                    // Home screen with animated grid of app icons
                    drawHomeScreen(ctx, canvas, brightness, time, state);
                } else if (appName === 'YouTube') {
                    // YouTube-style content with video thumbnails
                    drawYouTubeContent(ctx, canvas, brightness, time, state);
                } else if (appName === 'Netflix') {
                    // Netflix-style content with movie/show cards
                    drawNetflixContent(ctx, canvas, brightness, time, state);
                } else if (appName === 'Amazon Prime') {
                    // Amazon Prime-style content
                    drawPrimeContent(ctx, canvas, brightness, time, state);
                } else if (appName === 'HBO Max') {
                    // HBO Max-style content
                    drawHBOMaxContent(ctx, canvas, brightness, time, state);
                } else {
                    // Show TV show content based on channel
                    // This handles both explicit channel mode and when current_app is None/empty
                    const tvShow = getTVShow(state.channel);
                    drawTVShowContent(ctx, canvas, brightness, time, state, tvShow);
                }
            }
            
            // Enhanced volume visualization with waveform
            if (state.volume !== undefined) {
                const volY = canvas.height - 80;
                const volBarWidth = 200;
                const volBarHeight = 20;
                const volBarX = canvas.width / 2 - volBarWidth / 2;
                let currentVolume = state.volume;
                const volColor = state.muted ? { r: 244, g: 67, b: 54 } : { r: 76, g: 175, b: 80 };
                
                // Animated volume during change
                if (volumeAnimation.isAnimating) {
                    const elapsed = Date.now() - volumeAnimation.startTime;
                    const progress = Math.min(elapsed / volumeAnimation.duration, 1);
                    const eased = Easing.easeOutCubic(progress);
                    currentVolume = volumeAnimation.oldVolume + 
                        (volumeAnimation.newVolume - volumeAnimation.oldVolume) * eased;
                    volumeAnimation.wavePhase = progress * Math.PI * 8;
                }
                
                // Background bar
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
                ctx.fillRect(volBarX, volY, volBarWidth, volBarHeight);
                
                // Volume bar with gradient
                const volWidth = (currentVolume / 100) * volBarWidth;
                const volGradient = ctx.createLinearGradient(volBarX, volY, volBarX + volWidth, volY);
                volGradient.addColorStop(0, `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * 0.8})`);
                volGradient.addColorStop(1, `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness})`);
                ctx.fillStyle = volGradient;
                ctx.fillRect(volBarX, volY, volWidth, volBarHeight);
                
                // Enhanced waveform visualization during animation
                if (volumeAnimation.isAnimating) {
                    // Multi-frequency waveform
                    if (volumeAnimation.waveform && volumeAnimation.waveform.length > 0) {
                        ctx.strokeStyle = `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * 0.8})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        
                        const wavePoints = volumeAnimation.waveform.length;
                        for (let i = 0; i < wavePoints; i++) {
                            const wave = volumeAnimation.waveform[i];
                            const x = volBarX + (i / wavePoints) * volWidth;
                            const waveValue = Math.sin((wave.phase + volumeAnimation.wavePhase) * wave.frequency) * wave.amplitude;
                            const y = volY + volBarHeight / 2 + waveValue;
                            
                            if (i === 0) {
                                ctx.moveTo(x, y);
                            } else {
                                ctx.lineTo(x, y);
                            }
                        }
                        ctx.stroke();
                        
                        // Update waveform
                        volumeAnimation.waveform.forEach(wave => {
                            wave.phase += 0.1;
                        });
                    }
                    
                    // Ripple effect with multiple ripples
                    volumeAnimation.rippleEffect += 0.1;
                    const rippleCount = 3;
                    for (let i = 0; i < rippleCount; i++) {
                        const ripplePhase = volumeAnimation.rippleEffect + (i * Math.PI * 0.5);
                        const rippleProgress = (Math.sin(ripplePhase) + 1) * 0.5;
                        ctx.strokeStyle = `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * rippleProgress * 0.3})`;
                        ctx.lineWidth = 2 + rippleProgress * 2;
                        const rippleOffset = rippleProgress * 5;
                        ctx.strokeRect(volBarX - rippleOffset, volY - rippleOffset, volWidth + rippleOffset * 2, volBarHeight + rippleOffset * 2);
                    }
                    
                    // Glow pulse effect
                    volumeAnimation.glowPulse = Math.sin(volumeAnimation.wavePhase) * 0.3 + 0.7;
                    const glowGradient = ctx.createLinearGradient(volBarX, volY, volBarX + volWidth, volY);
                    glowGradient.addColorStop(0, `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * volumeAnimation.glowPulse * 0.4})`);
                    glowGradient.addColorStop(1, `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * volumeAnimation.glowPulse * 0.2})`);
                    ctx.fillStyle = glowGradient;
                    ctx.fillRect(volBarX - 5, volY - 5, volWidth + 10, volBarHeight + 10);
                }
                
                // Draw volume particles
                if (volumeAnimation.particles && volumeAnimation.particles.length > 0) {
                    volumeAnimation.particles.forEach((particle, index) => {
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        particle.life -= 0.02;
                        particle.vy -= 0.1; // Gravity
                        
                        if (particle.life > 0 && particle.y < canvas.height) {
                            ctx.save();
                            ctx.globalAlpha = particle.life * brightness * 0.8;
                            const glowGradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 2);
                            glowGradient.addColorStop(0, `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.life})`);
                            glowGradient.addColorStop(1, 'transparent');
                            ctx.fillStyle = glowGradient;
                            ctx.beginPath();
                            ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    });
                    
                    // Remove dead particles
                    volumeAnimation.particles = volumeAnimation.particles.filter(p => p.life > 0);
                }
                
                // Volume percentage with glow
                ctx.shadowColor = `rgba(${volColor.r}, ${volColor.g}, ${volColor.b}, ${brightness * 0.5})`;
                ctx.shadowBlur = 10;
                ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.round(currentVolume)}%`, canvas.width / 2, volY - 30);
                ctx.shadowBlur = 0;
                
                // Volume indicator dots
                const dotCount = 10;
                const dotSpacing = volBarWidth / (dotCount + 1);
                for (let i = 0; i < dotCount; i++) {
                    const dotX = volBarX + dotSpacing * (i + 1);
                    const dotActive = dotX < volBarX + volWidth;
                    const dotAlpha = dotActive ? brightness : brightness * 0.2;
                    ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha})`;
                    ctx.beginPath();
                    ctx.arc(dotX, volY + volBarHeight / 2, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            // 3D Channel Overlay with animated UI
            if (channelOverlay.visible && brightness > 0.3) {
                ctx.save();
                ctx.translate(canvas.width / 2, 80 + channelOverlay.slideY);
                ctx.scale(channelOverlay.scale, channelOverlay.scale);
                ctx.globalAlpha = channelOverlay.opacity * brightness;
                
                // 3D box effect with gradient
                const overlayWidth = 200;
                const overlayHeight = 80;
                
                // Shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 20;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
                
                // Background with gradient (3D effect)
                const overlayGradient = ctx.createLinearGradient(-overlayWidth/2, -overlayHeight/2, overlayWidth/2, overlayHeight/2);
                overlayGradient.addColorStop(0, 'rgba(30, 30, 50, 0.95)');
                overlayGradient.addColorStop(0.5, 'rgba(20, 20, 40, 0.95)');
                overlayGradient.addColorStop(1, 'rgba(10, 10, 30, 0.95)');
                ctx.fillStyle = overlayGradient;
                ctx.fillRect(-overlayWidth/2, -overlayHeight/2, overlayWidth, overlayHeight);
                
                // Border with glow
                ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
                ctx.lineWidth = 3;
                ctx.strokeRect(-overlayWidth/2, -overlayHeight/2, overlayWidth, overlayHeight);
                
                // Channel number with 3D text effect
                ctx.shadowColor = 'rgba(100, 150, 255, 0.8)';
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`CH ${channelOverlay.channel}`, 0, -5);
                
                // Channel label
                ctx.font = '20px Arial';
                ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
                ctx.fillText('Channel', 0, 25);
                
                ctx.restore();
            }
            
            // HDMI Input Switching Overlay
            if (hdmiAnimation.isAnimating && brightness > 0.3) {
                ctx.save();
                ctx.globalAlpha = brightness;
                
                // Phase 1: Fade out old input
                if (hdmiAnimation.fadeProgress < 1 && hdmiAnimation.logoScale === 0) {
                    ctx.globalAlpha = hdmiAnimation.fadeProgress * brightness;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                    ctx.font = 'bold 36px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(hdmiAnimation.oldInput, canvas.width / 2, canvas.height / 2);
                }
                // Phase 2: Show HDMI logo
                else if (hdmiAnimation.logoScale > 0 && hdmiAnimation.logoScale < 1) {
                    // Background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // HDMI logo with scale animation
                    ctx.save();
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.scale(hdmiAnimation.logoScale, hdmiAnimation.logoScale);
                    
                    // HDMI icon (simplified)
                    ctx.fillStyle = 'rgba(100, 150, 255, 1)';
                    ctx.font = 'bold 80px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('HDMI', 0, -30);
                    
                    // Input number
                    ctx.font = 'bold 60px Arial';
                    ctx.fillText(hdmiAnimation.newInput.replace('HDMI ', ''), 0, 40);
                    
                    ctx.restore();
                }
                // Phase 3: Fade in new input
                else {
                    ctx.globalAlpha = hdmiAnimation.fadeProgress * brightness;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                    ctx.font = 'bold 36px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(hdmiAnimation.newInput, canvas.width / 2, canvas.height / 2);
                }
                
                ctx.restore();
            }
            
            // Static HDMI input display (when not animating)
            if (!hdmiAnimation.isAnimating && state.input_source && brightness > 0.5) {
                ctx.save();
                ctx.globalAlpha = brightness * 0.3;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(canvas.width - 150, 10, 140, 30);
                ctx.fillStyle = 'rgba(255, 255, 255, 1)';
                ctx.font = '18px Arial';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText(state.input_source, canvas.width - 10, 15);
                ctx.restore();
            }
        }
        
        // Add scan lines effect (CRT-like)
        if (screenEffects.scanLines && brightness > 0.1) {
            // Animated scan line during power on (like old CRT TVs)
            if (powerAnimation.isAnimating && powerAnimation.targetState) {
                const scanY = powerAnimation.scanLinePosition * canvas.height;
                ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * brightness * powerAnimation.currentBrightness})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, scanY);
                ctx.lineTo(canvas.width, scanY);
                ctx.stroke();
                
                // Add glow trail
                const glowGradient = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10);
                glowGradient.addColorStop(0, 'transparent');
                glowGradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.2 * brightness * powerAnimation.currentBrightness})`);
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(0, scanY - 10, canvas.width, 20);
            }
            
            // Regular scan lines
            ctx.strokeStyle = `rgba(0, 0, 0, ${0.12 * brightness})`;
            ctx.lineWidth = 1;
            const scanLineSpacing = 3;
            const time = Date.now() * 0.001;
            const scanOffset = (time * 25) % scanLineSpacing;
            
            for (let y = scanOffset; y < canvas.height; y += scanLineSpacing) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
        }
        
        // Add pixel shimmer effect (sparkle)
        if (screenEffects.pixelShimmer && brightness > 0.5) {
            const time = Date.now() * 0.001;
            const shimmerIntensity = 0.08 * brightness;
            const pixelCount = 30;
            
            for (let i = 0; i < pixelCount; i++) {
                // Use seeded random for consistent pixel positions
                const seed = i * 1000;
                const x = (Math.sin(seed) * 0.5 + 0.5) * canvas.width;
                const y = (Math.cos(seed * 1.3) * 0.5 + 0.5) * canvas.height;
                
                // Animated shimmer
                const phase = (time * 3 + i * 0.5) % (Math.PI * 2);
                const alpha = (Math.sin(phase) + 1) * 0.5 * shimmerIntensity;
                
                if (alpha > 0.01) {
                    // Create glow effect
                    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 4);
                    glowGradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                    glowGradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
                    glowGradient.addColorStop(1, 'transparent');
                    ctx.fillStyle = glowGradient;
                    ctx.fillRect(x - 4, y - 4, 8, 8);
                }
            }
        }
        
        // Add vignette effect (darker edges)
        if (screenEffects.vignette && brightness > 0.3) {
            const vignetteGradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, 0,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.8
            );
            vignetteGradient.addColorStop(0, 'transparent');
            vignetteGradient.addColorStop(1, `rgba(0, 0, 0, ${0.3 * brightness})`);
            ctx.fillStyle = vignetteGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Add screen reflection (subtle)
        if (screenEffects.reflection && brightness > 0.5) {
            const reflectionGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.3);
            reflectionGradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 * brightness})`);
            reflectionGradient.addColorStop(1, 'transparent');
            ctx.fillStyle = reflectionGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);
        }
    }
    
    // Update screen material (guard against missing material)
    if (!screenMesh.material) {
        console.warn('updateTVScreen: screenMesh.material not ready');
        return;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Dispose old texture to prevent memory leaks
    if (screenMesh.material.map) {
        screenMesh.material.map.dispose();
    }
    
    screenMesh.material.map = texture;
    
    // Update emissive properties for screen glow (with animation)
    screenMesh.material.emissive = new THREE.Color(0xffffff);
    screenMesh.material.emissiveIntensity = brightness;
    screenMesh.material.color = new THREE.Color(brightness, brightness, brightness);
    
    screenMesh.material.needsUpdate = true;
    
    // Capture frame for streaming API (send every ~200ms to avoid overload)
    if (socket && socket.connected) {
        captureAndSendFrame(canvas);
    }
}

// Frame capture for streaming API
let lastFrameSent = 0;
const FRAME_SEND_INTERVAL = 200; // Send frame every 200ms (5 FPS for API)

function captureAndSendFrame(canvas) {
    const now = Date.now();
    if (now - lastFrameSent < FRAME_SEND_INTERVAL) {
        return; // Skip if too soon
    }
    lastFrameSent = now;
    
    try {
        // Convert canvas to base64
        const frameData = canvas.toDataURL('image/png');
        // Remove data URL prefix (data:image/png;base64,)
        const base64Data = frameData.split(',')[1];
        
        // Send to server via WebSocket
        socket.emit('frame_update', {
            frame_data: base64Data,
            width: canvas.width,
            height: canvas.height,
            format: 'png',
            timestamp: now
        });
    } catch (error) {
        console.warn('[Frame Capture] Error capturing frame:', error);
    }
}

// Rich content drawing functions for each app

function drawHomeScreen(ctx, canvas, brightness, time, state) {
    // Animated gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const baseColor = { r: 26, g: 26, b: 46 };
    const animPhase = Math.sin(time * 0.5) * 0.1;
    gradient.addColorStop(0, `rgba(${baseColor.r + animPhase * 20}, ${baseColor.g + animPhase * 20}, ${baseColor.b + animPhase * 30}, ${brightness})`);
    gradient.addColorStop(1, `rgba(${baseColor.r - animPhase * 10}, ${baseColor.g - animPhase * 10}, ${baseColor.b - animPhase * 10}, ${brightness * 0.8})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated grid of app icons
    const gridCols = 4;
    const gridRows = 3;
    const iconSize = 80;
    const spacing = 20;
    const startX = (canvas.width - (gridCols * (iconSize + spacing) - spacing)) / 2;
    const startY = (canvas.height - (gridRows * (iconSize + spacing) - spacing)) / 2;
    
    const apps = ['YouTube', 'Netflix', 'Prime', 'HBO', 'Music', 'Games', 'Settings', 'Photos', 'Weather', 'News', 'Sports', 'Kids'];
    const appColors = [
        { r: 255, g: 0, b: 0 },      // YouTube
        { r: 229, g: 9, b: 20 },      // Netflix
        { r: 0, g: 168, b: 225 },     // Prime
        { r: 128, g: 0, b: 128 },     // HBO
        { r: 255, g: 165, b: 0 },     // Music
        { r: 76, g: 175, b: 80 },     // Games
        { r: 158, g: 158, b: 158 },   // Settings
        { r: 33, g: 150, b: 243 },    // Photos
        { r: 255, g: 152, b: 0 },     // Weather
        { r: 244, g: 67, b: 54 },     // News
        { r: 233, g: 30, b: 99 },     // Sports
        { r: 156, g: 39, b: 176 }     // Kids
    ];
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const index = row * gridCols + col;
            if (index >= apps.length) break;
            
            const x = startX + col * (iconSize + spacing);
            const y = startY + row * (iconSize + spacing);
            
            // Animated pulse effect
            const pulse = Math.sin(time * 2 + index * 0.5) * 0.1 + 1;
            const iconBrightness = brightness * (0.8 + pulse * 0.2);
            
            // Icon background with glow
            const color = appColors[index];
            const glowGradient = ctx.createRadialGradient(x + iconSize/2, y + iconSize/2, 0, x + iconSize/2, y + iconSize/2, iconSize/2);
            glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${iconBrightness * 0.8})`);
            glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${iconBrightness * 0.2})`);
            ctx.fillStyle = glowGradient;
            ctx.fillRect(x, y, iconSize, iconSize);
            
            // Icon border
            ctx.strokeStyle = `rgba(255, 255, 255, ${iconBrightness * 0.5})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 5, y + 5, iconSize - 10, iconSize - 10);
            
            // App name
            ctx.fillStyle = `rgba(255, 255, 255, ${iconBrightness})`;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(apps[index], x + iconSize/2, y + iconSize/2);
        }
    }
    
    // Animated particles in background
    for (let i = 0; i < 20; i++) {
        const phase = (time * 0.5 + i * 0.3) % (Math.PI * 2);
        const x = (Math.sin(phase) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(phase * 1.3) * 0.5 + 0.5) * canvas.height;
        const alpha = (Math.sin(phase) + 1) * 0.5 * brightness * 0.3;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawYouTubeContent(ctx, canvas, brightness, time, state) {
    // Red gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(255, 0, 0, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(200, 0, 0, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // YouTube logo area
    ctx.save();
    ctx.translate(canvas.width / 2, 100);
    ctx.scale(1 + Math.sin(time * 2) * 0.05, 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YouTube', 0, 0);
    ctx.restore();
    
    // Video thumbnail grid
    const thumbCols = 3;
    const thumbRows = 2;
    const thumbWidth = 140;
    const thumbHeight = 100;
    const thumbSpacing = 15;
    const startX = (canvas.width - (thumbCols * (thumbWidth + thumbSpacing) - thumbSpacing)) / 2;
    const startY = 180;
    
    for (let row = 0; row < thumbRows; row++) {
        for (let col = 0; col < thumbCols; col++) {
            const x = startX + col * (thumbWidth + thumbSpacing);
            const y = startY + row * (thumbHeight + thumbSpacing);
            
            // Thumbnail background (simulating video)
            const animPhase = (time * 0.3 + (row * thumbCols + col) * 0.5) % (Math.PI * 2);
            const thumbBrightness = brightness * (0.6 + Math.sin(animPhase) * 0.2);
            
            // Video-like gradient
            const thumbGradient = ctx.createLinearGradient(x, y, x, y + thumbHeight);
            thumbGradient.addColorStop(0, `rgba(40, 40, 40, ${thumbBrightness})`);
            thumbGradient.addColorStop(0.5, `rgba(60, 60, 60, ${thumbBrightness})`);
            thumbGradient.addColorStop(1, `rgba(30, 30, 30, ${thumbBrightness})`);
            ctx.fillStyle = thumbGradient;
            ctx.fillRect(x, y, thumbWidth, thumbHeight);
            
            // Play button overlay
            ctx.fillStyle = `rgba(255, 255, 255, ${thumbBrightness * 0.8})`;
            ctx.beginPath();
            ctx.arc(x + thumbWidth/2, y + thumbHeight/2, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Play triangle
            ctx.fillStyle = `rgba(255, 0, 0, ${thumbBrightness})`;
            ctx.beginPath();
            ctx.moveTo(x + thumbWidth/2 - 8, y + thumbHeight/2 - 12);
            ctx.lineTo(x + thumbWidth/2 - 8, y + thumbHeight/2 + 12);
            ctx.lineTo(x + thumbWidth/2 + 12, y + thumbHeight/2);
            ctx.closePath();
            ctx.fill();
            
            // Duration badge
            ctx.fillStyle = `rgba(0, 0, 0, ${thumbBrightness * 0.7})`;
            ctx.fillRect(x + thumbWidth - 50, y + thumbHeight - 25, 45, 20);
            ctx.fillStyle = `rgba(255, 255, 255, ${thumbBrightness})`;
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(`${Math.floor(animPhase * 10)}:${Math.floor(animPhase * 60) % 60}`, x + thumbWidth - 5, y + thumbHeight - 10);
        }
    }
    
    // Animated progress bar at bottom
    const progressWidth = canvas.width * 0.8;
    const progressHeight = 4;
    const progressX = (canvas.width - progressWidth) / 2;
    const progressY = canvas.height - 40;
    const progress = (time * 0.1) % 1;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);
}

function drawNetflixContent(ctx, canvas, brightness, time, state) {
    // Dark background with Netflix red accent
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(20, 20, 20, ${brightness})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.9})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Netflix logo
    ctx.fillStyle = `rgba(229, 9, 20, ${brightness})`;
    ctx.font = 'bold 50px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NETFLIX', canvas.width / 2, 80);
    
    // Featured content banner
    const bannerHeight = 180;
    const bannerY = 120;
    const bannerGradient = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerHeight);
    bannerGradient.addColorStop(0, `rgba(229, 9, 20, ${brightness * 0.6})`);
    bannerGradient.addColorStop(1, `rgba(150, 0, 0, ${brightness * 0.4})`);
    ctx.fillStyle = bannerGradient;
    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
    
    // Featured title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText('Featured Title', canvas.width / 2, bannerY + 60);
    ctx.font = '18px Arial';
    ctx.fillText('Watch Now', canvas.width / 2, bannerY + 100);
    
    // Content row
    const cardWidth = 100;
    const cardHeight = 140;
    const cardSpacing = 15;
    const startX = (canvas.width - (4 * (cardWidth + cardSpacing) - cardSpacing)) / 2;
    const startY = bannerY + bannerHeight + 20;
    
    for (let i = 0; i < 4; i++) {
        const x = startX + i * (cardWidth + cardSpacing);
        const y = startY;
        
        // Card with animated shimmer
        const shimmer = Math.sin(time * 2 + i) * 0.1 + 0.9;
        const cardBrightness = brightness * shimmer;
        
        // Card gradient
        const cardGradient = ctx.createLinearGradient(x, y, x, y + cardHeight);
        cardGradient.addColorStop(0, `rgba(40, 40, 40, ${cardBrightness})`);
        cardGradient.addColorStop(1, `rgba(20, 20, 20, ${cardBrightness})`);
        ctx.fillStyle = cardGradient;
        ctx.fillRect(x, y, cardWidth, cardHeight);
        
        // Card border
        ctx.strokeStyle = `rgba(229, 9, 20, ${cardBrightness * 0.5})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, cardWidth - 4, cardHeight - 4);
        
        // Title placeholder
        ctx.fillStyle = `rgba(255, 255, 255, ${cardBrightness * 0.6})`;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Title ${i + 1}`, x + cardWidth/2, y + cardHeight - 20);
    }
}

function drawPrimeContent(ctx, canvas, brightness, time, state) {
    // Blue gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 168, 225, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 120, 180, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Prime logo
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PRIME VIDEO', canvas.width / 2, 80);
    
    // Content cards with animation
    const cardWidth = 120;
    const cardHeight = 160;
    const cardSpacing = 20;
    const startX = (canvas.width - (3 * (cardWidth + cardSpacing) - cardSpacing)) / 2;
    const startY = 130;
    
    for (let i = 0; i < 3; i++) {
        const x = startX + i * (cardWidth + cardSpacing);
        const y = startY + Math.sin(time + i) * 5; // Subtle float animation
        
        // Card
        const cardBrightness = brightness * (0.85 + Math.sin(time * 2 + i) * 0.15);
        ctx.fillStyle = `rgba(20, 40, 60, ${cardBrightness})`;
        ctx.fillRect(x, y, cardWidth, cardHeight);
        
        // Card highlight
        ctx.fillStyle = `rgba(0, 168, 225, ${cardBrightness * 0.6})`;
        ctx.fillRect(x, y, cardWidth, 30);
        
        // Play icon
        ctx.fillStyle = `rgba(255, 255, 255, ${cardBrightness})`;
        ctx.beginPath();
        ctx.arc(x + cardWidth/2, y + cardHeight/2, 25, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(0, 168, 225, ${cardBrightness})`;
        ctx.beginPath();
        ctx.moveTo(x + cardWidth/2 - 8, y + cardHeight/2 - 12);
        ctx.lineTo(x + cardWidth/2 - 8, y + cardHeight/2 + 12);
        ctx.lineTo(x + cardWidth/2 + 12, y + cardHeight/2);
        ctx.closePath();
        ctx.fill();
    }
}

function drawHBOMaxContent(ctx, canvas, brightness, time, state) {
    // Purple gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(128, 0, 128, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(80, 0, 80, ${brightness * 0.5})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // HBO Max logo
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HBO MAX', canvas.width / 2, 80);
    
    // Featured content
    const featuredHeight = 200;
    const featuredGradient = ctx.createLinearGradient(0, 100, 0, 100 + featuredHeight);
    featuredGradient.addColorStop(0, `rgba(100, 0, 100, ${brightness * 0.8})`);
    featuredGradient.addColorStop(1, `rgba(50, 0, 50, ${brightness * 0.6})`);
    ctx.fillStyle = featuredGradient;
    ctx.fillRect(0, 100, canvas.width, featuredHeight);
    
    // Featured title with glow
    ctx.shadowColor = `rgba(255, 255, 255, ${brightness * 0.5})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('Featured Series', canvas.width / 2, 180);
    ctx.shadowBlur = 0;
    
    // Content grid
    const gridCols = 4;
    const gridRows = 2;
    const itemWidth = 100;
    const itemHeight = 120;
    const itemSpacing = 15;
    const gridStartX = (canvas.width - (gridCols * (itemWidth + itemSpacing) - itemSpacing)) / 2;
    const gridStartY = 320;
    
    for (let row = 0; row < gridRows; row++) {
        for (let col = 0; col < gridCols; col++) {
            const x = gridStartX + col * (itemWidth + itemSpacing);
            const y = gridStartY + row * (itemHeight + itemSpacing);
            
            const itemBrightness = brightness * (0.7 + Math.sin(time + row + col) * 0.2);
            ctx.fillStyle = `rgba(60, 0, 60, ${itemBrightness})`;
            ctx.fillRect(x, y, itemWidth, itemHeight);
            
            ctx.strokeStyle = `rgba(200, 0, 200, ${itemBrightness * 0.5})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, itemWidth - 4, itemHeight - 4);
        }
    }
}

function drawDefaultContent(ctx, canvas, brightness, time, state) {
    // Default animated background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    const phase = time * 0.3;
    gradient.addColorStop(0, `rgba(30, 30, 50, ${brightness})`);
    gradient.addColorStop(0.5, `rgba(50, 30, 70, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(30, 30, 50, ${brightness})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated circles
    for (let i = 0; i < 5; i++) {
        const radius = 30 + Math.sin(time + i) * 10;
        const x = canvas.width / 2 + Math.cos(time * 0.5 + i) * 100;
        const y = canvas.height / 2 + Math.sin(time * 0.5 + i) * 80;
        const alpha = brightness * (0.2 + Math.sin(time + i) * 0.1);
        
        ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // App name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.current_app || 'Home', canvas.width / 2, canvas.height / 2);
}

// Draw TV Show Content - Multiple different shows with unique visuals
function drawTVShowContent(ctx, canvas, brightness, time, state, tvShow) {
    const showType = tvShow.type;
    const showColor = tvShow.color;
    
    // Route to specific show type renderer
    switch(showType) {
        case 'news':
            drawNewsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'sports':
            drawSportsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'drama':
            drawDramaShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'comedy':
            drawComedyShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'movie':
            drawMovieShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'cartoon':
            drawCartoonShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'music':
            drawMusicShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'weather':
            drawWeatherShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'horror':
            drawHorrorShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'documentary':
            drawDocumentaryShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'bigreddog':
            drawBigRedDogShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'pabst':
            drawPabstShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'lifeguard':
            drawLifeguardShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'cups':
            drawCupsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'trashcan':
            drawTrashCanShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'lochness':
            drawLochNessShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'banana':
            drawBananaShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'driving':
            drawDrivingShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'oceanvolcano':
            drawOceanVolcanoShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'fridgeplanet':
            drawFridgePlanetShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'toaster':
            drawToasterShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'clouds':
            drawCloudsShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'paint':
            drawPaintShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        case 'rubberduck':
            drawRubberDuckShow(ctx, canvas, brightness, time, state, tvShow);
            break;
        default:
            drawGeneralTVShow(ctx, canvas, brightness, time, state, tvShow);
    }
}

// News Show - Breaking news style
function drawNewsShow(ctx, canvas, brightness, time, state, tvShow) {
    // News background with scrolling ticker
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // News desk area
    ctx.fillStyle = `rgba(50, 50, 50, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // News anchor area
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness * 0.6})`;
    ctx.fillRect(canvas.width * 0.2, canvas.height * 0.65, canvas.width * 0.6, canvas.height * 0.3);
    
    // Breaking news banner
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.fillRect(0, 0, canvas.width, 60);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BREAKING NEWS', canvas.width / 2, 40);
    
    // Scrolling news ticker
    const tickerY = canvas.height - 30;
    const tickerText = `${tvShow.name} - Latest updates and breaking news stories...`;
    const tickerX = (canvas.width - (time * 50) % (canvas.width + 200)) % (canvas.width + 200);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = '20px Arial';
    ctx.fillText(tickerText, tickerX, tickerY);
    
    // News headlines
    const headlines = [
        'Major Development in Technology',
        'Weather Alert Issued',
        'Sports Update',
        'Business Report'
    ];
    ctx.font = 'bold 24px Arial';
    headlines.forEach((headline, i) => {
        const y = 100 + i * 40;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * (0.7 + Math.sin(time + i) * 0.2)})`;
        ctx.fillText(`• ${headline}`, canvas.width / 2, y);
    });
}

// Sports Show - Live game style
function drawSportsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sports field background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, ${tvShow.color.g}, 0, ${brightness * 0.8})`);
    gradient.addColorStop(0.5, `rgba(0, ${tvShow.color.g * 0.7}, 0, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(0, ${tvShow.color.g * 0.5}, 0, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Field lines
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Score display
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.fillRect(canvas.width / 2 - 150, 20, 300, 80);
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText('HOME 24 - 18 AWAY', canvas.width / 2, 70);
    
    // Live indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Animated players (circles)
    for (let i = 0; i < 10; i++) {
        const team = i < 5 ? 1 : -1;
        const x = canvas.width / 2 + team * (100 + Math.sin(time + i) * 30);
        const y = canvas.height / 2 + (Math.cos(time * 0.5 + i) * 60);
        const color = team > 0 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 0, b: 255 };
        
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height - 40);
}

// Drama Show - Cinematic style
function drawDramaShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark cinematic background
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.9})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Character silhouettes
    for (let i = 0; i < 3; i++) {
        const x = canvas.width * (0.2 + i * 0.3);
        const y = canvas.height * 0.7;
        const scale = 0.8 + Math.sin(time + i) * 0.1;
        
        ctx.fillStyle = `rgba(50, 50, 50, ${brightness * 0.7})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 40 * scale, 80 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title with dramatic effect
    ctx.shadowColor = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2 - 50);
    ctx.shadowBlur = 0;
    
    // Episode info
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '20px Arial';
    ctx.fillText('Season 3 • Episode 12', canvas.width / 2, canvas.height / 2);
    
    // Subtle particles
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.3 + i) * 0.5 + 0.5) * canvas.height;
        const alpha = (Math.sin(time + i) + 1) * 0.5 * brightness * 0.3;
        ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Comedy Show - Bright and colorful
function drawComedyShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bright colorful background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(0.5, `rgba(${tvShow.color.r * 0.8}, ${tvShow.color.g * 0.8}, ${tvShow.color.b * 0.8}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.6}, ${tvShow.color.g * 0.6}, ${tvShow.color.b * 0.6}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated comedy accents
    const accents = ['Ha', 'Ha', 'Ha', 'Ha', 'Ha'];
    for (let i = 0; i < 5; i++) {
        const x = canvas.width * (0.1 + i * 0.2) + Math.sin(time + i) * 20;
        const y = canvas.height * 0.3 + Math.cos(time * 0.7 + i) * 30;
        const scale = 1 + Math.sin(time * 2 + i) * 0.2;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        ctx.font = `bold ${36 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(accents[i % accents.length], 0, 0);
        ctx.restore();
    }
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    
    // Laugh track indicator
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness * 0.8})`;
    ctx.font = '20px Arial';
    ctx.fillText('LAUGH TRACK', canvas.width / 2, canvas.height / 2 + 40);
}

// Movie Show - Cinema style
function drawMovieShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark movie theater background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${brightness * 0.95})`);
    gradient.addColorStop(0.5, `rgba(${tvShow.color.r * 0.3}, ${tvShow.color.g * 0.3}, ${tvShow.color.b * 0.3}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.95})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Movie screen effect
    ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.6})`;
    ctx.fillRect(canvas.width * 0.1, canvas.height * 0.2, canvas.width * 0.8, canvas.height * 0.6);
    
    // Film grain effect
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const alpha = Math.random() * 0.1 * brightness;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Movie title
    ctx.shadowColor = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    
    // Rating and info
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.font = '24px Arial';
    ctx.fillText('5 Stars', canvas.width / 2, canvas.height / 2 + 40);
    
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Now Playing', canvas.width / 2, canvas.height / 2 + 70);
}

// Cartoon Show - Animated and fun
function drawCartoonShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bright cartoon background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.95})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.7}, ${tvShow.color.g * 0.7}, ${tvShow.color.b * 0.7}, ${brightness * 0.85})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Animated cartoon characters (simple shapes)
    for (let i = 0; i < 4; i++) {
        const x = canvas.width * (0.15 + i * 0.25) + Math.sin(time * 2 + i) * 15;
        const y = canvas.height * 0.6 + Math.cos(time * 1.5 + i) * 20;
        const size = 30 + Math.sin(time + i) * 5;
        
        // Character body
        ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g + 50}, ${tvShow.color.b + 50}, ${brightness * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x - 10, y - 5, 5, 0, Math.PI * 2);
        ctx.arc(x + 10, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x - 10 + Math.sin(time * 3) * 2, y - 5, 2, 0, Math.PI * 2);
        ctx.arc(x + 10 + Math.sin(time * 3) * 2, y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Floating stars
    for (let i = 0; i < 10; i++) {
        const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * canvas.width;
        const y = (Math.cos(time * 0.3 + i) * 0.5 + 0.5) * canvas.height;
        ctx.fillStyle = `rgba(255, 255, 0, ${brightness * (0.5 + Math.sin(time + i) * 0.3)})`;
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x + 2, y);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x - 2, y);
        ctx.closePath();
        ctx.fill();
    }
}

// Music Show - Visualizer style
function drawMusicShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark music background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r * 0.3}, ${tvShow.color.g * 0.3}, ${tvShow.color.b * 0.3}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.95})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Audio visualizer bars
    const barCount = 20;
    const barWidth = canvas.width / (barCount + 1);
    for (let i = 0; i < barCount; i++) {
        const x = barWidth * (i + 1);
        const height = (Math.sin(time * 2 + i * 0.5) + 1) * 0.5 * canvas.height * 0.6;
        const barY = canvas.height - height;
        
        const barGradient = ctx.createLinearGradient(x, barY, x, canvas.height);
        barGradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness})`);
        barGradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.7})`);
        ctx.fillStyle = barGradient;
        ctx.fillRect(x - barWidth / 2, barY, barWidth - 2, height);
    }
    
    // Show name
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 36px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Now playing
    ctx.fillStyle = `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`;
    ctx.font = '24px Arial';
    ctx.fillText('Now Playing', canvas.width / 2, 120);
}

// Weather Show - Weather graphics
function drawWeatherShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.6}, ${tvShow.color.g * 0.6}, ${tvShow.color.b * 0.6}, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sun
    const sunX = canvas.width * 0.7;
    const sunY = canvas.height * 0.3;
    const sunRadius = 40 + Math.sin(time) * 5;
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Clouds
    for (let i = 0; i < 3; i++) {
        const cloudX = (canvas.width * 0.2 + i * canvas.width * 0.3 + time * 10) % (canvas.width + 100) - 50;
        const cloudY = canvas.height * 0.4 + i * 30;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, 20, 0, Math.PI * 2);
        ctx.arc(cloudX + 25, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(cloudX + 50, cloudY, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Temperature display
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 48px Arial';
    ctx.fillText('72°F', canvas.width / 2, canvas.height / 2);
    
    // Weather info
    ctx.font = '24px Arial';
    ctx.fillText('Sunny • Partly Cloudy', canvas.width / 2, canvas.height / 2 + 40);
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height - 40);
}

// Horror Show - Dark and spooky
function drawHorrorShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark horror background
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.95})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Flickering effect
    const flicker = Math.random() > 0.7 ? 1 : 0.3;
    ctx.fillStyle = `rgba(${tvShow.color.r * flicker}, 0, 0, ${brightness * flicker})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Spooky silhouette
    const silhouetteX = canvas.width / 2;
    const silhouetteY = canvas.height * 0.7;
    ctx.fillStyle = `rgba(20, 20, 20, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(silhouetteX, silhouetteY, 60, 120, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Glowing eyes
    const eyeGlow = Math.sin(time * 3) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness * eyeGlow})`;
    ctx.beginPath();
    ctx.arc(silhouetteX - 20, silhouetteY - 30, 8, 0, Math.PI * 2);
    ctx.arc(silhouetteX + 20, silhouetteY - 30, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Show title with spooky effect
    ctx.shadowColor = `rgba(255, 0, 0, ${brightness * eyeGlow})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(200, 0, 0, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

// Documentary Show - Nature/educational
function drawDocumentaryShow(ctx, canvas, brightness, time, state, tvShow) {
    // Nature background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(0.7, `rgba(${tvShow.color.r * 0.7}, ${tvShow.color.g * 0.7}, ${tvShow.color.b * 0.7}, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Nature elements (trees, animals)
    for (let i = 0; i < 5; i++) {
        const x = canvas.width * (0.1 + i * 0.2);
        const y = canvas.height * 0.7;
        
        // Tree
        ctx.fillStyle = `rgba(50, 100, 50, ${brightness * 0.8})`;
        ctx.fillRect(x - 5, y, 10, 60);
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Animal silhouette
    const animalX = canvas.width * 0.5 + Math.sin(time * 0.5) * 50;
    const animalY = canvas.height * 0.65;
    ctx.fillStyle = `rgba(80, 60, 40, ${brightness * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(animalX, animalY, 40, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 32px Arial';
    ctx.fillText(tvShow.name, canvas.width / 2, 80);
    
    // Educational text
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Exploring Nature', canvas.width / 2, canvas.height - 40);
}

// General TV Show - Default style
function drawGeneralTVShow(ctx, canvas, brightness, time, state, tvShow) {
    // General TV background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(${tvShow.color.r}, ${tvShow.color.g}, ${tvShow.color.b}, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(${tvShow.color.r * 0.5}, ${tvShow.color.g * 0.5}, ${tvShow.color.b * 0.5}, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tvShow.name, canvas.width / 2, canvas.height / 2 - 20);
    
    // Genre
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness * 0.8})`;
    ctx.font = '24px Arial';
    ctx.fillText(tvShow.genre, canvas.width / 2, canvas.height / 2 + 20);
    
    // Channel number
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
    ctx.font = '20px Arial';
    ctx.fillText(`Channel ${state.channel}`, canvas.width / 2, canvas.height - 40);
}

// 1. Big Red Dog Smoking - Comedy show
function drawBigRedDogShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky blue background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground
    ctx.fillStyle = `rgba(34, 139, 34, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Big red dog body
    const dogX = canvas.width / 2;
    const dogY = canvas.height * 0.65;
    const dogSize = 120 + Math.sin(time * 0.5) * 5;
    
    // Dog body (big red circle)
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.ellipse(dogX, dogY, dogSize * 0.6, dogSize * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog head
    ctx.beginPath();
    ctx.arc(dogX, dogY - dogSize * 0.4, dogSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog eyes
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.beginPath();
    ctx.arc(dogX - 20, dogY - dogSize * 0.5, 12, 0, Math.PI * 2);
    ctx.arc(dogX + 20, dogY - dogSize * 0.5, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(dogX - 20, dogY - dogSize * 0.5, 6, 0, Math.PI * 2);
    ctx.arc(dogX + 20, dogY - dogSize * 0.5, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Dog nose
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(dogX, dogY - dogSize * 0.3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Cigarette in mouth
    const cigX = dogX + 30;
    const cigY = dogY - dogSize * 0.35;
    const cigAngle = Math.sin(time * 0.3) * 0.1;
    
    ctx.save();
    ctx.translate(cigX, cigY);
    ctx.rotate(cigAngle);
    
    // Cigarette
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(-25, -2, 25, 4);
    
    // Cigarette tip (orange)
    ctx.fillStyle = `rgba(255, 140, 0, ${brightness})`;
    ctx.fillRect(-25, -2, 5, 4);
    
    // Smoke particles
    for (let i = 0; i < 8; i++) {
        const smokeX = -30 - i * 5 + Math.sin(time * 2 + i) * 3;
        const smokeY = -2 + Math.cos(time * 1.5 + i) * 2;
        const smokeSize = 3 + i * 0.5;
        const smokeAlpha = (1 - i / 8) * brightness * 0.6;
        ctx.fillStyle = `rgba(200, 200, 200, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Big Red Dog', canvas.width / 2, 60);
}

// 2. Pabst Blue Ribbon - Life problems drama
function drawPabstShow(ctx, canvas, brightness, time, state, tvShow) {
    // Dark bar background
    ctx.fillStyle = `rgba(20, 20, 40, ${brightness * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Bar counter
    ctx.fillStyle = `rgba(80, 60, 40, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Pabst Blue Ribbon can
    const canX = canvas.width / 2;
    const canY = canvas.height * 0.5;
    const canTilt = Math.sin(time * 0.2) * 0.1;
    
    ctx.save();
    ctx.translate(canX, canY);
    ctx.rotate(canTilt);
    
    // Can body (blue)
    const canGradient = ctx.createLinearGradient(-20, -40, -20, 40);
    canGradient.addColorStop(0, `rgba(0, 50, 150, ${brightness * 0.9})`);
    canGradient.addColorStop(0.5, `rgba(0, 100, 200, ${brightness})`);
    canGradient.addColorStop(1, `rgba(0, 50, 150, ${brightness * 0.9})`);
    ctx.fillStyle = canGradient;
    ctx.fillRect(-20, -40, 40, 80);
    
    // Can top
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, -40, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Pabst logo text
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PABST', 0, -10);
    ctx.fillText('BLUE RIBBON', 0, 10);
    
    ctx.restore();
    
    // Animated character (simple stick figure) going through problems
    const charX = canvas.width * 0.3 + Math.sin(time * 0.3) * 20;
    const charY = canvas.height * 0.7;
    
    // Character body
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Head
    ctx.arc(charX, charY - 30, 10, 0, Math.PI * 2);
    // Body
    ctx.moveTo(charX, charY - 20);
    ctx.lineTo(charX, charY);
    // Arms (sad pose)
    ctx.moveTo(charX, charY - 15);
    ctx.lineTo(charX - 15, charY - 5);
    ctx.moveTo(charX, charY - 15);
    ctx.lineTo(charX + 15, charY - 5);
    // Legs
    ctx.moveTo(charX, charY);
    ctx.lineTo(charX - 10, charY + 20);
    ctx.moveTo(charX, charY);
    ctx.lineTo(charX + 10, charY + 20);
    ctx.stroke();
    
    // Problem text bubbles
    const problems = ['Rent Due', 'Job Lost', 'Car Broke', 'Life Hard'];
    const problemIndex = Math.floor(time * 0.1) % problems.length;
    ctx.fillStyle = `rgba(255, 200, 200, ${brightness * 0.9})`;
    ctx.fillRect(charX - 40, charY - 60, 80, 25);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(problems[problemIndex], charX, charY - 45);
    
    // Show title
    ctx.fillStyle = `rgba(0, 100, 200, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Pabst Blue Ribbon', canvas.width / 2, 50);
}

// 3. Pool Lifeguard Live - Reality show
function drawLifeguardShow(ctx, canvas, brightness, time, state, tvShow) {
    // Pool water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(0, 150, 255, ${brightness * 0.9})`);
    gradient.addColorStop(0.5, `rgba(0, 120, 200, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 100, 180, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pool tiles/pattern
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 6; j++) {
            ctx.strokeRect(i * 80, j * 60, 80, 60);
        }
    }
    
    // Water ripples
    for (let i = 0; i < 5; i++) {
        const rippleX = canvas.width * (0.2 + i * 0.15);
        const rippleY = canvas.height * 0.6;
        const rippleRadius = 30 + Math.sin(time * 2 + i) * 10;
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Lifeguard chair
    const chairX = canvas.width * 0.85;
    const chairY = canvas.height * 0.3;
    
    // Chair pole
    ctx.fillStyle = `rgba(150, 100, 50, ${brightness})`;
    ctx.fillRect(chairX - 3, chairY, 6, 150);
    
    // Chair seat
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.fillRect(chairX - 25, chairY, 50, 20);
    
    // Lifeguard (simple figure)
    const guardX = chairX;
    const guardY = chairY - 20;
    const guardSway = Math.sin(time * 0.5) * 3;
    
    // Guard body
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(guardX + guardSway, guardY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Guard arms (waving)
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(guardX + guardSway, guardY);
    ctx.lineTo(guardX - 15 + guardSway + Math.sin(time * 2) * 5, guardY - 10);
    ctx.moveTo(guardX + guardSway, guardY);
    ctx.lineTo(guardX + 15 + guardSway - Math.sin(time * 2) * 5, guardY - 10);
    ctx.stroke();
    
    // Whistle
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(guardX + guardSway - 2, guardY - 8, 4, 6);
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Pool Lifeguard Live', canvas.width / 2, 50);
}

// 4. Cup Show - Documentary about cups
function drawCupsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Clean white background
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.95})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Table surface
    ctx.fillStyle = `rgba(200, 180, 160, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Multiple cups arranged
    const cupPositions = [
        { x: 0.2, y: 0.6, size: 1.0 },
        { x: 0.4, y: 0.65, size: 0.9 },
        { x: 0.6, y: 0.6, size: 1.1 },
        { x: 0.8, y: 0.65, size: 0.95 }
    ];
    
    cupPositions.forEach((pos, i) => {
        const cupX = canvas.width * pos.x;
        const cupY = canvas.height * pos.y;
        const cupSize = 40 * pos.size;
        const cupRotation = Math.sin(time * 0.3 + i) * 0.05;
        
        ctx.save();
        ctx.translate(cupX, cupY);
        ctx.rotate(cupRotation);
        
        // Cup body
        const cupGradient = ctx.createLinearGradient(-cupSize * 0.4, -cupSize, -cupSize * 0.4, cupSize);
        cupGradient.addColorStop(0, `rgba(240, 240, 240, ${brightness})`);
        cupGradient.addColorStop(0.5, `rgba(255, 255, 255, ${brightness})`);
        cupGradient.addColorStop(1, `rgba(220, 220, 220, ${brightness})`);
        ctx.fillStyle = cupGradient;
        ctx.beginPath();
        ctx.moveTo(-cupSize * 0.4, -cupSize);
        ctx.lineTo(-cupSize * 0.3, cupSize);
        ctx.lineTo(cupSize * 0.3, cupSize);
        ctx.lineTo(cupSize * 0.4, -cupSize);
        ctx.closePath();
        ctx.fill();
        
        // Cup rim
        ctx.strokeStyle = `rgba(180, 180, 180, ${brightness})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(0, -cupSize, cupSize * 0.4, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Cup handle
        ctx.strokeStyle = `rgba(150, 150, 150, ${brightness})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cupSize * 0.5, -cupSize * 0.3, cupSize * 0.25, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    });
    
    // Documentary text overlay
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.7})`;
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('The Fascinating World of Cups', canvas.width / 2, canvas.height - 80);
    ctx.fillText('Episode 7: Ceramic vs. Porcelain', canvas.width / 2, canvas.height - 50);
    
    // Show title
    ctx.fillStyle = `rgba(100, 100, 150, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Cup Show', canvas.width / 2, 50);
}

// 5. Trash Can Life - Fantasy show
function drawTrashCanShow(ctx, canvas, brightness, time, state, tvShow) {
    // Urban background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(100, 100, 120, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(60, 60, 80, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground
    ctx.fillStyle = `rgba(80, 80, 80, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);
    
    // Trash can
    const canX = canvas.width / 2;
    const canY = canvas.height * 0.7;
    const canAnimation = Math.sin(time * 0.5) * 0.1;
    
    ctx.save();
    ctx.translate(canX, canY);
    ctx.rotate(canAnimation);
    
    // Can body (gray)
    const canGradient = ctx.createLinearGradient(-30, -60, -30, 60);
    canGradient.addColorStop(0, `rgba(100, 100, 100, ${brightness})`);
    canGradient.addColorStop(0.5, `rgba(150, 150, 150, ${brightness})`);
    canGradient.addColorStop(1, `rgba(80, 80, 80, ${brightness})`);
    ctx.fillStyle = canGradient;
    ctx.fillRect(-30, -60, 60, 120);
    
    // Can lid
    ctx.fillStyle = `rgba(120, 120, 120, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, -60, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Magical glow effect (coming to life)
    const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;
    ctx.shadowColor = `rgba(100, 200, 255, ${brightness * glowIntensity})`;
    ctx.shadowBlur = 30;
    ctx.fillStyle = `rgba(100, 200, 255, ${brightness * glowIntensity * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Eyes (magical life)
    const eyeGlow = Math.sin(time * 3) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(100, 255, 100, ${brightness * eyeGlow})`;
    ctx.beginPath();
    ctx.arc(-15, -30, 8, 0, Math.PI * 2);
    ctx.arc(15, -30, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (smile)
    ctx.strokeStyle = `rgba(100, 255, 100, ${brightness * eyeGlow})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -10, 15, 0, Math.PI);
    ctx.stroke();
    
    ctx.restore();
    
    // Magical particles
    for (let i = 0; i < 15; i++) {
        const particleX = canX + (Math.sin(time + i) * 0.5 + 0.5) * 100 - 50;
        const particleY = canY + (Math.cos(time * 0.7 + i) * 0.5 + 0.5) * 80 - 40;
        const particleAlpha = (Math.sin(time * 2 + i) + 1) * 0.5 * brightness * 0.6;
        ctx.fillStyle = `rgba(100, 200, 255, ${particleAlpha})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Show title
    ctx.fillStyle = `rgba(100, 200, 255, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Trash Can Life', canvas.width / 2, 50);
}

// 6. Loch Ness Kid - Adventure show
function drawLochNessShow(ctx, canvas, brightness, time, state, tvShow) {
    // Lake/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(100, 150, 200, ${brightness * 0.8})`);
    gradient.addColorStop(0.6, `rgba(50, 100, 150, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(30, 70, 120, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Water ripples
    for (let i = 0; i < 8; i++) {
        const rippleX = canvas.width * (0.1 + i * 0.1);
        const rippleY = canvas.height * 0.7;
        const rippleRadius = 20 + Math.sin(time + i) * 8;
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, rippleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Loch Ness Monster (large, morphing to small kid)
    const morphProgress = (Math.sin(time * 0.3) + 1) * 0.5; // 0 = monster, 1 = kid
    const monsterX = canvas.width / 2;
    const monsterY = canvas.height * 0.6;
    
    if (morphProgress < 0.5) {
        // Loch Ness Monster form
        const monsterSize = 80 * (1 - morphProgress * 2);
        const neckLength = 100 * (1 - morphProgress * 2);
        
        // Monster body
        ctx.fillStyle = `rgba(0, 100, 50, ${brightness * 0.8})`;
        ctx.beginPath();
        ctx.ellipse(monsterX, monsterY, monsterSize, monsterSize * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Monster neck and head
        ctx.beginPath();
        ctx.ellipse(monsterX, monsterY - neckLength, monsterSize * 0.4, monsterSize * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Monster eyes
        ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(monsterX - 10, monsterY - neckLength - 5, 5, 0, Math.PI * 2);
        ctx.arc(monsterX + 10, monsterY - neckLength - 5, 5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Puny kid form
        const kidSize = 20 + (morphProgress - 0.5) * 40;
        const kidX = monsterX;
        const kidY = monsterY + 30;
        
        // Kid body
        ctx.fillStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.beginPath();
        ctx.arc(kidX, kidY, kidSize, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid head
        ctx.beginPath();
        ctx.arc(kidX, kidY - kidSize - 10, kidSize * 0.8, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid eyes (sad/bullied)
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(kidX - 5, kidY - kidSize - 5, 2, 0, Math.PI * 2);
        ctx.arc(kidX + 5, kidY - kidSize - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Kid arms (small)
        ctx.strokeStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(kidX, kidY);
        ctx.lineTo(kidX - 8, kidY + 5);
        ctx.moveTo(kidX, kidY);
        ctx.lineTo(kidX + 8, kidY + 5);
        ctx.stroke();
    }
    
    // Bully kid (small, on the side)
    const bullyX = canvas.width * 0.2;
    const bullyY = canvas.height * 0.7;
    
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(bullyX, bullyY, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Bully pointing
    ctx.strokeStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bullyX, bullyY);
    ctx.lineTo(bullyX + 20, bullyY - 10);
    ctx.stroke();
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Loch Ness Kid', canvas.width / 2, 50);
}

// 7. Rotten Banana - Nature/timescale show
function drawBananaShow(ctx, canvas, brightness, time, state, tvShow) {
    // Kitchen/floor background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 180, 160, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(150, 130, 110, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Floor tiles
    ctx.strokeStyle = `rgba(120, 100, 80, ${brightness * 0.5})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 5; j++) {
            ctx.strokeRect(i * 100, j * 80, 100, 80);
        }
    }
    
    // Banana on floor
    const bananaX = canvas.width / 2;
    const bananaY = canvas.height * 0.7;
    
    // Rot progression (0 = fresh, 1 = completely rotten)
    const rotTime = (time * 0.1) % 1; // Slow time progression
    
    // Banana shape (curved)
    ctx.save();
    ctx.translate(bananaX, bananaY);
    ctx.rotate(-0.3);
    
    // Banana body color based on rot
    const freshYellow = { r: 255, g: 255, b: 0 };
    const rottenBrown = { r: 100, g: 50, b: 0 };
    const currentColor = {
        r: freshYellow.r + (rottenBrown.r - freshYellow.r) * rotTime,
        g: freshYellow.g + (rottenBrown.g - freshYellow.g) * rotTime,
        b: freshYellow.b + (rottenBrown.b - freshYellow.b) * rotTime
    };
    
    ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Rot spots (appear over time)
    const spotCount = Math.floor(rotTime * 8);
    for (let i = 0; i < spotCount; i++) {
        const spotX = (Math.random() - 0.5) * 100;
        const spotY = (Math.random() - 0.5) * 40;
        ctx.fillStyle = `rgba(50, 25, 0, ${brightness * rotTime})`;
        ctx.beginPath();
        ctx.arc(spotX, spotY, 3 + rotTime * 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Banana stem (browns over time)
    ctx.fillStyle = `rgba(${100 + rotTime * 50}, ${50 + rotTime * 25}, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(-50, -5, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    // Time indicator
    const timeLabels = ['Day 1', 'Day 3', 'Day 5', 'Day 7', 'Day 9', 'Rotten'];
    const timeIndex = Math.floor(rotTime * timeLabels.length);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(timeLabels[timeIndex], canvas.width / 2, canvas.height - 100);
    
    // Show title
    ctx.fillStyle = `rgba(255, 200, 0, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Rotten Banana', canvas.width / 2, 50);
}

// 8. Endless Drive - Action show
function drawDrivingShow(ctx, canvas, brightness, time, state, tvShow) {
    // Road background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.9})`);
    gradient.addColorStop(0.7, `rgba(100, 150, 200, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(80, 80, 80, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Road surface
    ctx.fillStyle = `rgba(60, 60, 60, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Road lines (moving)
    ctx.strokeStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = (time * 100) % 40;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height * 0.6);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Car (animated, driving non-stop)
    const carX = canvas.width / 2;
    const carY = canvas.height * 0.75;
    const carBounce = Math.sin(time * 3) * 2;
    
    // Car body
    ctx.fillStyle = `rgba(200, 50, 50, ${brightness})`;
    ctx.fillRect(carX - 40, carY - 20 + carBounce, 80, 30);
    
    // Car roof
    ctx.fillStyle = `rgba(150, 30, 30, ${brightness})`;
    ctx.fillRect(carX - 25, carY - 40 + carBounce, 50, 25);
    
    // Car windows
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness * 0.6})`;
    ctx.fillRect(carX - 20, carY - 35 + carBounce, 20, 15);
    ctx.fillRect(carX + 0, carY - 35 + carBounce, 20, 15);
    
    // Car wheels (spinning)
    const wheelRotation = time * 5;
    ctx.save();
    // Left wheel
    ctx.translate(carX - 25, carY + 10 + carBounce);
    ctx.rotate(wheelRotation);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    // Right wheel
    ctx.translate(carX + 25, carY + 10 + carBounce);
    ctx.rotate(wheelRotation);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Driver (simple stick figure)
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(carX, carY - 20 + carBounce, 5, 0, Math.PI * 2);
    ctx.stroke();
    
    // Scenery passing by
    for (let i = 0; i < 5; i++) {
        const treeX = (canvas.width * 0.1 + i * canvas.width * 0.2 - (time * 50) % (canvas.width * 1.2)) % (canvas.width * 1.2);
        const treeY = canvas.height * 0.5;
        
        // Tree trunk
        ctx.fillStyle = `rgba(100, 50, 0, ${brightness})`;
        ctx.fillRect(treeX - 5, treeY, 10, 40);
        
        // Tree leaves
        ctx.fillStyle = `rgba(0, 150, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(treeX, treeY, 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Speed indicator
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('SPEED: 65 MPH', canvas.width / 2, 40);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
    ctx.font = 'bold 20px Arial';
    ctx.fillText('Endless Drive', canvas.width / 2, canvas.height - 30);
}

// 9. Ocean Meets Volcano - Nature/live view
function drawOceanVolcanoShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient (sunset)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    const sunsetPhase = (Math.sin(time * 0.1) + 1) * 0.5; // Slow sunset cycle
    skyGradient.addColorStop(0, `rgba(255, ${100 + sunsetPhase * 100}, ${sunsetPhase * 50}, ${brightness * 0.9})`);
    skyGradient.addColorStop(0.5, `rgba(255, ${150 + sunsetPhase * 50}, ${50 + sunsetPhase * 100}, ${brightness * 0.8})`);
    skyGradient.addColorStop(1, `rgba(100, 50, ${sunsetPhase * 100}, ${brightness * 0.7})`);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
    
    // Sun
    const sunX = canvas.width * 0.8;
    const sunY = canvas.height * 0.3;
    const sunSize = 40 + sunsetPhase * 20;
    ctx.fillStyle = `rgba(255, ${200 + sunsetPhase * 55}, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize, 0, Math.PI * 2);
    ctx.fill();
    
    // Ocean
    const oceanGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    oceanGradient.addColorStop(0, `rgba(0, ${100 + sunsetPhase * 50}, 200, ${brightness * 0.8})`);
    oceanGradient.addColorStop(1, `rgba(0, 50, 150, ${brightness * 0.7})`);
    ctx.fillStyle = oceanGradient;
    ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
    
    // Ocean waves
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const waveY = canvas.height * 0.6 + i * 20;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 5) {
            const y = waveY + Math.sin((x + time * 20) * 0.1) * 5;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Volcano (on the right)
    const volcanoX = canvas.width * 0.85;
    const volcanoY = canvas.height * 0.6;
    
    // Volcano base
    ctx.fillStyle = `rgba(80, 40, 20, ${brightness})`;
    ctx.beginPath();
    ctx.moveTo(volcanoX - 80, volcanoY);
    ctx.lineTo(volcanoX, volcanoY - 120);
    ctx.lineTo(volcanoX + 80, volcanoY);
    ctx.closePath();
    ctx.fill();
    
    // Lava glow
    const lavaGlow = (Math.sin(time * 2) + 1) * 0.5;
    ctx.shadowColor = `rgba(255, 100, 0, ${brightness * lavaGlow})`;
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, ${100 + lavaGlow * 100}, 0, ${brightness * lavaGlow})`;
    ctx.beginPath();
    ctx.moveTo(volcanoX - 20, volcanoY - 120);
    ctx.lineTo(volcanoX, volcanoY - 140);
    ctx.lineTo(volcanoX + 20, volcanoY - 120);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Lava flowing down
    for (let i = 0; i < 3; i++) {
        const lavaY = volcanoY - 100 + i * 15;
        const lavaX = volcanoX + (Math.sin(time * 3 + i) - 0.5) * 10;
        ctx.fillStyle = `rgba(255, ${50 + lavaGlow * 100}, 0, ${brightness * lavaGlow})`;
        ctx.beginPath();
        ctx.arc(lavaX, lavaY, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Steam/smoke from volcano
    for (let i = 0; i < 5; i++) {
        const smokeX = volcanoX + (Math.sin(time + i) - 0.5) * 30;
        const smokeY = volcanoY - 140 - i * 15 - time * 10;
        const smokeSize = 8 + i * 2;
        const smokeAlpha = (1 - i / 5) * brightness * 0.5;
        ctx.fillStyle = `rgba(200, 200, 200, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Ocean Meets Volcano', canvas.width / 2, 60);
}

// 10. Fridge Planet - Sitcom
function drawFridgePlanetShow(ctx, canvas, brightness, time, state, tvShow) {
    // Space background
    const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
    );
    gradient.addColorStop(0, `rgba(50, 50, 100, ${brightness * 0.9})`);
    gradient.addColorStop(1, `rgba(0, 0, 20, ${brightness * 0.8})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Stars
    for (let i = 0; i < 50; i++) {
        const starX = (i * 37) % canvas.width;
        const starY = (i * 73) % canvas.height;
        const twinkle = (Math.sin(time * 2 + i) + 1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * twinkle})`;
        ctx.fillRect(starX, starY, 2, 2);
    }
    
    // Fridge Planet (large, floating)
    const planetX = canvas.width / 2;
    const planetY = canvas.height / 2;
    const planetFloat = Math.sin(time * 0.5) * 10;
    const planetSize = 150;
    
    // Planet body (fridge shape)
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(planetX - planetSize * 0.4, planetY - planetSize * 0.6 + planetFloat, planetSize * 0.8, planetSize * 1.2);
    
    // Fridge door
    ctx.strokeStyle = `rgba(150, 150, 150, ${brightness})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(planetX - planetSize * 0.4, planetY - planetSize * 0.6 + planetFloat, planetSize * 0.8, planetSize * 1.2);
    
    // Fridge handle
    ctx.fillStyle = `rgba(100, 100, 100, ${brightness})`;
    ctx.fillRect(planetX + planetSize * 0.35, planetY - planetSize * 0.2 + planetFloat, 8, 30);
    
    // Fridge door seam
    ctx.strokeStyle = `rgba(120, 120, 120, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(planetX, planetY - planetSize * 0.6 + planetFloat);
    ctx.lineTo(planetX, planetY + planetSize * 0.6 + planetFloat);
    ctx.stroke();
    
    // Fridge interior glow (when open)
    const doorOpen = Math.sin(time * 0.3) > 0;
    if (doorOpen) {
        ctx.fillStyle = `rgba(255, 255, 200, ${brightness * 0.6})`;
        ctx.fillRect(planetX - planetSize * 0.35, planetY - planetSize * 0.5 + planetFloat, planetSize * 0.35, planetSize);
    }
    
    // Fridge contents (simple shapes)
    if (doorOpen) {
        // Milk carton
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fillRect(planetX - planetSize * 0.3, planetY - planetSize * 0.3 + planetFloat, 20, 30);
        
        // Apple
        ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(planetX - planetSize * 0.1, planetY + planetFloat, 10, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Planet rings (saturn-like)
    ctx.strokeStyle = `rgba(150, 200, 255, ${brightness * 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(planetX, planetY + planetSize * 0.7 + planetFloat, planetSize * 0.6, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Sitcom characters (small, floating around)
    for (let i = 0; i < 3; i++) {
        const charX = planetX + Math.cos(time + i * 2) * (planetSize * 0.8);
        const charY = planetY + Math.sin(time + i * 2) * (planetSize * 0.8) + planetFloat;
        
        // Character (simple circle with face)
        ctx.fillStyle = `rgba(255, 200, 150, ${brightness})`;
        ctx.beginPath();
        ctx.arc(charX, charY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Face
        ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(charX - 3, charY - 2, 1, 0, Math.PI * 2);
        ctx.arc(charX + 3, charY - 2, 1, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.strokeStyle = `rgba(0, 0, 0, ${brightness})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(charX, charY + 2, 4, 0, Math.PI);
        ctx.stroke();
    }
    
    // Show title
    ctx.fillStyle = `rgba(200, 255, 255, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Fridge Planet', canvas.width / 2, 50);
    
    // Episode info
    ctx.fillStyle = `rgba(150, 200, 255, ${brightness * 0.8})`;
    ctx.font = '18px Arial';
    ctx.fillText('Season 2 • Episode 5', canvas.width / 2, canvas.height - 40);
}

// 11. Talking Toaster - Comedy show
function drawToasterShow(ctx, canvas, brightness, time, state, tvShow) {
    // Kitchen background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 200, 180, ${brightness * 0.8})`);
    gradient.addColorStop(1, `rgba(150, 150, 130, ${brightness * 0.7})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Counter
    ctx.fillStyle = `rgba(120, 100, 80, ${brightness * 0.8})`;
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Toaster
    const toasterX = canvas.width / 2;
    const toasterY = canvas.height * 0.65;
    const toasterBounce = Math.sin(time * 2) * 2;
    
    // Toaster body
    ctx.fillStyle = `rgba(200, 200, 200, ${brightness})`;
    ctx.fillRect(toasterX - 40, toasterY - 30 + toasterBounce, 80, 60);
    
    // Toaster slots
    ctx.fillStyle = `rgba(50, 50, 50, ${brightness})`;
    ctx.fillRect(toasterX - 35, toasterY - 25 + toasterBounce, 30, 50);
    ctx.fillRect(toasterX + 5, toasterY - 25 + toasterBounce, 30, 50);
    
    // Toast popping up
    const toastPop = Math.sin(time * 1.5) * 0.5 + 0.5;
    if (toastPop > 0.3) {
        ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
        ctx.fillRect(toasterX - 32, toasterY - 50 - toastPop * 30 + toasterBounce, 26, 20);
        ctx.fillRect(toasterX + 6, toasterY - 50 - toastPop * 30 + toasterBounce, 26, 20);
    }
    
    // Toaster face (talking)
    const mouthOpen = Math.sin(time * 3) * 0.5 + 0.5;
    // Eyes
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(toasterX - 15, toasterY - 10 + toasterBounce, 3, 0, Math.PI * 2);
    ctx.arc(toasterX + 15, toasterY - 10 + toasterBounce, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth (talking animation)
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(toasterX, toasterY + 5 + toasterBounce, 8, 3 + mouthOpen * 3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Speech bubble
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
    ctx.fillRect(toasterX - 60, toasterY - 80 + toasterBounce, 120, 30);
    ctx.strokeStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(toasterX - 60, toasterY - 80 + toasterBounce, 120, 30);
    
    const quotes = ['Hello!', 'I toast!', 'Pop!', 'Yum!'];
    const quoteIndex = Math.floor(time * 0.5) % quotes.length;
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(quotes[quoteIndex], toasterX, toasterY - 60 + toasterBounce);
    
    // Show title
    ctx.fillStyle = `rgba(200, 150, 100, ${brightness})`;
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Talking Toaster', canvas.width / 2, 50);
}

// 12. Cloud Watching - Relaxation show
function drawCloudsShow(ctx, canvas, brightness, time, state, tvShow) {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(135, 206, 250, ${brightness * 0.95})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, ${brightness * 0.85})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Multiple clouds drifting
    for (let i = 0; i < 6; i++) {
        const cloudX = (canvas.width * 0.1 + i * canvas.width * 0.15 + time * 10) % (canvas.width + 150) - 75;
        const cloudY = canvas.height * (0.2 + (i % 3) * 0.25);
        const cloudSize = 40 + (i % 3) * 20;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
        ctx.beginPath();
        ctx.arc(cloudX, cloudY, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.5, cloudY, cloudSize * 0.7, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize, cloudY, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.3, cloudY - cloudSize * 0.3, cloudSize * 0.5, 0, Math.PI * 2);
        ctx.arc(cloudX + cloudSize * 0.7, cloudY - cloudSize * 0.3, cloudSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Sun
    const sunX = canvas.width * 0.85;
    const sunY = canvas.height * 0.2;
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness * 0.9})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fill();
    
    // Relaxing text
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness * 0.7})`;
    ctx.font = 'italic 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Just Breathe...', canvas.width / 2, canvas.height - 60);
    
    // Show title
    ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Cloud Watching', canvas.width / 2, 50);
}

// 13. Paint Drying Live - Documentary
function drawPaintShow(ctx, canvas, brightness, time, state, tvShow) {
    // Wall background
    ctx.fillStyle = `rgba(240, 240, 240, ${brightness * 0.9})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Paint area
    const paintX = canvas.width / 2;
    const paintY = canvas.height / 2;
    const paintWidth = 200;
    const paintHeight = 150;
    
    // Paint drying progression (very slow)
    const dryProgress = (time * 0.01) % 1;
    
    // Fresh paint (wet, shiny)
    const freshColor = { r: 150, g: 200, b: 255 };
    const dryColor = { r: 120, g: 160, b: 200 };
    const currentColor = {
        r: freshColor.r + (dryColor.r - freshColor.r) * dryProgress,
        g: freshColor.g + (dryColor.g - freshColor.g) * dryProgress,
        b: freshColor.b + (dryColor.b - freshColor.b) * dryProgress
    };
    
    ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${brightness})`;
    ctx.fillRect(paintX - paintWidth / 2, paintY - paintHeight / 2, paintWidth, paintHeight);
    
    // Wet shine effect (fades as it dries)
    if (dryProgress < 0.7) {
        const shineAlpha = (1 - dryProgress / 0.7) * brightness * 0.4;
        ctx.fillStyle = `rgba(255, 255, 255, ${shineAlpha})`;
        ctx.fillRect(paintX - paintWidth / 2 + 20, paintY - paintHeight / 2 + 20, paintWidth * 0.3, paintHeight * 0.2);
    }
    
    // Paint brush marks
    ctx.strokeStyle = `rgba(${currentColor.r - 20}, ${currentColor.g - 20}, ${currentColor.b - 20}, ${brightness * 0.6})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(paintX - paintWidth / 2 + i * 40, paintY - paintHeight / 2);
        ctx.lineTo(paintX - paintWidth / 2 + i * 40 + 10, paintY + paintHeight / 2);
        ctx.stroke();
    }
    
    // Timer
    const hours = Math.floor(dryProgress * 24);
    const minutes = Math.floor((dryProgress * 24 - hours) * 60);
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness * 0.8})`;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Drying Time: ${hours}h ${minutes}m`, canvas.width / 2, paintY + paintHeight / 2 + 40);
    
    // "LIVE" indicator
    ctx.fillStyle = `rgba(255, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(30, 30, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LIVE', 45, 35);
    
    // Show title
    ctx.fillStyle = `rgba(100, 150, 200, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Paint Drying Live', canvas.width / 2, 50);
}

// 14. Rubber Duck Adventures - Adventure show
function drawRubberDuckShow(ctx, canvas, brightness, time, state, tvShow) {
    // Bathtub/water background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `rgba(200, 220, 255, ${brightness * 0.8})`);
    gradient.addColorStop(0.6, `rgba(100, 150, 255, ${brightness * 0.7})`);
    gradient.addColorStop(1, `rgba(80, 120, 200, ${brightness * 0.6})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Water surface
    ctx.strokeStyle = `rgba(255, 255, 255, ${brightness * 0.3})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const waveY = canvas.height * 0.5 + i * 15;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x += 5) {
            const y = waveY + Math.sin((x + time * 20) * 0.1) * 3;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Rubber duck (floating, animated)
    const duckX = canvas.width / 2 + Math.sin(time * 0.5) * 50;
    const duckY = canvas.height * 0.6 + Math.sin(time * 0.7) * 10;
    const duckBounce = Math.sin(time * 2) * 3;
    
    // Duck body (yellow)
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(duckX, duckY + duckBounce, 40, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck head
    ctx.beginPath();
    ctx.arc(duckX + 25, duckY - 10 + duckBounce, 25, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck bill (orange)
    ctx.fillStyle = `rgba(255, 140, 0, ${brightness})`;
    ctx.beginPath();
    ctx.ellipse(duckX + 40, duckY - 5 + duckBounce, 15, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Duck eye
    ctx.fillStyle = `rgba(0, 0, 0, ${brightness})`;
    ctx.beginPath();
    ctx.arc(duckX + 30, duckY - 15 + duckBounce, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Adventure props (islands, treasure)
    for (let i = 0; i < 3; i++) {
        const islandX = canvas.width * (0.1 + i * 0.3);
        const islandY = canvas.height * 0.7;
        
        // Island
        ctx.fillStyle = `rgba(100, 80, 60, ${brightness})`;
        ctx.beginPath();
        ctx.arc(islandX, islandY, 20 + i * 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Palm tree
        ctx.fillStyle = `rgba(0, 150, 0, ${brightness})`;
        ctx.beginPath();
        ctx.arc(islandX, islandY - 15, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Treasure chest
    const chestX = canvas.width * 0.8;
    const chestY = canvas.height * 0.65;
    ctx.fillStyle = `rgba(150, 100, 50, ${brightness})`;
    ctx.fillRect(chestX - 15, chestY, 30, 20);
    ctx.fillStyle = `rgba(255, 215, 0, ${brightness * 0.8})`;
    ctx.fillRect(chestX - 10, chestY - 5, 20, 5);
    
    // Show title
    ctx.fillStyle = `rgba(255, 255, 0, ${brightness})`;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Rubber Duck Adventures', canvas.width / 2, 50);
}

// Enhanced boot sequence animation with particles and energy waves
function drawBootSequence(ctx, canvas, brightness, powerAnimation) {
    const progress = powerAnimation.currentBrightness;
    const time = Date.now() * 0.001;
    
    // Update and render energy waves
    if (powerAnimation.energyWaves && powerAnimation.energyWaves.length > 0) {
        powerAnimation.energyWaves.forEach((wave, index) => {
            wave.radius += wave.speed * progress;
            wave.opacity = Math.max(0, 0.5 * (1 - wave.radius / wave.maxRadius));
            
            if (wave.radius < wave.maxRadius && wave.opacity > 0.01) {
                ctx.save();
                ctx.globalAlpha = wave.opacity * brightness;
                ctx.strokeStyle = `rgba(100, 150, 255, ${wave.opacity})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(wave.x || canvas.width / 2, wave.y || canvas.height / 2, wave.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }
    
    // Update and render particles
    if (powerAnimation.particles && powerAnimation.particles.length > 0) {
        powerAnimation.particles.forEach((particle, index) => {
            particle.x += particle.vx * progress;
            particle.y += particle.vy * progress;
            particle.life -= 0.02;
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            if (particle.life > 0 && particle.x > 0 && particle.x < canvas.width && 
                particle.y > 0 && particle.y < canvas.height) {
                ctx.save();
                ctx.globalAlpha = particle.life * brightness * 0.6;
                ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${particle.life})`;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });
    }
    
    // Phase 1: Initial flicker and logo fade-in (0-0.3 brightness)
    if (progress < 0.3) {
        const phaseProgress = progress / 0.3;
        const logoOpacity = Math.pow(phaseProgress, 2) * brightness;
        
        // TV brand logo (simulated)
        ctx.save();
        ctx.globalAlpha = logoOpacity;
        ctx.fillStyle = `rgba(255, 255, 255, ${logoOpacity})`;
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PHILIPS', canvas.width / 2, canvas.height / 2 - 50);
        
        // Subtitle
        ctx.font = '24px Arial';
        ctx.fillStyle = `rgba(200, 200, 200, ${logoOpacity})`;
        ctx.fillText('Smart TV', canvas.width / 2, canvas.height / 2 + 20);
        ctx.restore();
        
        // Flicker effect
        if (Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.1})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    // Phase 2: Loading animation (0.3-0.7 brightness)
    else if (progress < 0.7) {
        const phaseProgress = (progress - 0.3) / 0.4;
        
        // Animated background gradient
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width
        );
        const glowIntensity = phaseProgress * brightness;
        gradient.addColorStop(0, `rgba(100, 150, 255, ${glowIntensity * 0.3})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${brightness * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Loading spinner
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(time * 2);
        ctx.strokeStyle = `rgba(100, 150, 255, ${brightness})`;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // Draw spinner arcs
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 40, (i * Math.PI) / 2, (i * Math.PI) / 2 + Math.PI / 3);
            ctx.stroke();
        }
        ctx.restore();
        
        // Loading text
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Starting...', canvas.width / 2, canvas.height / 2 + 80);
        
        // Progress bar
        const barWidth = canvas.width * 0.6;
        const barHeight = 6;
        const barX = (canvas.width - barWidth) / 2;
        const barY = canvas.height / 2 + 110;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.2})`;
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = `rgba(100, 150, 255, ${brightness})`;
        ctx.fillRect(barX, barY, barWidth * phaseProgress, barHeight);
        
        // Animated particles
        for (let i = 0; i < 15; i++) {
            const angle = (time * 2 + i * 0.4) % (Math.PI * 2);
            const radius = 60 + Math.sin(time + i) * 10;
            const x = canvas.width / 2 + Math.cos(angle) * radius;
            const y = canvas.height / 2 + Math.sin(angle) * radius;
            const alpha = (Math.sin(time * 3 + i) + 1) * 0.5 * brightness * 0.6;
            
            ctx.fillStyle = `rgba(100, 150, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    // Phase 3: Content fade-in (0.7-1.0 brightness)
    else {
        const phaseProgress = (progress - 0.7) / 0.3;
        const fadeOpacity = Math.pow(phaseProgress, 1.5) * brightness;
        
        // Fade in welcome screen
        ctx.save();
        ctx.globalAlpha = fadeOpacity;
        
        // Background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, `rgba(26, 26, 46, ${brightness})`);
        gradient.addColorStop(1, `rgba(10, 10, 20, ${brightness * 0.8})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Welcome text with glow
        ctx.shadowColor = `rgba(100, 150, 255, ${fadeOpacity * 0.5})`;
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Welcome', canvas.width / 2, canvas.height / 2 - 30);
        ctx.shadowBlur = 0;
        
        // Animated dots
        for (let i = 0; i < 3; i++) {
            const dotPhase = (time * 2 + i * 0.5) % (Math.PI * 2);
            const dotAlpha = (Math.sin(dotPhase) + 1) * 0.5 * fadeOpacity;
            ctx.fillStyle = `rgba(100, 150, 255, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(canvas.width / 2 + (i - 1) * 30, canvas.height / 2 + 30, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Advanced Easing Functions for Professional Animations
const Easing = {
    // Linear
    linear: (t) => t,
    
    // Ease-in
    easeInQuad: (t) => t * t,
    easeInCubic: (t) => t * t * t,
    easeInQuart: (t) => t * t * t * t,
    easeInQuint: (t) => t * t * t * t * t,
    easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
    easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
    easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
    
    // Ease-out
    easeOutQuad: (t) => t * (2 - t),
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeOutQuint: (t) => 1 - Math.pow(1 - t, 5),
    easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeOutCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
    
    // Ease-in-out
    easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    easeInOutExpo: (t) => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    
    // Elastic
    easeOutElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    easeInElastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
    },
    
    // Bounce
    easeOutBounce: (t) => {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    },
    easeInBounce: (t) => 1 - Easing.easeOutBounce(1 - t),
    
    // Back
    easeOutBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
    easeInBack: (t) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return c3 * t * t * t - c1 * t * t;
    }
};

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 26, g: 26, b: 46 }; // Default dark blue
}

// Enhanced VR-like controls with smooth movement
function initControls() {
    let isDragging = false;
    let mouseDownPosition = { x: 0, y: 0 };
    let previousMousePosition = { x: 0, y: 0 };
    const DRAG_THRESHOLD_PX = 5;
    let cameraDistance = 5;
    let targetCameraPosition = new THREE.Vector3(0, 1.5, 5);
    let currentCameraPosition = targetCameraPosition.clone();
    let targetCameraLookAt = new THREE.Vector3(0, 1.2, -8);
    let currentCameraLookAt = targetCameraLookAt.clone();
    // Only these two + keydown below may set target* – no other code path (prevents bleed)
    const TV_CENTER = new THREE.Vector3(0, 1.2, -8);
    
    const canvas = renderer.domElement;
    
    // Mouse click for remote interaction
    canvas.addEventListener('click', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(remoteGroup.children, true);
        
        // Find first hit that belongs to a button (labels/overlays can block, so check all intersects)
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            while (obj && obj.userData.buttonCode === undefined && obj.parent) {
                obj = obj.parent;
            }
            if (obj && obj.userData.buttonCode !== undefined) {
                const button = obj;
                // Visual feedback: highlight button immediately
                highlightRemoteButton(button.userData.buttonName);
                triggerIRSignal(button.userData.buttonName);
                if (socket && socket.connected) {
                    socket.emit('button_press', { button_code: button.userData.buttonCode });
                    console.log(`Clicked button: ${button.userData.buttonName} (0x${button.userData.buttonCode.toString(16).toUpperCase()})`);
                } else {
                    console.warn('WebSocket not connected, button press not sent to server');
                }
                return;
            }
        }
    });
    
    canvas.addEventListener('mousedown', (e) => {
        mouseDownPosition = { x: e.clientX, y: e.clientY };
        previousMousePosition = { x: e.clientX, y: e.clientY };
        isDragging = false; // will set true in mousemove once past threshold
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) {
            const dx = e.clientX - mouseDownPosition.x;
            const dy = e.clientY - mouseDownPosition.y;
            if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
                isDragging = true;
                canvas.style.cursor = 'grabbing';
            }
        }
        if (!isDragging) {
            // Check for button hover
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(remoteGroup.children, true);
            
            let overButton = false;
            for (let i = 0; i < intersects.length; i++) {
                let obj = intersects[i].object;
                while (obj && obj.userData.buttonCode === undefined && obj.parent) {
                    obj = obj.parent;
                }
                if (obj && obj.userData.buttonCode !== undefined) {
                    overButton = true;
                    break;
                }
            }
            canvas.style.cursor = overButton ? 'pointer' : 'grab';
            return;
        }
        
        if (!isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        // Use target (not lerped current) so orbit center is stable – no drift toward TV
        const orbitCenter = targetCameraLookAt.clone();
        cameraDistance = currentCameraPosition.distanceTo(orbitCenter);
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(currentCameraPosition.clone().sub(orbitCenter));
        spherical.theta -= deltaX * 0.01;
        spherical.phi += deltaY * 0.01;
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        targetCameraPosition = new THREE.Vector3().setFromSpherical(spherical).add(orbitCenter);
        targetCameraLookAt.copy(orbitCenter);
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'grab';
    });
    
    canvas.style.cursor = 'grab';
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(1.2, Math.min(15, cameraDistance));
        // Use target lookAt so zoom center is stable – no drift toward TV in remote view
        const center = targetCameraLookAt.clone();
        const direction = currentCameraPosition.clone().sub(center).normalize();
        targetCameraPosition.copy(center).add(direction.multiplyScalar(cameraDistance));
    });
    
    // Only place (with the two buttons below) that set camera targets – no other logic may touch them
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            targetCameraPosition.set(0, 1.5, 5);
            targetCameraLookAt.copy(TV_CENTER);
            document.getElementById('btn-zoom-tv')?.classList.remove('active');
            document.getElementById('btn-look-remote')?.classList.remove('active');
        } else if (e.code === 'Digit1') {
            targetCameraPosition.set(0, 1.5, 5);
            targetCameraLookAt.copy(TV_CENTER);
        } else if (e.code === 'Digit2') {
            targetCameraPosition.set(5, 1.5, 0);
            targetCameraLookAt.copy(TV_CENTER);
        } else if (e.code === 'Digit3') {
            targetCameraPosition.set(0, 8, 0);
            targetCameraLookAt.copy(TV_CENTER);
        } else if (e.code === 'Digit4') {
            if (typeof window.switchViewToRemote === 'function') window.switchViewToRemote();
        } else if (e.code === 'KeyP') {
            // P = Power (turn TV on/off) - works without clicking 3D remote
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('button_press', { button_code: 0x10 });
                console.log('Keyboard: Power (P)');
            }
        } else if (e.code === 'KeyU') {
            // U = Volume Up
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('button_press', { button_code: 0x11 });
            }
        } else if (e.code === 'KeyD') {
            // D = Volume Down (only if not ArrowDown to avoid conflict)
            if (!e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (socket && socket.connected) {
                    socket.emit('button_press', { button_code: 0x12 });
                }
            }
        }
    });
    
    // Smooth camera interpolation (position and lookAt)
    function updateCamera() {
        currentCameraPosition.lerp(targetCameraPosition, 0.1);
        currentCameraLookAt.lerp(targetCameraLookAt, 0.1);
        camera.position.copy(currentCameraPosition);
        camera.lookAt(currentCameraLookAt);
    }
    
    window.updateCamera = updateCamera;
    
    // Only these two + keydown above set target* – no camera orientation or other logic
    window.switchViewToTVZoom = function() {
        targetCameraPosition.set(0, 1.2, -5.6);
        targetCameraLookAt.copy(TV_CENTER);
        cameraDistance = 2.5;
        document.getElementById('btn-zoom-tv')?.classList.add('active');
        document.getElementById('btn-look-remote')?.classList.remove('active');
    };
    window.switchViewToRemote = function() {
        var r = remoteLookClose.basePosition;
        targetCameraPosition.set(r.x, r.y + 0.65, r.z + 1.0);
        targetCameraLookAt.set(r.x, r.y, r.z);
        cameraDistance = 1.8;
        document.getElementById('btn-zoom-tv')?.classList.remove('active');
        document.getElementById('btn-look-remote')?.classList.add('active');
    };
}


// Animation loop with smooth camera movement
function animate() {
    requestAnimationFrame(animate);
    
    // Smooth camera interpolation
    if (window.updateCamera) {
        window.updateCamera();
    }
    
    // Power on/off animation
    if (powerAnimation.isAnimating && screenMesh) {
        const elapsed = Date.now() - powerAnimation.startTime;
        const progress = Math.min(elapsed / powerAnimation.duration, 1);
        
        // Animate scan line during power on (for visual effect)
        if (powerAnimation.targetState) {
            powerAnimation.scanLinePosition = progress;
        }
        
        if (powerAnimation.targetState) {
            // Power ON animation: detailed multi-phase sequence
            if (progress < 0.05) {
                // Phase 1: Initial power surge (very brief flash)
                powerAnimation.flickerPhase = Math.random() > 0.8 ? 1 : 0;
                powerAnimation.currentBrightness = powerAnimation.flickerPhase * 0.4;
            } else if (progress < 0.15) {
                // Phase 2: Multiple flickers (like CRT warming up)
                const flickerRate = Math.sin(progress * Math.PI * 20) * 0.5 + 0.5;
                powerAnimation.flickerPhase = flickerRate;
                powerAnimation.currentBrightness = 0.1 + (flickerRate * 0.3);
            } else if (progress < 0.35) {
                // Phase 3: Scan line effect (like old TVs)
                const scanProgress = (progress - 0.15) / 0.2;
                powerAnimation.flickerPhase = 0.5 + (scanProgress * 0.3);
                powerAnimation.currentBrightness = 0.3 + (scanProgress * 0.2);
            } else if (progress < 0.6) {
                // Phase 4: Color stabilization with smooth easing
                const stabilizeProgress = (progress - 0.35) / 0.25;
                const eased = Easing.easeOutSine(stabilizeProgress);
                powerAnimation.currentBrightness = 0.5 + (eased * 0.3);
                powerAnimation.flickerPhase = 0.8 + (eased * 0.2);
            } else {
                // Phase 5: Final smooth fade to full brightness with ease-out
                const fadeProgress = (progress - 0.6) / 0.4;
                const eased = Easing.easeOutCubic(fadeProgress);
                powerAnimation.currentBrightness = 0.8 + (eased * 0.2);
                powerAnimation.flickerPhase = 1;
            }
            
            // Enhanced bezel glow with pulsing and color effects
            if (tvFrame && tvFrame.material) {
                const baseGlow = powerAnimation.currentBrightness * 0.15;
                const pulse = Math.sin(progress * Math.PI * 4) * 0.05;
                powerAnimation.glowIntensity = Math.max(0, baseGlow + pulse);
                tvFrame.material.emissive.setHex(0xffffff);
                tvFrame.material.emissiveIntensity = powerAnimation.glowIntensity;
                
                // Enhanced color shift during power on with temperature variation
                powerAnimation.colorShift = progress * 0.15;
                const warmFactor = Math.sin(progress * Math.PI * 2) * 0.05;
                tvFrame.material.color.setRGB(
                    1 - powerAnimation.colorShift + warmFactor, 
                    1 - powerAnimation.colorShift * 0.5 + warmFactor * 0.5, 
                    1 + warmFactor * 0.3
                );
                
                // Ripple effect on bezel
                powerAnimation.rippleEffect = Math.sin(progress * Math.PI * 8) * 0.1;
            }
            
            // Animate TV glow light with smooth ramp
            if (tvGlowLight) {
                const lightIntensity = powerAnimation.currentBrightness * 1.2;
                tvGlowLight.intensity = Math.min(lightIntensity, 1.5);
                
                // Color temperature shift (warmer when turning on)
                const colorTemp = 1.0 - (progress * 0.2);
                tvGlowLight.color.setRGB(1, colorTemp, colorTemp * 0.9);
            }
            
            // Animate power LED (red -> green transition)
            if (tvPowerLED && tvPowerLED.material) {
                const mat = tvPowerLED.material;
                const ledProgress = Math.min(progress * 2, 1); // Faster transition
                if (ledProgress < 0.5) {
                    // Red to orange
                    mat.color.setHex(0xff4400);
                    if (mat.emissive) mat.emissive.setHex(0xff4400);
                } else {
                    // Orange to green
                    const greenProgress = (ledProgress - 0.5) * 2;
                    const r = Math.floor(255 * (1 - greenProgress));
                    const g = Math.floor(255 * greenProgress);
                    mat.color.setRGB(r / 255, g / 255, 0);
                    if (mat.emissive) mat.emissive.setRGB(r / 255, g / 255, 0);
                }
                if (mat.emissive !== undefined) {
                    mat.emissiveIntensity = 0.8 + (powerAnimation.currentBrightness * 0.2);
                }
            }
        } else {
            // Power OFF animation: detailed fade sequence
            const fadeProgress = 1 - progress;
            let eased = 0; // Initialize eased variable
            
            if (progress < 0.2) {
                // Phase 1: Quick dim
                const quickDim = 1 - (progress / 0.2);
                powerAnimation.currentBrightness = 0.7 + (quickDim * 0.3);
                eased = quickDim; // Use quickDim for this phase
            } else if (progress < 0.5) {
                // Phase 2: Gradual fade with smooth easing
                const gradualProgress = (progress - 0.2) / 0.3;
                eased = Easing.easeInOutCubic(gradualProgress);
                powerAnimation.currentBrightness = 0.7 * (1 - eased);
            } else {
                // Phase 3: Final fade to black with smooth easing
                const finalProgress = (progress - 0.5) / 0.5;
                eased = Easing.easeInQuad(finalProgress);
                powerAnimation.currentBrightness = 0.7 * (1 - eased);
            }
            
            powerAnimation.flickerPhase = fadeProgress;
            powerAnimation.scanLinePosition = fadeProgress;
            
            // Animate bezel glow fade
            if (tvFrame && tvFrame.material) {
                tvFrame.material.emissiveIntensity = eased * 0.1;
            }
            
            // Animate TV glow light fade
            if (tvGlowLight) {
                tvGlowLight.intensity = eased * 0.8;
            }
            
            // Animate power LED (green -> red transition)
            if (tvPowerLED && tvPowerLED.material) {
                const mat = tvPowerLED.material;
                const ledProgress = 1 - fadeProgress;
                if (ledProgress > 0.5) {
                    // Green to orange
                    const orangeProgress = (ledProgress - 0.5) * 2;
                    const g = Math.floor(255 * (1 - orangeProgress));
                    const r = Math.floor(255 * orangeProgress);
                    mat.color.setRGB(r / 255, g / 255, 0);
                    if (mat.emissive) mat.emissive.setRGB(r / 255, g / 255, 0);
                } else {
                    // Orange to red
                    mat.color.setHex(0xff0000);
                    if (mat.emissive) mat.emissive.setHex(0xff0000);
                }
                if (mat.emissive !== undefined) {
                    mat.emissiveIntensity = 0.8 * fadeProgress;
                }
            }
        }
        
        // Update screen during animation (this will use currentBrightness)
        updateTVScreen(tvState);
        
        // End animation
        if (progress >= 1) {
            powerAnimation.isAnimating = false;
            powerAnimation.currentBrightness = powerAnimation.targetState ? 1.0 : 0.0;
            powerAnimation.scanLinePosition = 0;
            
            // Finalize LED state
            if (tvPowerLED && tvPowerLED.material) {
                const mat = tvPowerLED.material;
                if (powerAnimation.targetState) {
                    mat.color.setHex(0x00ff00);
                    if (mat.emissive) mat.emissive.setHex(0x00ff00);
                    if (mat.emissive !== undefined) mat.emissiveIntensity = 1.0;
                } else {
                    mat.color.setHex(0xff0000);
                    if (mat.emissive) mat.emissive.setHex(0xff0000);
                    if (mat.emissive !== undefined) mat.emissiveIntensity = 0.8;
                }
            }
            
            updateTVScreen(tvState);
            console.log(`Power animation complete: ${powerAnimation.targetState ? 'ON' : 'OFF'}`);
        }
    } else if (!powerAnimation.isAnimating && tvPowerLED && tvPowerLED.material) {
        // Update LED based on current state (when not animating)
        const mat = tvPowerLED.material;
        if (tvState.powered_on) {
            mat.color.setHex(0x00ff00);
            if (mat.emissive) mat.emissive.setHex(0x00ff00);
            if (mat.emissive !== undefined) mat.emissiveIntensity = 1.0;
        } else {
            mat.color.setHex(0xff0000);
            if (mat.emissive) mat.emissive.setHex(0xff0000);
            if (mat.emissive !== undefined) mat.emissiveIntensity = 0.8;
        }
    }
    
    // Enhanced channel change animation
    if (channelAnimation.isAnimating) {
        const elapsed = Date.now() - channelAnimation.startTime;
        const progress = Math.min(elapsed / channelAnimation.duration, 1);
        channelAnimation.slideProgress = progress;
        
        if (progress >= 1) {
            channelAnimation.isAnimating = false;
        }
        // Screen updates continuously during animation
        updateTVScreen(tvState);
    }
    
    // App switching animation - In-depth multi-phase animation
    if (appAnimation.isAnimating) {
        const elapsed = Date.now() - appAnimation.startTime;
        const progress = Math.min(elapsed / appAnimation.duration, 1);
        appAnimation.fadeProgress = progress;
        
        // Phase 1: Enhanced slide out old app (0-20%) with elastic ease
        if (progress < 0.2) {
            appAnimation.phase = 'slideOut';
            const phaseProgress = progress / 0.2;
            const eased = Easing.easeOutBack(phaseProgress); // Elastic back effect
            appAnimation.slideOffset = -eased * 512; // Slide left with bounce
            appAnimation.zoomScale = 1 - eased * 0.3; // Zoom out with bounce
        }
        // Phase 2: Enhanced loading screen with particles (20-50%)
        else if (progress < 0.5) {
            appAnimation.phase = 'loading';
            const phaseProgress = (progress - 0.2) / 0.3;
            const eased = Easing.easeInOutSine(phaseProgress); // Smooth sine curve
            appAnimation.loadingProgress = eased;
            appAnimation.slideOffset = -512; // Fully off screen
            appAnimation.zoomScale = 0.8;
            
            // Enhanced particle system with physics
            appAnimation.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravity effect
                p.opacity *= 0.985; // Slower fade
                p.size *= 0.998; // Shrinking particles
                
                // Bounce off edges
                if (p.x < 0 || p.x > 512) {
                    p.vx *= -0.8;
                    p.x = Math.max(0, Math.min(512, p.x));
                }
                if (p.y < 0 || p.y > 512) {
                    p.vy *= -0.8;
                    p.y = Math.max(0, Math.min(512, p.y));
                }
                
                // Add new particles during loading
                if (Math.random() > 0.95 && progress < 0.45) {
                    const appColor = getAppColor(appAnimation.newApp);
                    appAnimation.particles.push({
                        x: Math.random() * 512,
                        y: Math.random() * 512,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        opacity: 1,
                        size: Math.random() * 4 + 2,
                        color: appColor
                    });
                }
            });
        }
        // Phase 3: Enhanced logo animation with elastic bounce (50-75%)
        else if (progress < 0.75) {
            appAnimation.phase = 'logo';
            const phaseProgress = (progress - 0.5) / 0.25;
            // Logo scales in with elastic bounce
            const eased = Easing.easeOutElastic(phaseProgress);
            appAnimation.logoScale = eased;
            appAnimation.logoRotation = Easing.easeOutCubic(phaseProgress) * Math.PI * 2; // Smooth rotation
            appAnimation.logoOpacity = Math.min(1, Easing.easeOutSine(phaseProgress) * 1.2);
            appAnimation.loadingProgress = 1;
            appAnimation.slideOffset = 0;
            appAnimation.zoomScale = 0.8 + (eased * 0.2);
        }
        // Phase 4: Enhanced content fade in with smooth transition (75-100%)
        else {
            appAnimation.phase = 'content';
            const phaseProgress = (progress - 0.75) / 0.25;
            const eased = Easing.easeInOutSine(phaseProgress); // Smooth fade
            appAnimation.logoScale = 1;
            appAnimation.logoOpacity = 1 - eased; // Smooth fade out logo
            appAnimation.slideOffset = 0;
            appAnimation.zoomScale = 1;
        }
        
        if (progress >= 1) {
            appAnimation.isAnimating = false;
            appAnimation.phase = 'content';
            appAnimation.logoOpacity = 0;
            appAnimation.slideOffset = 0;
            appAnimation.zoomScale = 1;
            appAnimation.particles = []; // Clear particles
        }
        // Screen updates continuously during animation
        updateTVScreen(tvState);
    }
    
    // Enhanced volume change animation with smooth easing
    if (volumeAnimation.isAnimating) {
        const elapsed = Date.now() - volumeAnimation.startTime;
        const progress = Math.min(elapsed / volumeAnimation.duration, 1);
        const eased = Easing.easeOutCubic(progress);
        // Enhanced wave animation with multiple frequencies
        volumeAnimation.wavePhase = eased * Math.PI * 8;
        
        if (progress >= 1) {
            volumeAnimation.isAnimating = false;
        }
        // Screen updates continuously during animation
        updateTVScreen(tvState);
    }
    
    // HDMI input switching animation
    if (hdmiAnimation.isAnimating) {
        const elapsed = Date.now() - hdmiAnimation.startTime;
        const progress = Math.min(elapsed / hdmiAnimation.duration, 1);
        
        // Phase 1: Fade out old input (0-30%)
        if (progress < 0.3) {
            hdmiAnimation.fadeProgress = 1 - (progress / 0.3);
            hdmiAnimation.slideProgress = progress / 0.3;
        }
        // Phase 2: Enhanced HDMI logo with elastic bounce (30-60%)
        else if (progress < 0.6) {
            const phaseProgress = (progress - 0.3) / 0.3;
            hdmiAnimation.logoScale = Easing.easeOutElastic(phaseProgress); // Elastic bounce
            hdmiAnimation.fadeProgress = 0;
        }
        // Phase 3: Enhanced fade in new input with smooth transition (60-100%)
        else {
            const phaseProgress = (progress - 0.6) / 0.4;
            hdmiAnimation.fadeProgress = Easing.easeInOutSine(phaseProgress); // Smooth fade
            hdmiAnimation.logoScale = 1;
        }
        
        if (progress >= 1) {
            hdmiAnimation.isAnimating = false;
            hdmiAnimation.fadeProgress = 1;
            hdmiAnimation.logoScale = 1;
        }
        updateTVScreen(tvState);
    }
    
    // Channel overlay animation
    if (channelOverlay.visible) {
        const elapsed = Date.now() - channelOverlay.startTime;
        const progress = Math.min(elapsed / channelOverlay.duration, 1);
        
        if (progress < 0.2) {
            // Fade in and slide down
            const fadeProgress = progress / 0.2;
            channelOverlay.opacity = fadeProgress;
            channelOverlay.scale = 0.8 + (fadeProgress * 0.2);
            channelOverlay.slideY = -50 + (fadeProgress * 50);
        } else if (progress < 0.8) {
            // Visible
            channelOverlay.opacity = 1;
            channelOverlay.scale = 1;
            channelOverlay.slideY = 0;
        } else {
            // Fade out
            const fadeProgress = (progress - 0.8) / 0.2;
            channelOverlay.opacity = 1 - fadeProgress;
            channelOverlay.scale = 1 - (fadeProgress * 0.2);
            channelOverlay.slideY = fadeProgress * 50;
        }
        
        if (progress >= 1) {
            channelOverlay.visible = false;
        }
        updateTVScreen(tvState);
    }
    
    // Continuous screen updates during any animation
    if (powerAnimation.isAnimating || channelAnimation.isAnimating || 
        appAnimation.isAnimating || volumeAnimation.isAnimating ||
        hdmiAnimation.isAnimating || channelOverlay.visible) {
        updateTVScreen(tvState);
    }
    
    // Ensure screen updates continuously when TV is on (for time-based animations)
    // This ensures all content (TV shows, apps, etc.) is broadcast to the screen
    if (tvState && tvState.powered_on && !powerAnimation.isAnimating && screenMesh) {
        // Update screen periodically to keep time-based animations running
        // Use a throttled update (every ~16ms = ~60fps max, but we'll do it every frame for smoothness)
        updateTVScreen(tvState);
    }
    
    // Subtle TV glow effect when powered on (after animation)
    if (tvMesh && tvState.powered_on && !powerAnimation.isAnimating && screenMesh && screenMesh.material) {
        const time = Date.now() * 0.001;
        const glowIntensity = 0.05 + Math.sin(time * 2) * 0.03;
        // Maintain full brightness with subtle pulse
        screenMesh.material.emissiveIntensity = Math.min(1.0, 0.95 + glowIntensity);
        
        // Subtle bezel glow pulse
        if (tvFrame && tvFrame.material) {
            const bezelGlow = 0.08 + Math.sin(time * 1.5) * 0.02;
            tvFrame.material.emissiveIntensity = bezelGlow;
        }
        
        // TV ambient light breathing effect
        if (tvGlowLight) {
            const lightBreath = 0.8 + Math.sin(time * 1.2) * 0.1;
            tvGlowLight.intensity = lightBreath;
        }
    }
    
    // Animate button press feedback
    if (activeButton && Date.now() - buttonPressTime < 200) {
        const elapsed = Date.now() - buttonPressTime;
        const intensity = 1 - (elapsed / 200);
        activeButton.material.emissiveIntensity = intensity;
        activeButton.position.z = 0.03 - (intensity * 0.01);
    } else if (activeButton) {
        activeButton.material.emissive.setHex(0x000000);
        activeButton.material.emissiveIntensity = 0;
        activeButton.position.z = 0.03;
        activeButton = null;
    }
    
    // Subtle floating for remote
    if (remoteGroup) {
        const time = Date.now() * 0.001;
        remoteGroup.position.y = remoteLookClose.basePosition.y + Math.sin(time) * 0.02;
        remoteGroup.rotation.y = remoteLookClose.baseRotationY + Math.sin(time * 0.5) * 0.05;
    }
    
    // Animate particles
    if (window.animateParticles) {
        window.animateParticles();
    }
    
    // Update volume stabilizer (continuous monitoring)
    if (volumeStabilizer.enabled && tvState && tvState.powered_on && !tvState.muted) {
        // Check if volume needs stabilization
        const currentVol = tvState.volume;
        const stabilizedVol = applyVolumeStabilization(currentVol, tvState.current_app);
        
        // If volume is being stabilized, let smoothVolumeTransition handle it
        if (!volumeStabilizer.isStabilizing && Math.abs(stabilizedVol - currentVol) > 2) {
            // Volume spike detected, start stabilization
            console.log(`[Volume Stabilizer] Spike detected: ${currentVol}% -> stabilizing to ${stabilizedVol}%`);
            stabilizeVolumeOnAppSwitch(tvState.current_app, tvState.current_app, currentVol);
        }
    }
    
    renderer.render(scene, camera);
}

// Add ambient effects for immersion
function addAmbientEffects() {
    // Add subtle particles/dust in the air
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 20;
        positions[i + 1] = Math.random() * 10;
        positions[i + 2] = (Math.random() - 0.5) * 20;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.05,
        transparent: true,
        opacity: 0.3
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Animate particles
    function animateParticles() {
        const positions = particles.attributes.position.array;
        for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 0.01;
            if (positions[i] < 0) {
                positions[i] = 10;
            }
        }
        particles.attributes.position.needsUpdate = true;
    }
    
    window.animateParticles = animateParticles;
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

// Initialize everything
window.addEventListener('DOMContentLoaded', () => {
    // Initialize scene first
    initScene();
    
    // Then initialize socket connection
    initSocket();
    
    // Initialize screen with default state after a short delay to ensure everything is loaded
    setTimeout(() => {
        if (screenMesh) {
            // Use default state if tvState is empty
            const defaultState = {
                powered_on: false,
                volume: 50,
                channel: 1,
                muted: false,
                current_app: 'Home',
                channel_input: ''
            };
            const initialState = Object.keys(tvState).length > 0 ? tvState : defaultState;
            updateTVScreen(initialState);
            console.log('Initial screen texture applied');
        } else {
            console.warn('Screen mesh not available for initial update');
        }
    }, 200);
});
