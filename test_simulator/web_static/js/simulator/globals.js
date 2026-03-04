/**
 * TV Simulator – globals, state objects, channel lineup (tvShows).
 * Load first. No dependencies.
 */
let scene, camera, renderer, controls;
let tvMesh, screenMesh, roomGroup, remoteMesh, remoteGroup, handGroup, armGroup, firstPersonHolder;
let firstPersonMode = false;
let tvFrame, tvPowerLED, tvGlowLight;
let tvState = {};
// Room automation refs (set by scene.js; used by updateRoomState)
let roomLights = { ceiling: null, lamp_left: null, lamp_right: null };
let smartDevicesGroup = null;
let roomDeviceRefs = { plug1: null, speaker: null, ambientStrip: null };
let roomState = { scene: 'default', lights_main: 100, lights_lamp_left: 100, lights_lamp_right: 100, smart_plug_1: true, smart_speaker: true, ambient_strip: true };
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

// Remote style: 'handheld' (physical remote) or 'digital' (flat screen / tablet remote)
let currentRemoteStyle = 'handheld';

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
    // Revolutionary mode: glitch, chromatic aberration, VHS wobble (channel 0 or when enabled)
    revolutionaryMode: false,
    revolutionaryPhase: 0,
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

// Programmed channel lineup (1-99 explicit; 100-999 use default). Used for live TV display.
let tvShows = {
    // News & info (1-5)
    1: { name: 'Morning News', type: 'news', genre: 'News', color: { r: 200, g: 200, b: 255 } },
    2: { name: 'Evening News', type: 'news', genre: 'News', color: { r: 150, g: 150, b: 200 } },
    3: { name: 'Breaking News', type: 'news', genre: 'News', color: { r: 255, g: 100, b: 100 } },
    4: { name: 'Weather Channel', type: 'weather', genre: 'Weather', color: { r: 100, g: 200, b: 255 } },
    5: { name: 'Business Report', type: 'news', genre: 'Business', color: { r: 255, g: 200, b: 100 } },
    // Creative / variety (6-15)
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
    // More creative (16-20)
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
    26: { name: 'Hockey Night', type: 'sports', genre: 'Sports', color: { r: 200, g: 220, b: 240 } },
    27: { name: 'Golf Channel', type: 'sports', genre: 'Sports', color: { r: 0, g: 180, b: 100 } },
    28: { name: 'MMA Fights', type: 'sports', genre: 'Sports', color: { r: 180, g: 80, b: 80 } },
    29: { name: 'Racing Live', type: 'sports', genre: 'Sports', color: { r: 255, g: 50, b: 50 } },
    30: { name: 'Olympic Channel', type: 'sports', genre: 'Sports', color: { r: 255, g: 215, b: 0 } },
    // Movies (31-40)
    31: { name: 'Action Movie', type: 'movie', genre: 'Action', color: { r: 255, g: 50, b: 50 } },
    32: { name: 'Sci-Fi Film', type: 'movie', genre: 'Sci-Fi', color: { r: 100, g: 100, b: 255 } },
    33: { name: 'Comedy Special', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 200, b: 0 } },
    34: { name: 'Horror Night', type: 'horror', genre: 'Horror', color: { r: 50, g: 0, b: 0 } },
    35: { name: 'Romance Film', type: 'romance', genre: 'Romance', color: { r: 255, g: 150, b: 200 } },
    36: { name: 'Western Channel', type: 'movie', genre: 'Western', color: { r: 180, g: 140, b: 80 } },
    37: { name: 'Documentary Hour', type: 'documentary', genre: 'Documentary', color: { r: 100, g: 120, b: 140 } },
    38: { name: 'Thriller Night', type: 'drama', genre: 'Thriller', color: { r: 80, g: 80, b: 120 } },
    39: { name: 'Indie Films', type: 'movie', genre: 'Indie', color: { r: 150, g: 130, b: 180 } },
    40: { name: 'Classic Cinema', type: 'movie', genre: 'Classic', color: { r: 200, g: 180, b: 150 } },
    // Kids & family (41-50)
    41: { name: 'Cartoon Network', type: 'cartoon', genre: 'Kids', color: { r: 255, g: 200, b: 100 } },
    42: { name: 'Disney Channel', type: 'cartoon', genre: 'Kids', color: { r: 100, g: 200, b: 255 } },
    43: { name: 'Nickelodeon', type: 'cartoon', genre: 'Kids', color: { r: 255, g: 100, b: 100 } },
    44: { name: 'PBS Kids', type: 'educational', genre: 'Educational', color: { r: 100, g: 255, b: 100 } },
    45: { name: 'Animal Planet', type: 'documentary', genre: 'Nature', color: { r: 100, g: 200, b: 100 } },
    46: { name: 'Discovery Kids', type: 'documentary', genre: 'Educational', color: { r: 0, g: 160, b: 180 } },
    47: { name: 'Boomerang', type: 'cartoon', genre: 'Kids', color: { r: 255, g: 180, b: 80 } },
    48: { name: 'Universal Kids', type: 'cartoon', genre: 'Kids', color: { r: 100, g: 180, b: 255 } },
    49: { name: 'Family Movie', type: 'movie', genre: 'Family', color: { r: 255, g: 220, b: 180 } },
    50: { name: 'Nature Kids', type: 'documentary', genre: 'Nature', color: { r: 80, g: 200, b: 120 } },
    // Music (51-60)
    51: { name: 'MTV', type: 'music', genre: 'Music', color: { r: 255, g: 0, b: 100 } },
    52: { name: 'VH1', type: 'music', genre: 'Music', color: { r: 200, g: 100, b: 255 } },
    53: { name: 'Classic Rock', type: 'music', genre: 'Music', color: { r: 150, g: 100, b: 50 } },
    54: { name: 'Jazz Channel', type: 'music', genre: 'Music', color: { r: 100, g: 150, b: 200 } },
    55: { name: 'Country Music', type: 'music', genre: 'Music', color: { r: 255, g: 200, b: 150 } },
    56: { name: 'Hip Hop Nation', type: 'music', genre: 'Music', color: { r: 255, g: 100, b: 150 } },
    57: { name: 'Latin Beats', type: 'music', genre: 'Music', color: { r: 255, g: 180, b: 0 } },
    58: { name: 'Electronic Dance', type: 'music', genre: 'Music', color: { r: 150, g: 50, b: 255 } },
    59: { name: 'Acoustic Live', type: 'music', genre: 'Music', color: { r: 200, g: 160, b: 120 } },
    60: { name: 'Pop Hits', type: 'music', genre: 'Music', color: { r: 255, g: 100, b: 200 } },
    // Drama & series (61-70)
    61: { name: 'Drama Central', type: 'drama', genre: 'Drama', color: { r: 120, g: 80, b: 140 } },
    62: { name: 'Crime & Mystery', type: 'drama', genre: 'Drama', color: { r: 80, g: 80, b: 100 } },
    63: { name: 'Soap Opera', type: 'drama', genre: 'Drama', color: { r: 255, g: 200, b: 220 } },
    64: { name: 'Legal Drama', type: 'drama', genre: 'Drama', color: { r: 180, g: 160, b: 200 } },
    65: { name: 'Medical Drama', type: 'drama', genre: 'Drama', color: { r: 200, g: 230, b: 255 } },
    66: { name: 'Political Thriller', type: 'drama', genre: 'Drama', color: { r: 100, g: 80, b: 80 } },
    67: { name: 'Period Drama', type: 'drama', genre: 'Drama', color: { r: 200, g: 180, b: 150 } },
    68: { name: 'Anthology Series', type: 'drama', genre: 'Drama', color: { r: 140, g: 120, b: 160 } },
    69: { name: 'Limited Series', type: 'drama', genre: 'Drama', color: { r: 160, g: 140, b: 180 } },
    70: { name: 'Prime Time Drama', type: 'drama', genre: 'Drama', color: { r: 100, g: 100, b: 140 } },
    // News & info continued (71-80)
    71: { name: 'World News', type: 'news', genre: 'News', color: { r: 180, g: 180, b: 255 } },
    72: { name: 'Local News', type: 'news', genre: 'News', color: { r: 200, g: 220, b: 255 } },
    73: { name: 'Politics Today', type: 'news', genre: 'News', color: { r: 150, g: 150, b: 180 } },
    74: { name: 'Tech News', type: 'news', genre: 'News', color: { r: 100, g: 200, b: 255 } },
    75: { name: 'Sports News', type: 'news', genre: 'News', color: { r: 200, g: 255, b: 200 } },
    76: { name: 'Entertainment Tonight', type: 'news', genre: 'News', color: { r: 255, g: 200, b: 220 } },
    77: { name: 'Traffic & Weather', type: 'weather', genre: 'Weather', color: { r: 150, g: 210, b: 255 } },
    78: { name: 'Science Now', type: 'documentary', genre: 'Documentary', color: { r: 100, g: 180, b: 220 } },
    79: { name: 'History Channel', type: 'documentary', genre: 'History', color: { r: 180, g: 150, b: 120 } },
    80: { name: 'Travel Channel', type: 'documentary', genre: 'Travel', color: { r: 255, g: 220, b: 180 } },
    // Variety (81-99)
    81: { name: 'Reality TV', type: 'comedy', genre: 'Reality', color: { r: 255, g: 180, b: 200 } },
    82: { name: 'Game Show Network', type: 'comedy', genre: 'Game Show', color: { r: 255, g: 255, b: 100 } },
    83: { name: 'Talk Show Central', type: 'comedy', genre: 'Talk', color: { r: 255, g: 230, b: 200 } },
    84: { name: 'Food Network', type: 'documentary', genre: 'Food', color: { r: 255, g: 120, b: 80 } },
    85: { name: 'Home & Garden', type: 'documentary', genre: 'Lifestyle', color: { r: 180, g: 220, b: 160 } },
    86: { name: 'DIY Channel', type: 'documentary', genre: 'Lifestyle', color: { r: 200, g: 160, b: 100 } },
    87: { name: 'True Crime', type: 'documentary', genre: 'Documentary', color: { r: 100, g: 80, b: 80 } },
    88: { name: 'Comedy Central', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 200, b: 0 } },
    89: { name: 'Stand-Up Hour', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 220, b: 150 } },
    90: { name: 'Sketch Comedy', type: 'comedy', genre: 'Comedy', color: { r: 255, g: 180, b: 100 } },
    91: { name: 'Late Night', type: 'comedy', genre: 'Talk', color: { r: 80, g: 80, b: 120 } },
    92: { name: 'Daytime Talk', type: 'comedy', genre: 'Talk', color: { r: 255, g: 240, b: 220 } },
    93: { name: 'Court TV', type: 'drama', genre: 'Reality', color: { r: 180, g: 160, b: 200 } },
    94: { name: 'Faith & Family', type: 'drama', genre: 'Family', color: { r: 220, g: 220, b: 255 } },
    95: { name: 'Shopping Network', type: 'general', genre: 'Shopping', color: { r: 255, g: 100, b: 150 } },
    96: { name: 'C-SPAN', type: 'news', genre: 'News', color: { r: 100, g: 100, b: 140 } },
    97: { name: 'C-SPAN 2', type: 'news', genre: 'News', color: { r: 120, g: 120, b: 160 } },
    98: { name: 'Public Access', type: 'general', genre: 'Local', color: { r: 150, g: 150, b: 180 } },
    99: { name: 'Test Pattern', type: 'general', genre: 'Utility', color: { r: 200, g: 200, b: 200 } },
    // Channel 0: Reality Breach – fourth-wall, glitch, "revolutionary" mode
    0: { name: 'Reality Breach', type: 'revolutionary', genre: '???', color: { r: 255, g: 0, b: 255 } },
    // Fallback for 100-999
    default: { name: 'TV Channel', type: 'general', genre: 'General', color: { r: 100, g: 100, b: 150 } }
};

// Get TV show for channel
function getTVShow(channel) {
    if (channel == null || typeof channel === 'undefined') return tvShows.default;
    const c = parseInt(channel, 10);
    return tvShows[c] || tvShows.default;
}