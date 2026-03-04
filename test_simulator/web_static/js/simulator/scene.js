/**
 * TV Simulator – Three.js scene, room, TV, remote, hand.
 * Depends: globals.
 */
// Default graphics preset (used when server does not send GPU-based preset)
var DEFAULT_GRAPHICS_PRESET = {
    antialias: true,
    shadowMapEnabled: true,
    shadowMapType: 'PCFSoftShadowMap',
    shadowMapSize: 4096,
    shadowRadius: 2,
    castShadow: true,
    toneMappingExposure: 1.05,
    pixelRatio: 1.0,
    floorTextureWidth: 512,
    floorTextureHeight: 256,
    wallTextureSize: 256,
    ceilingTextureSize: 128,
    fogFar: 42,
    ambientParticleCount: 100
};

// Read numeric preset value (allows 0 so SIM_SAFE / LOW tiers apply correctly)
function presetNum(preset, key, defaultVal) {
    var v = preset[key];
    if (typeof v === 'number' && !isNaN(v)) return v;
    var n = parseInt(v, 10);
    return (n === n) ? n : defaultVal;
}

// Initialize Three.js scene (uses window.GRAPHICS_PRESET from server when available)
function initScene() {
    const container = document.getElementById('canvas-container');
    var preset = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET) ? window.GRAPHICS_PRESET : DEFAULT_GRAPHICS_PRESET;

    // Scene - futuristic smart home (cool, tech)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141c28);
    var fogFar = presetNum(preset, 'fogFar', 42);
    scene.fog = new THREE.Fog(0x1a2438, 12, Math.max(10, fogFar));

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1.5, 5);

    // Renderer - quality from GPU tier preset
    var antialias = preset.antialias !== false;
    renderer = new THREE.WebGLRenderer({ antialias: antialias, alpha: false });
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    renderer.setSize(w, h);
    var pixelRatio = presetNum(preset, 'pixelRatio', 1.0);
    if (pixelRatio > 0) {
        var deviceRatio = window.devicePixelRatio || 1;
        renderer.setPixelRatio(Math.min(deviceRatio, pixelRatio));
    }
    renderer.shadowMap.enabled = preset.shadowMapEnabled === true;
    var shadowType = preset.shadowMapType || 'PCFSoftShadowMap';
    renderer.shadowMap.type = THREE[shadowType] !== undefined ? THREE[shadowType] : THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = Math.max(0.1, presetNum(preset, 'toneMappingExposure', 1.05));
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Lights - futuristic smart room (cool white + subtle blue fill)
    const ambientLight = new THREE.AmbientLight(0xc8d8f0, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xe8f0ff, 1.0);
    mainLight.position.set(6, 11, 4);
    mainLight.castShadow = preset.castShadow === true;
    var mapSize = Math.max(256, Math.min(8192, presetNum(preset, 'shadowMapSize', 4096)));
    mainLight.shadow.mapSize.width = mapSize;
    mainLight.shadow.mapSize.height = mapSize;
    mainLight.shadow.bias = -0.00015;
    mainLight.shadow.normalBias = 0.02;
    if (mainLight.shadow.radius !== undefined) mainLight.shadow.radius = Math.max(0, presetNum(preset, 'shadowRadius', 2));
    const shadowCam = mainLight.shadow.camera;
    shadowCam.left = -14;
    shadowCam.right = 14;
    shadowCam.top = 14;
    shadowCam.bottom = -14;
    shadowCam.near = 0.5;
    shadowCam.far = 55;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xd0e0f8, 0.45);
    fillLight.position.set(-6, 5, -4);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xa0c0ff, 0.25);
    rimLight.position.set(0, 6, -12);
    scene.add(rimLight);
    
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

    // Expose preset to runtime (for resize and UI)
    window._graphicsPresetTier = preset._tier || 'MEDIUM';
    window._graphicsPresetGpu = preset._gpu_name || null;
    if (document.getElementById('graphics-tier')) {
        var label = preset._tier || 'MEDIUM';
        if (preset._gpu_name) label += ' (' + (preset._gpu_name.length > 20 ? preset._gpu_name.substring(0, 17) + '…' : preset._gpu_name) + ')';
        document.getElementById('graphics-tier').textContent = label;
    }
    console.log('[TV Simulator] Graphics preset applied: tier=' + (preset._tier || 'MEDIUM') + (preset._gpu_name ? ' gpu=' + preset._gpu_name : ' (no GPU detected)'));

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Create room environment - full living room (texture sizes from GPU preset)
function createRoom() {
    var preset = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET) ? window.GRAPHICS_PRESET : DEFAULT_GRAPHICS_PRESET;
    var floorW = Math.max(64, presetNum(preset, 'floorTextureWidth', 512));
    var floorH = Math.max(32, presetNum(preset, 'floorTextureHeight', 256));
    var wallSize = Math.max(32, presetNum(preset, 'wallTextureSize', 256));
    var ceilingSize = Math.max(16, presetNum(preset, 'ceilingTextureSize', 128));
    var castShadow = preset.castShadow === true;

    roomGroup = new THREE.Group();

    // --- Floor: real wood plank style (horizontal strips, full width) ---
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorW;
    floorCanvas.height = floorH;
    const floorCtx = floorCanvas.getContext('2d');
    // Futuristic floor: dark slate with subtle tech grid
    floorCtx.fillStyle = '#2a3038';
    floorCtx.fillRect(0, 0, floorW, floorH);
    for (let g = 0; g < floorW; g += 32) {
        floorCtx.strokeStyle = 'rgba(80,100,140,0.15)';
        floorCtx.lineWidth = 1;
        floorCtx.beginPath();
        floorCtx.moveTo(g, 0);
        floorCtx.lineTo(g, floorH);
        floorCtx.stroke();
    }
    for (let g = 0; g < floorH; g += 24) {
        floorCtx.beginPath();
        floorCtx.moveTo(0, g);
        floorCtx.lineTo(floorW, g);
        floorCtx.stroke();
    }
    for (let py = 0; py < floorH; py += 4) {
        for (let px = 0; px < floorW; px += 4) {
            if (Math.random() < 0.03) {
                floorCtx.fillStyle = 'rgba(120,160,220,0.08)';
                floorCtx.fillRect(px, py, 2, 2);
            }
        }
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 3);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        roughness: 0.7,
        metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = castShadow;
    roomGroup.add(floor);

    // --- Walls: real paint look - subtle gradient (slightly lighter at top) + texture ---
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = wallSize;
    wallCanvas.height = wallSize;
    const wallCtx = wallCanvas.getContext('2d');
    // Futuristic smart room: slate blue-gray walls
    const wallGrad = wallCtx.createLinearGradient(0, 0, 0, wallSize);
    wallGrad.addColorStop(0, '#c8d4dc');
    wallGrad.addColorStop(0.5, '#b8c4cc');
    wallGrad.addColorStop(1, '#a8b4bc');
    wallCtx.fillStyle = wallGrad;
    wallCtx.fillRect(0, 0, wallSize, wallSize);
    for (let i = 0; i < Math.min(400, wallSize * wallSize / 160); i++) {
        wallCtx.fillStyle = `rgba(200,210,220,${0.02 + Math.random() * 0.04})`;
        wallCtx.fillRect(Math.random() * wallSize, Math.random() * wallSize, 2, 2);
    }
    // Subtle tech line (horizontal strip)
    wallCtx.strokeStyle = 'rgba(100,140,180,0.12)';
    wallCtx.lineWidth = 1;
    for (let row = 1; row <= 4; row++) {
        wallCtx.beginPath();
        wallCtx.moveTo(0, (wallSize / 5) * row);
        wallCtx.lineTo(wallSize, (wallSize / 5) * row);
        wallCtx.stroke();
    }
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        roughness: 0.94,
        metalness: 0
    });
    const wallGeometry = new THREE.PlaneGeometry(20, 10);
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -10;
    backWall.position.y = 5;
    backWall.receiveShadow = castShadow;
    roomGroup.add(backWall);

    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -10;
    leftWall.position.y = 5;
    leftWall.receiveShadow = castShadow;
    roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(wallGeometry, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 10;
    rightWall.position.y = 5;
    rightWall.receiveShadow = castShadow;
    roomGroup.add(rightWall);

    // --- Window (right wall): frame, sill, glass, curtains ---
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.6 });
    const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 1.85, 0.08),
        windowFrameMat
    );
    windowFrame.position.set(9.96, 4.5, -4);
    windowFrame.castShadow = true;
    roomGroup.add(windowFrame);
    const windowSill = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.06, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.7 })
    );
    windowSill.position.set(9.96, 3.52, -3.9);
    windowSill.castShadow = true;
    roomGroup.add(windowSill);
    const windowGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(2.05, 1.65),
        new THREE.MeshStandardMaterial({
            color: 0x90b8e8,
            transparent: true,
            opacity: 0.55,
            roughness: 0.06,
            metalness: 0.05
        })
    );
    windowGlass.position.set(9.96, 4.5, -3.96);
    roomGroup.add(windowGlass);
    const curtainMat = new THREE.MeshStandardMaterial({
        color: 0xebe2d4,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const curtainL = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), curtainMat);
    curtainL.position.set(8.75, 4.5, -3.98);
    curtainL.castShadow = true;
    roomGroup.add(curtainL);
    const curtainR = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), curtainMat);
    curtainR.position.set(11.17, 4.5, -3.98);
    curtainR.castShadow = true;
    roomGroup.add(curtainR);
    const windowLight = new THREE.DirectionalLight(0xb0d0ee, 0.26);
    windowLight.position.set(14, 4.5, -4);
    scene.add(windowLight);

    // --- Ceiling: soft warm white (slightly textured) ---
    const ceilingCanvas = document.createElement('canvas');
    ceilingCanvas.width = ceilingSize;
    ceilingCanvas.height = ceilingSize;
    const ceilingCtx = ceilingCanvas.getContext('2d');
    // Futuristic ceiling: cool light gray
    ceilingCtx.fillStyle = '#dce4ec';
    ceilingCtx.fillRect(0, 0, ceilingSize, ceilingSize);
    for (let i = 0; i < Math.min(80, ceilingSize * ceilingSize / 200); i++) {
        ceilingCtx.fillStyle = `rgba(220,228,238,${0.02 + Math.random() * 0.03})`;
        ceilingCtx.fillRect(Math.random() * ceilingSize, Math.random() * ceilingSize, 1, 1);
    }
    const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas);
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(3, 3);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: ceilingTexture,
        roughness: 0.88
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 10;
    roomGroup.add(ceiling);

    // --- Baseboards (futuristic dark metallic) ---
    const baseboardGeom = new THREE.BoxGeometry(20.2, 0.15, 0.1);
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.5, roughness: 0.4 });
    const baseBack = new THREE.Mesh(baseboardGeom, baseboardMat);
    baseBack.position.set(0, 0.075, -9.95);
    roomGroup.add(baseBack);
    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 20.2), baseboardMat);
    baseLeft.position.set(-9.95, 0.075, 0);
    roomGroup.add(baseLeft);
    const baseRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 20.2), baseboardMat);
    baseRight.position.set(9.95, 0.075, 0);
    roomGroup.add(baseRight);

    // --- Wall outlet (back wall, behind console - lived-in detail) ---
    const outletPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    );
    outletPlate.position.set(0.6, 0.35, -9.98);
    roomGroup.add(outletPlate);
    const outletSlot1 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    outletSlot1.position.set(0.6, 0.35, -9.97);
    roomGroup.add(outletSlot1);
    const outletSlot2 = outletSlot1.clone();
    outletSlot2.position.set(0.66, 0.35, -9.97);
    roomGroup.add(outletSlot2);

    // --- Area rug: under sofa front + coffee table (real placement) ---
    const rugGeometry = new THREE.PlaneGeometry(5.5, 4);
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 256;
    rugCanvas.height = 256;
    const rugCtx = rugCanvas.getContext('2d');
    rugCtx.fillStyle = '#1a2028';
    rugCtx.fillRect(0, 0, 256, 256);
    rugCtx.strokeStyle = 'rgba(60,100,160,0.4)';
    rugCtx.lineWidth = 4;
    rugCtx.strokeRect(6, 6, 244, 244);
    // Subtle hex / tech pattern
    for (let i = 0; i < 256; i += 24) {
        for (let j = 0; j < 256; j += 20) {
            rugCtx.fillStyle = 'rgba(50,80,120,0.12)';
            rugCtx.beginPath();
            rugCtx.arc(i + (j / 20) % 2 * 12, j, 3, 0, Math.PI * 2);
            rugCtx.fill();
        }
    }
    const rugTexture = new THREE.CanvasTexture(rugCanvas);
    const rugMat = new THREE.MeshStandardMaterial({
        map: rugTexture,
        roughness: 0.85,
        metalness: 0.06
    });
    const rug = new THREE.Mesh(rugGeometry, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.006, -2.15);
    rug.receiveShadow = true;
    roomGroup.add(rug);

    // --- Sofa (futuristic slate-gray, facing TV) ---
    const sofaBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.42, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.75, metalness: 0.08 })
    );
    sofaBase.position.set(0, 0.21, -2.55);
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    roomGroup.add(sofaBase);
    const sofaBack = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.9, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x353d48, roughness: 0.72, metalness: 0.06 })
    );
    sofaBack.position.set(0, 0.66, -2.55);
    sofaBack.castShadow = true;
    roomGroup.add(sofaBack);
    const sofaCushion = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.18, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x404858, roughness: 0.8, metalness: 0.04 })
    );
    sofaCushion.position.set(0, 0.525, -2.55);
    sofaCushion.castShadow = true;
    roomGroup.add(sofaCushion);
    const armL = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.52, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x383e48, roughness: 0.75, metalness: 0.06 })
    );
    armL.position.set(-1.28, 0.48, -2.55);
    armL.castShadow = true;
    roomGroup.add(armL);
    const armR = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.52, 1.15),
        new THREE.MeshStandardMaterial({ color: 0x383e48, roughness: 0.75, metalness: 0.06 })
    );
    armR.position.set(1.28, 0.48, -2.55);
    armR.castShadow = true;
    roomGroup.add(armR);

    // --- Coffee table (sleek dark, in front of sofa) ---
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.06, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.3, metalness: 0.15 })
    );
    tableTop.position.set(0, 0.39, -1.95);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    roomGroup.add(tableTop);
    const tableLegGeom = new THREE.BoxGeometry(0.055, 0.33, 0.055);
    const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x252c38, roughness: 0.45, metalness: 0.2 });
    [[-0.65, 0.2], [0.65, 0.2], [-0.65, -0.2], [0.65, -0.2]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(tableLegGeom, tableLegMat);
        leg.position.set(x, 0.195, -1.95 + z);
        leg.castShadow = true;
        roomGroup.add(leg);
    });
    // Coffee table props: mug, book, remote
    const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.035, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.6 })
    );
    mug.position.set(-0.22, 0.435, -1.95);
    mug.castShadow = true;
    roomGroup.add(mug);
    const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.03, 0.008, 8, 16, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.6 })
    );
    mugHandle.rotation.x = Math.PI / 2;
    mugHandle.position.set(-0.17, 0.435, -1.95);
    roomGroup.add(mugHandle);
    const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.028, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 })
    );
    book.position.set(0.28, 0.42, -2.08);
    book.rotation.y = -0.25;
    book.castShadow = true;
    roomGroup.add(book);
    const remoteProp = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.022, 0.038),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    remoteProp.position.set(0.12, 0.418, -1.82);
    remoteProp.rotation.y = 0.4;
    remoteProp.castShadow = true;
    roomGroup.add(remoteProp);

    // --- Side table + lamp (left of sofa) ---
    const sideTableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.35, 0.035, 24),
        new THREE.MeshStandardMaterial({ color: 0x222830, roughness: 0.45, metalness: 0.12 })
    );
    sideTableTop.position.set(-2.25, 0.5, -2.55);
    sideTableTop.castShadow = true;
    roomGroup.add(sideTableTop);
    const sideTableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.48, 12),
        new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.5, metalness: 0.15 })
    );
    sideTableLeg.position.set(-2.25, 0.25, -2.55);
    sideTableLeg.castShadow = true;
    roomGroup.add(sideTableLeg);
    // Lamp
    const lampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.3 })
    );
    lampBase.position.set(-2.25, 0.54, -2.55);
    roomGroup.add(lampBase);
    const lampPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.48, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.4 })
    );
    lampPole.position.set(-2.25, 0.79, -2.55);
    roomGroup.add(lampPole);
    const lampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.2, 16, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xe8ecf0,
            side: THREE.DoubleSide,
            roughness: 0.88,
            emissive: 0xc0d8ff,
            emissiveIntensity: 0.15
        })
    );
    lampShade.position.set(-2.25, 0.99, -2.55);
    lampShade.castShadow = true;
    roomGroup.add(lampShade);
    const lampLight = new THREE.PointLight(0xffeedd, 0.45, 4.5);
    lampLight.position.set(-2.25, 1.0, -2.55);
    scene.add(lampLight);
    if (typeof roomLights !== 'undefined') roomLights.lamp_left = lampLight;
    // Side table props: coaster, small book
    const coaster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
    );
    coaster.position.set(-2.25, 0.525, -2.52);
    roomGroup.add(coaster);
    const sideBook = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.85 })
    );
    sideBook.position.set(-2.38, 0.535, -2.58);
    sideBook.rotation.y = 0.6;
    sideBook.castShadow = true;
    roomGroup.add(sideBook);

    // --- Floor lamp (right side) ---
    const floorLampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x252525, metalness: 0.5, roughness: 0.4 })
    );
    floorLampBase.position.set(3.5, 0.02, -3);
    floorLampBase.castShadow = true;
    roomGroup.add(floorLampBase);
    const floorLampPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.4, roughness: 0.5 })
    );
    floorLampPole.position.set(3.5, 0.74, -3);
    roomGroup.add(floorLampPole);
    const floorLampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.25, 16, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xe0e8f0,
            side: THREE.DoubleSide,
            roughness: 0.88,
            emissive: 0xb0c8f0,
            emissiveIntensity: 0.14
        })
    );
    floorLampShade.position.set(3.5, 1.45, -3);
    floorLampShade.castShadow = true;
    roomGroup.add(floorLampShade);
    const floorLampLight = new THREE.PointLight(0xffeedd, 0.4, 5.5);
    floorLampLight.position.set(3.5, 1.4, -3);
    scene.add(floorLampLight);
    if (typeof roomLights !== 'undefined') roomLights.lamp_right = floorLampLight;

    // --- Potted plants (full foliage) ---
    function addPlant(x, z, scale) {
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 * scale, 0.18 * scale, 0.25 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x9c5c2e, roughness: 0.82 })
        );
        pot.position.set(x, 0.125 * scale, z);
        pot.castShadow = true;
        roomGroup.add(pot);
        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.04 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.95 })
        );
        soil.position.set(x, 0.27 * scale, z);
        roomGroup.add(soil);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5c28, roughness: 0.88 });
        const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x387238, roughness: 0.88 });
        const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 10, 10), leafMat);
        foliage1.position.set(x, 0.55 * scale, z);
        foliage1.castShadow = true;
        roomGroup.add(foliage1);
        const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 8, 8), leafMat2);
        foliage2.position.set(x + 0.15 * scale, 0.45 * scale, z - 0.1 * scale);
        foliage2.castShadow = true;
        roomGroup.add(foliage2);
        const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 8, 8), leafMat2);
        foliage3.position.set(x - 0.1 * scale, 0.5 * scale, z + 0.12 * scale);
        foliage3.castShadow = true;
        roomGroup.add(foliage3);
    }
    addPlant(2.8, -4.2, 0.9);
    addPlant(-3, -3.8, 0.7);

    // --- Wall art (back wall) with drawn canvas textures ---
    function makeArtTexture(w, h, draw) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        draw(ctx, w, h);
        return new THREE.CanvasTexture(c);
    }
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.68 });
    const frameGeom = new THREE.PlaneGeometry(1.0, 0.7);
    const artGeom = new THREE.PlaneGeometry(0.9, 0.6);
    const artLeft = new THREE.Group();
    const texLeft = makeArtTexture(180, 120, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#2a4a5a');
        g.addColorStop(0.5, '#3d6b7a');
        g.addColorStop(1, '#1e3a48');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#5a8a9a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(w * 0.2 + i * 12, h * 0.8);
            ctx.lineTo(w * 0.5 + i * 6, h * 0.2);
            ctx.lineTo(w * 0.8 - i * 5, h * 0.6);
            ctx.stroke();
        }
    });
    const imgL = new THREE.Mesh(artGeom, new THREE.MeshStandardMaterial({ map: texLeft, roughness: 0.9 }));
    imgL.position.z = 0.01;
    artLeft.add(new THREE.Mesh(frameGeom, frameMat));
    artLeft.add(imgL);
    artLeft.position.set(-4, 4.2, -9.99);
    roomGroup.add(artLeft);
    const artRight = new THREE.Group();
    const texRight = makeArtTexture(180, 120, (ctx, w, h) => {
        ctx.fillStyle = '#4a3d2a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#6b5a42';
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w * 0.35, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d3220';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Abstract', w / 2, h / 2 + 4);
    });
    const imgR = new THREE.Mesh(artGeom, new THREE.MeshStandardMaterial({ map: texRight, roughness: 0.9 }));
    imgR.position.z = 0.01;
    artRight.add(new THREE.Mesh(frameGeom, frameMat));
    artRight.add(imgR);
    artRight.position.set(4, 4.0, -9.99);
    roomGroup.add(artRight);
    const artSmall = new THREE.Group();
    const texSmall = makeArtTexture(90, 70, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#5c4033');
        g.addColorStop(1, '#3d2817');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(w * 0.2, h * 0.3, w * 0.6, h * 0.15);
        ctx.fillRect(w * 0.3, h * 0.55, w * 0.5, h * 0.12);
    });
    const frameS = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.45), frameMat);
    const imgS = new THREE.Mesh(
        new THREE.PlaneGeometry(0.45, 0.35),
        new THREE.MeshStandardMaterial({ map: texSmall, roughness: 0.9 })
    );
    imgS.position.z = 0.01;
    artSmall.add(frameS);
    artSmall.add(imgS);
    artSmall.position.set(-5.5, 5.5, -9.99);
    roomGroup.add(artSmall);

    // --- Shelf under TV (media console, futuristic dark) ---
    const consoleTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.08, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x181e28, roughness: 0.4, metalness: 0.2 })
    );
    consoleTop.position.set(0, 0.44, -8);
    consoleTop.castShadow = true;
    roomGroup.add(consoleTop);
    const consoleBody = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.36, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.5, metalness: 0.15 })
    );
    consoleBody.position.set(0, 0.22, -8);
    consoleBody.castShadow = true;
    roomGroup.add(consoleBody);
    const setTopBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    setTopBox.position.set(-0.5, 0.47, -8);
    setTopBox.castShadow = true;
    roomGroup.add(setTopBox);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.5 });
    const speakerL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), speakerMat);
    speakerL.position.set(-1.1, 0.455, -8);
    speakerL.castShadow = true;
    roomGroup.add(speakerL);
    const speakerR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), speakerMat);
    speakerR.position.set(1.1, 0.455, -8);
    speakerR.castShadow = true;
    roomGroup.add(speakerR);
    const consoleBook = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.04, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 })
    );
    consoleBook.position.set(0.4, 0.46, -8);
    consoleBook.rotation.y = 0.2;
    consoleBook.castShadow = true;
    roomGroup.add(consoleBook);

    // --- Sofa cushions (two pillows) ---
    const throwPillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.12, 0.45),
        new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 })
    );
    throwPillow.position.set(0.5, 0.6, -2.55);
    throwPillow.rotation.y = 0.4;
    throwPillow.castShadow = true;
    roomGroup.add(throwPillow);
    const throwPillow2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 0.9 })
    );
    throwPillow2.position.set(-0.6, 0.58, -2.6);
    throwPillow2.rotation.y = -0.25;
    throwPillow2.castShadow = true;
    roomGroup.add(throwPillow2);

    // --- Ceiling light: smart ring fixture (futuristic) ---
    const ceilingLightCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a3040, metalness: 0.6, roughness: 0.35 })
    );
    ceilingLightCable.position.set(0, 9.82, -3);
    roomGroup.add(ceilingLightCable);
    const ceilingLightRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.38, 0.04, 12, 32),
        new THREE.MeshStandardMaterial({
            color: 0x304050,
            metalness: 0.6,
            roughness: 0.3,
            emissive: 0xe0e8ff,
            emissiveIntensity: 0.18
        })
    );
    ceilingLightRing.rotation.x = Math.PI / 2;
    ceilingLightRing.position.set(0, 9.58, -3);
    ceilingLightRing.castShadow = true;
    roomGroup.add(ceilingLightRing);
    const ceilingPointLight = new THREE.PointLight(0xffeed8, 0.32, 9);
    ceilingPointLight.position.set(0, 9.5, -3);
    scene.add(ceilingPointLight);
    if (typeof roomLights !== 'undefined') roomLights.ceiling = ceilingPointLight;

    // --- Rug pattern (futuristic tech - keep same as initial) ---
    rugTexture.needsUpdate = true;

    // --- Futuristic smart devices (automation) ---
    createSmartDevices();
    // --- Wall hub, LED strips, robots ---
    createFuturisticDetails();
    createRobots();
    createRoboticFurniture();
    createMoreFurnitureAndDevices();

    scene.add(roomGroup);
}

// Create smart automation devices (speaker, plugs, ambient strip) – futuristic room
function createSmartDevices() {
    if (typeof smartDevicesGroup !== 'undefined' && smartDevicesGroup && smartDevicesGroup.children.length > 0) return;
    var group = new THREE.Group();

    var castShadow = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET && window.GRAPHICS_PRESET.castShadow) === true;

    // Smart speaker (puck on side table)
    const speakerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.035, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.5, roughness: 0.4 })
    );
    speakerBody.position.set(-2.25, 0.57, -2.5);
    speakerBody.castShadow = castShadow;
    group.add(speakerBody);
    const speakerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.06, 0.08, 32),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x00aaff, emissiveIntensity: 0.35 })
    );
    speakerRing.rotation.x = -Math.PI / 2;
    speakerRing.position.set(-2.25, 0.588, -2.5);
    group.add(speakerRing);
    if (typeof roomDeviceRefs !== 'undefined') roomDeviceRefs.speaker = speakerRing;

    // Smart plug 1 (on media console)
    const plugBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x252525, metalness: 0.3, roughness: 0.6 })
    );
    plugBody.position.set(-0.3, 0.48, -8);
    plugBody.castShadow = castShadow;
    group.add(plugBody);
    const plugLED = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.6 })
    );
    plugLED.position.set(-0.3, 0.5, -7.98);
    group.add(plugLED);
    if (typeof roomDeviceRefs !== 'undefined') roomDeviceRefs.plug1 = plugLED;

    // Ambient strip (thin bar under TV / behind console – glow)
    const stripGeom = new THREE.BoxGeometry(2.2, 0.02, 0.08);
    const stripMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: 0x4488ff,
        emissiveIntensity: 0.4
    });
    const ambientStrip = new THREE.Mesh(stripGeom, stripMat);
    ambientStrip.position.set(0, 0.38, -7.92);
    group.add(ambientStrip);
    if (typeof roomDeviceRefs !== 'undefined') roomDeviceRefs.ambientStrip = stripMat;

    // Motion / presence sensor (small pill on wall)
    const sensorBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x1e2a35, metalness: 0.4, roughness: 0.5 })
    );
    sensorBody.rotation.z = Math.PI / 2;
    sensorBody.position.set(4.5, 2.2, -9.95);
    group.add(sensorBody);
    const sensorLED = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x00ccff, emissiveIntensity: 0.5 })
    );
    sensorLED.position.set(4.5, 2.2, -9.93);
    group.add(sensorLED);

    // Second smart plug (near floor lamp)
    const plug2Body = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.035, 0.045),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.3, roughness: 0.6 })
    );
    plug2Body.position.set(3.6, 0.04, -3.1);
    plug2Body.castShadow = castShadow;
    group.add(plug2Body);
    const plug2LED = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 })
    );
    plug2LED.position.set(3.6, 0.058, -3.08);
    group.add(plug2LED);

    if (typeof smartDevicesGroup !== 'undefined') smartDevicesGroup = group;
    roomGroup.add(group);
}

// Futuristic details: wall hub panel, ceiling LED strip, base LED
function createFuturisticDetails() {
    var castShadow = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET && window.GRAPHICS_PRESET.castShadow) === true;
    // Smart hub panel (back wall, left of TV) – tablet-like control
    const hubFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.32, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.5, roughness: 0.4 })
    );
    hubFrame.position.set(-2.2, 1.6, -9.97);
    roomGroup.add(hubFrame);
    const hubScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.26),
        new THREE.MeshStandardMaterial({
            color: 0x0a1420,
            emissive: 0x204080,
            emissiveIntensity: 0.25
        })
    );
    hubScreen.position.set(-2.2, 1.6, -9.955);
    roomGroup.add(hubScreen);
    const hubStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.01, 0.008),
        new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.5 })
    );
    hubStrip.position.set(-2.2, 1.47, -9.955);
    roomGroup.add(hubStrip);
    // Ceiling LED strip (along back wall)
    const ceilingStrip = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.03, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x152030, emissive: 0x4080cc, emissiveIntensity: 0.35 })
    );
    ceilingStrip.position.set(0, 9.97, -10);
    roomGroup.add(ceilingStrip);
    // Floor-level accent strip (under console, behind)
    const floorStrip = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.02, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x102030, emissive: 0x3080bb, emissiveIntensity: 0.3 })
    );
    floorStrip.position.set(0, 0.02, -8.02);
    roomGroup.add(floorStrip);
}

// Robots: vacuum disc + companion bot
function createRobots() {
    var castShadow = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET && window.GRAPHICS_PRESET.castShadow) === true;
    // Robot vacuum (disc on floor, near rug)
    const vacBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.08, 32),
        new THREE.MeshStandardMaterial({ color: 0x252a35, metalness: 0.5, roughness: 0.4 })
    );
    vacBody.position.set(1.6, 0.06, -3.8);
    vacBody.castShadow = castShadow;
    roomGroup.add(vacBody);
    const vacRing = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.22, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a1e28, emissive: 0x00cc88, emissiveIntensity: 0.2 })
    );
    vacRing.rotation.x = -Math.PI / 2;
    vacRing.position.set(1.6, 0.102, -3.8);
    roomGroup.add(vacRing);
    const vacEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 0.6 })
    );
    vacEye.position.set(1.6, 0.11, -3.7);
    roomGroup.add(vacEye);
    // Companion bot (on media console, right side)
    const botBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.04, 20),
        new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.6, roughness: 0.35 })
    );
    botBase.position.set(0.85, 0.48, -8);
    botBase.castShadow = castShadow;
    roomGroup.add(botBase);
    const botBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.08, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: 0x353d48, metalness: 0.5, roughness: 0.4 })
    );
    botBody.position.set(0.85, 0.55, -8);
    botBody.castShadow = castShadow;
    roomGroup.add(botBody);
    const botHead = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0x404858, metalness: 0.4, roughness: 0.45 })
    );
    botHead.position.set(0.85, 0.64, -8);
    botHead.castShadow = castShadow;
    roomGroup.add(botHead);
    const botDisplay = new THREE.Mesh(
        new THREE.PlaneGeometry(0.06, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x102030, emissive: 0x00aaff, emissiveIntensity: 0.5 })
    );
    botDisplay.position.set(0.85, 0.64, -7.94);
    roomGroup.add(botDisplay);
    const botAntenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8),
        new THREE.MeshStandardMaterial({ color: 0x505860, metalness: 0.5, roughness: 0.4 })
    );
    botAntenna.position.set(0.85, 0.71, -8);
    roomGroup.add(botAntenna);
    const botAntennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00aaff, emissive: 0x00aaff, emissiveIntensity: 0.4 })
    );
    botAntennaTip.position.set(0.85, 0.745, -8);
    roomGroup.add(botAntennaTip);
}

// Robotic furniture and robotics around the house
function createRoboticFurniture() {
    var castShadow = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET && window.GRAPHICS_PRESET.castShadow) === true;
    var metalDark = { color: 0x2a3038, metalness: 0.55, roughness: 0.4 };
    var jointMat = new THREE.MeshStandardMaterial({ color: 0x404858, metalness: 0.6, roughness: 0.35 });
    var ledMat = function(c) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }); };

    // --- Robot arm lamp (right of coffee table, articulated) ---
    const armLampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 20), new THREE.MeshStandardMaterial(metalDark));
    armLampBase.position.set(1.15, 0.42, -1.9);
    armLampBase.castShadow = castShadow;
    roomGroup.add(armLampBase);
    const armLampPivot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), jointMat);
    armLampPivot.position.set(1.15, 0.5, -1.9);
    roomGroup.add(armLampPivot);
    const armLampSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.35, 12), new THREE.MeshStandardMaterial(metalDark));
    armLampSeg1.rotation.z = Math.PI / 2;
    armLampSeg1.position.set(1.32, 0.67, -1.9);
    roomGroup.add(armLampSeg1);
    const armLampJoint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), jointMat);
    armLampJoint.position.set(1.5, 0.67, -1.9);
    roomGroup.add(armLampJoint);
    const armLampSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.28, 10), new THREE.MeshStandardMaterial(metalDark));
    armLampSeg2.rotation.z = Math.PI / 2;
    armLampSeg2.position.set(1.64, 0.67, -1.9);
    roomGroup.add(armLampSeg2);
    const armLampHead = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), new THREE.MeshStandardMaterial({ color: 0x353d48, metalness: 0.5, roughness: 0.4, emissive: 0xffdd88, emissiveIntensity: 0.2 }));
    armLampHead.position.set(1.78, 0.67, -1.9);
    roomGroup.add(armLampHead);
    const armLampLight = new THREE.PointLight(0xffeedd, 0.35, 3);
    armLampLight.position.set(1.78, 0.67, -1.9);
    scene.add(armLampLight);

    // --- Robotic ottoman / footrest (in front of sofa, mechanical look) ---
    const ottomanBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.4), new THREE.MeshStandardMaterial(metalDark));
    ottomanBase.position.set(0.1, 0.12, -2.1);
    ottomanBase.castShadow = castShadow;
    roomGroup.add(ottomanBase);
    [-1, 1].forEach(sx => {
        [-1, 1].forEach(sz => {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 10), jointMat);
            leg.position.set(0.1 + sx * 0.25, 0.08, -2.1 + sz * 0.14);
            roomGroup.add(leg);
            const foot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshStandardMaterial(metalDark));
            foot.position.set(0.1 + sx * 0.25, 0.04, -2.1 + sz * 0.14);
            roomGroup.add(foot);
        });
    });
    const ottomanLED = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), ledMat(0x00cc88));
    ottomanLED.position.set(0.1, 0.13, -1.92);
    roomGroup.add(ottomanLED);

    // --- Vacuum charging dock (pad on floor, left of rug) ---
    const dockPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.02, 32),
        new THREE.MeshStandardMaterial({ color: 0x1a2028, metalness: 0.5, roughness: 0.45 })
    );
    dockPad.position.set(-1.8, 0.02, -4.2);
    roomGroup.add(dockPad);
    const dockRing = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.26, 32),
        new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x00aa88, emissiveIntensity: 0.25 })
    );
    dockRing.rotation.x = -Math.PI / 2;
    dockRing.position.set(-1.8, 0.032, -4.2);
    roomGroup.add(dockRing);

    // --- Robotic plant base (left plant: smart planter pad under pot) ---
    const robotPotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.02, 16), new THREE.MeshStandardMaterial(metalDark));
    robotPotBase.position.set(-3, 0.02, -3.8);
    robotPotBase.castShadow = castShadow;
    roomGroup.add(robotPotBase);
    const robotPotRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.2, 0.018, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x252a35, emissive: 0x4080aa, emissiveIntensity: 0.15 })
    );
    robotPotRing.rotation.x = Math.PI / 2;
    robotPotRing.position.set(-3, 0.032, -3.8);
    roomGroup.add(robotPotRing);
    [0, 1, 2].forEach(i => {
        const a = (i / 3) * Math.PI * 2;
        const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), new THREE.MeshStandardMaterial({ color: 0x303840, emissive: 0x00aacc, emissiveIntensity: 0.3 }));
        sensor.position.set(-3 + Math.cos(a) * 0.2, 0.04, -3.8 + Math.sin(a) * 0.2);
        roomGroup.add(sensor);
    });

    // --- Robotic side shelf / cart (small serving bot style, near right wall) ---
    const cartBase = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.25), new THREE.MeshStandardMaterial(metalDark));
    cartBase.position.set(4.2, 0.25, -5);
    cartBase.castShadow = castShadow;
    roomGroup.add(cartBase);
    const cartWheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 16), jointMat);
    cartWheelL.rotation.z = Math.PI / 2;
    cartWheelL.position.set(4.1, 0.22, -5);
    roomGroup.add(cartWheelL);
    const cartWheelR = cartWheelL.clone();
    cartWheelR.position.set(4.3, 0.22, -5);
    roomGroup.add(cartWheelR);
    const cartPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.5, 12), new THREE.MeshStandardMaterial(metalDark));
    cartPillar.position.set(4.2, 0.53, -5);
    roomGroup.add(cartPillar);
    const cartTray = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.03, 20), new THREE.MeshStandardMaterial(metalDark));
    cartTray.position.set(4.2, 0.78, -5);
    cartTray.castShadow = castShadow;
    roomGroup.add(cartTray);
    const cartLED = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), ledMat(0x00aaff));
    cartLED.position.set(4.2, 0.81, -4.85);
    roomGroup.add(cartLED);

    // --- Wall-mounted robotic arm (back wall, holds small light) ---
    const wallArmBase = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.08), new THREE.MeshStandardMaterial(metalDark));
    wallArmBase.position.set(2.8, 2.0, -9.94);
    roomGroup.add(wallArmBase);
    const wallArmSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.25), new THREE.MeshStandardMaterial(metalDark));
    wallArmSeg1.rotation.y = Math.PI / 2;
    wallArmSeg1.position.set(2.92, 2.0, -9.94);
    roomGroup.add(wallArmSeg1);
    const wallArmJoint = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), jointMat);
    wallArmJoint.position.set(3.04, 2.0, -9.94);
    roomGroup.add(wallArmJoint);
    const wallArmSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.2), new THREE.MeshStandardMaterial(metalDark));
    wallArmSeg2.rotation.y = Math.PI / 2;
    wallArmSeg2.position.set(3.14, 2.0, -9.94);
    roomGroup.add(wallArmSeg2);
    const wallArmLamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), new THREE.MeshStandardMaterial({ color: 0x354050, emissive: 0xaaccff, emissiveIntensity: 0.35 }));
    wallArmLamp.position.set(3.24, 2.0, -9.94);
    roomGroup.add(wallArmLamp);

    // --- Coffee table robotic trim (LED strip + panel lines on table) ---
    const tableTrim = new THREE.Mesh(
        new THREE.BoxGeometry(1.33, 0.015, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x3080cc, emissiveIntensity: 0.2 })
    );
    tableTrim.position.set(0, 0.42, -1.95);
    roomGroup.add(tableTrim);
}

// More furniture and autonomous devices – fuller room
function createMoreFurnitureAndDevices() {
    var castShadow = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET && window.GRAPHICS_PRESET.castShadow) === true;
    var dark = { color: 0x252c38, metalness: 0.15, roughness: 0.5 };
    var led = function(c) { return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.4 }); };

    // --- Bookshelf (left wall) ---
    const shelfW = 0.9, shelfH = 1.4, shelfD = 0.28;
    const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(shelfW + 0.04, shelfH + 0.04, 0.02), new THREE.MeshStandardMaterial(dark));
    shelfBack.position.set(-8.2, shelfH / 2 + 0.5, -5);
    roomGroup.add(shelfBack);
    for (var row = 0; row < 4; row++) {
        for (var col = 0; col < 3; col++) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(shelfW / 3 - 0.02, shelfH / 4 - 0.02, shelfD), new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.6 }));
            box.position.set(-8.2 + (col - 1) * (shelfW / 3), 0.55 + row * (shelfH / 4), -5);
            box.castShadow = castShadow;
            roomGroup.add(box);
        }
    }
    const shelfLED = new THREE.Mesh(new THREE.BoxGeometry(shelfW - 0.1, 0.02, 0.03), led(0x4080cc));
    shelfLED.position.set(-8.2, 0.48, -4.86);
    roomGroup.add(shelfLED);

    // --- Armchair (left corner, facing TV) ---
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.72), new THREE.MeshStandardMaterial({ color: 0x383e48, roughness: 0.8 }));
    chairSeat.position.set(-4.5, 0.25, -5.2);
    chairSeat.castShadow = castShadow;
    roomGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.12), new THREE.MeshStandardMaterial({ color: 0x404858, roughness: 0.78 }));
    chairBack.position.set(-4.5, 0.62, -5.55);
    chairBack.castShadow = castShadow;
    roomGroup.add(chairBack);
    const chairArmL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.72), new THREE.MeshStandardMaterial({ color: 0x353d48, roughness: 0.75 }));
    chairArmL.position.set(-4.86, 0.48, -5.2);
    roomGroup.add(chairArmL);
    const chairArmR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.72), new THREE.MeshStandardMaterial({ color: 0x353d48, roughness: 0.75 }));
    chairArmR.position.set(-4.14, 0.48, -5.2);
    roomGroup.add(chairArmR);

    // --- Sideboard / credenza (back wall, right of TV) ---
    const credenzaTop = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.45), new THREE.MeshStandardMaterial({ color: 0x1a2028, metalness: 0.2, roughness: 0.4 }));
    credenzaTop.position.set(3.2, 0.55, -8.2);
    credenzaTop.castShadow = castShadow;
    roomGroup.add(credenzaTop);
    const credenzaBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.5, 0.38), new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.55 }));
    credenzaBody.position.set(3.2, 0.27, -8.2);
    credenzaBody.castShadow = castShadow;
    roomGroup.add(credenzaBody);
    const credenzaStrip = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.015, 0.02), led(0x3080bb));
    credenzaStrip.position.set(3.2, 0.58, -7.98);
    roomGroup.add(credenzaStrip);

    // --- Smart thermostat (back wall, right) ---
    const thermoBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a2030, metalness: 0.4, roughness: 0.4 }));
    thermoBody.position.set(5.5, 1.8, -9.96);
    roomGroup.add(thermoBody);
    const thermoScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: 0x00aacc, emissiveIntensity: 0.3 }));
    thermoScreen.position.set(5.5, 1.8, -9.94);
    roomGroup.add(thermoScreen);

    // --- Temp/humidity sensor (left wall, high) ---
    const thSensor = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.025), new THREE.MeshStandardMaterial({ color: 0x252a35, metalness: 0.5, roughness: 0.4 }));
    thSensor.position.set(-9.96, 2.8, -4);
    roomGroup.add(thSensor);
    const thLED = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), led(0x00cc88));
    thLED.position.set(-9.94, 2.8, -4);
    roomGroup.add(thLED);

    // --- Smart blinds controller (window wall) ---
    const blindsCtrl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.4, roughness: 0.45 }));
    blindsCtrl.position.set(8.8, 3.2, -3.5);
    roomGroup.add(blindsCtrl);
    const blindsLED = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), led(0xffaa44));
    blindsLED.position.set(8.8, 3.22, -3.48);
    roomGroup.add(blindsLED);

    // --- Second ambient strip (left wall, at floor) ---
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 2.5), new THREE.MeshStandardMaterial({ color: 0x102030, emissive: 0x3080cc, emissiveIntensity: 0.25 }));
    strip2.position.set(-9.95, 0.08, -4);
    roomGroup.add(strip2);

    // --- Small desk with tablet (right side, near window) ---
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.04, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.45 }));
    deskTop.position.set(6.5, 0.72, -4.5);
    deskTop.castShadow = castShadow;
    roomGroup.add(deskTop);
    const deskLegs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.68, 0.02), new THREE.MeshStandardMaterial(dark));
    deskLegs.position.set(6.5, 0.36, -4.5);
    roomGroup.add(deskLegs);
    const deskTablet = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.14), new THREE.MeshStandardMaterial({ color: 0x151a22, emissive: 0x204060, emissiveIntensity: 0.2 }));
    deskTablet.position.set(6.5, 0.75, -4.5);
    roomGroup.add(deskTablet);

    // --- Third plant (right corner) ---
    const pot3 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0x252c38, roughness: 0.6 }));
    pot3.position.set(5.5, 0.13, -6);
    roomGroup.add(pot3);
    const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), new THREE.MeshStandardMaterial({ color: 0x2a5c28, roughness: 0.88 }));
    foliage3.position.set(5.5, 0.45, -6);
    foliage3.castShadow = castShadow;
    roomGroup.add(foliage3);
    const pot3Ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 20), new THREE.MeshStandardMaterial({ color: 0x1a2028, emissive: 0x4080aa, emissiveIntensity: 0.12 }));
    pot3Ring.rotation.x = Math.PI / 2;
    pot3Ring.position.set(5.5, 0.18, -6);
    roomGroup.add(pot3Ring);

    // --- Door contact sensor (left wall, by door area) ---
    const doorSensor = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), new THREE.MeshStandardMaterial({ color: 0x2a3038, metalness: 0.5, roughness: 0.35 }));
    doorSensor.position.set(-9.97, 1.1, 2);
    roomGroup.add(doorSensor);
    const doorSensorLED = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), led(0x00ff88));
    doorSensorLED.position.set(-9.95, 1.1, 2);
    roomGroup.add(doorSensorLED);

    // --- Magazine rack (by armchair) ---
    const rackBase = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.25), new THREE.MeshStandardMaterial({ color: 0x252c38, roughness: 0.5 }));
    rackBase.position.set(-4.2, 0.1, -5.8);
    roomGroup.add(rackBase);
    const rackSides = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.35, 0.03), new THREE.MeshStandardMaterial(dark));
    rackSides.position.set(-4.2, 0.28, -5.8);
    roomGroup.add(rackSides);
}

// Update room visuals from server room_state (lights, devices)
function updateRoomState(state) {
    if (!state) return;
    if (typeof roomState !== 'undefined') roomState = state;
    var main = Math.max(0, Math.min(100, state.lights_main != null ? state.lights_main : 100)) / 100;
    var left = Math.max(0, Math.min(100, state.lights_lamp_left != null ? state.lights_lamp_left : 100)) / 100;
    var right = Math.max(0, Math.min(100, state.lights_lamp_right != null ? state.lights_lamp_right : 100)) / 100;
    if (typeof roomLights !== 'undefined' && roomLights) {
        if (roomLights.ceiling) roomLights.ceiling.intensity = 0.32 * main;
        if (roomLights.lamp_left) roomLights.lamp_left.intensity = 0.45 * left;
        if (roomLights.lamp_right) roomLights.lamp_right.intensity = 0.4 * right;
    }
    if (typeof roomDeviceRefs !== 'undefined' && roomDeviceRefs) {
        if (roomDeviceRefs.plug1 && roomDeviceRefs.plug1.material) {
            roomDeviceRefs.plug1.material.emissiveIntensity = state.smart_plug_1 ? 0.6 : 0.05;
        }
        if (roomDeviceRefs.speaker && roomDeviceRefs.speaker.material) {
            roomDeviceRefs.speaker.material.emissiveIntensity = state.smart_speaker ? 0.35 : 0.05;
        }
        if (roomDeviceRefs.ambientStrip) {
            roomDeviceRefs.ambientStrip.emissiveIntensity = state.ambient_strip ? 0.4 : 0.02;
        }
    }
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

// Create 3D Remote Control (style: 'handheld' = physical remote, 'digital' = flat screen/tablet remote)
function createRemoteControl(style) {
    if (typeof style === 'undefined') style = (typeof currentRemoteStyle !== 'undefined' ? currentRemoteStyle : 'handheld');
    if (typeof currentRemoteStyle !== 'undefined') currentRemoteStyle = style;

    var oldParent = null;
    if (remoteGroup && remoteGroup.parent) {
        oldParent = remoteGroup.parent;
        oldParent.remove(remoteGroup);
    }
    remoteGroup = new THREE.Group();

    if (style === 'digital') {
        createDigitalRemote();
    } else {
        createHandheldRemote();
    }

    remoteGroup.position.copy(remoteLookClose.basePosition);
    remoteGroup.scale.setScalar(remoteLookClose.baseScale);
    remoteGroup.rotation.y = remoteLookClose.baseRotationY;

    if (oldParent) oldParent.add(remoteGroup);
    else scene.add(remoteGroup);

    createHand();
    createFirstPersonArm();
}

// Switch remote style and rebuild (call from UI)
function switchRemoteStyle(style) {
    if (style !== 'handheld' && style !== 'digital') return;
    createRemoteControl(style);
    var btnHand = document.getElementById('btn-remote-handheld');
    var btnDig = document.getElementById('btn-remote-digital');
    if (btnHand) btnHand.classList.toggle('active', style === 'handheld');
    if (btnDig) btnDig.classList.toggle('active', style === 'digital');
}

// --- Handheld remote (physical remote with buttons and IR emitter) ---
function createHandheldRemote() {
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

    const frontPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.28, 0.78),
        new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.1 })
    );
    frontPanel.position.z = 0.026;
    frontPanel.raycast = function() {};
    remoteGroup.add(frontPanel);

    const logo = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.2 })
    );
    logo.position.set(0, 0.35, 0.027);
    logo.raycast = function() {};
    remoteGroup.add(logo);

    addHandheldButtons();
    addSharedRoomButtons(0.03, -0.38, 0.048, 0.032, 0.058, 0.055);

    const irEmitter = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.5 })
    );
    irEmitter.position.set(0, 0.4, 0.03);
    remoteGroup.add(irEmitter);

    [['VOL+', -0.08, 0.15], ['VOL-', -0.08, 0.05], ['CH+', 0.08, 0.15], ['CH-', 0.08, 0.05]].forEach(function(a) {
        const lab = createLabelPlane(a[0], 0.04, 0.01);
        lab.position.set(a[1], a[2], 0.04);
        remoteGroup.add(lab);
    });
    const sideDetailGeometry = new THREE.PlaneGeometry(0.28, 0.05);
    const sideDetailMaterial = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.7, metalness: 0.05 });
    [0.25, -0.25].forEach(function(y) {
        const g = new THREE.Mesh(sideDetailGeometry, sideDetailMaterial);
        g.position.set(0, y, 0.027);
        g.raycast = function() {};
        remoteGroup.add(g);
    });
}

function addHandheldButtons() {
    const powerButton = createButton(0.08, 0.08, 0x10, 'Power', 0xff0000);
    powerButton.position.set(0, 0.3, 0.03);
    remoteGroup.add(powerButton);
    const volUpButton = createButton(0.06, 0.06, 0x11, 'Volume Up', 0x4CAF50);
    volUpButton.position.set(-0.08, 0.15, 0.03);
    remoteGroup.add(volUpButton);
    const volDownButton = createButton(0.06, 0.06, 0x12, 'Volume Down', 0xf44336);
    volDownButton.position.set(-0.08, 0.05, 0.03);
    remoteGroup.add(volDownButton);
    const chUpButton = createButton(0.06, 0.06, 0x14, 'Channel Up', 0x2196F3);
    chUpButton.position.set(0.08, 0.15, 0.03);
    remoteGroup.add(chUpButton);
    const chDownButton = createButton(0.06, 0.06, 0x15, 'Channel Down', 0x2196F3);
    chDownButton.position.set(0.08, 0.05, 0.03);
    remoteGroup.add(chDownButton);
    const homeButton = createButton(0.06, 0.06, 0x20, 'Home', 0xFFC107);
    homeButton.position.set(0, 0.1, 0.03);
    remoteGroup.add(homeButton);
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const numButton = createButton(0.05, 0.05, 0x51 + i, `${i + 1}`, 0xffffff);
        numButton.position.set((col - 1) * 0.07, -0.1 - row * 0.07, 0.03);
        remoteGroup.add(numButton);
    }
    const zeroButton = createButton(0.05, 0.05, 0x50, '0', 0xffffff);
    zeroButton.position.set(0, -0.31, 0.03);
    remoteGroup.add(zeroButton);
    const streamingButtons = [
        { name: 'YouTube', code: 0x01, color: 0xff0000 },
        { name: 'Netflix', code: 0x02, color: 0xe50914 },
        { name: 'Amazon Prime', code: 0x03, color: 0x00a8e1 },
        { name: 'HBO Max', code: 0x04, color: 0x800080 }
    ];
    streamingButtons.forEach(function(btn, i) {
        const b = createButton(0.06, 0.04, btn.code, btn.name, btn.color);
        b.position.set((i - 1.5) * 0.08, -0.35, 0.03);
        remoteGroup.add(b);
    });
}

// --- Digital remote (flat screen / tablet style) ---
function createDigitalRemote() {
    const w = 0.38;
    const h = 0.68;
    const d = 0.022;
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d, 4, 4, 1),
        new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.25, metalness: 0.4 })
    );
    body.castShadow = true;
    body.receiveShadow = true;
    remoteGroup.add(body);
    remoteMesh = body;

    const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.04, h - 0.06),
        new THREE.MeshStandardMaterial({ color: 0x0a0a12, roughness: 0.9, metalness: 0.05 })
    );
    screen.position.z = d / 2 + 0.002;
    screen.raycast = function() {};
    remoteGroup.add(screen);

    const zBtn = d / 2 + 0.008;
    const powerButton = createButton(0.1, 0.06, 0x10, 'Power', 0xff3333);
    powerButton.position.set(0, 0.28, zBtn);
    remoteGroup.add(powerButton);
    const volUpButton = createButton(0.055, 0.055, 0x11, 'Volume Up', 0x4CAF50);
    volUpButton.position.set(-0.12, 0.12, zBtn);
    remoteGroup.add(volUpButton);
    const volDownButton = createButton(0.055, 0.055, 0x12, 'Volume Down', 0xf44336);
    volDownButton.position.set(-0.12, 0.04, zBtn);
    remoteGroup.add(volDownButton);
    const chUpButton = createButton(0.055, 0.055, 0x14, 'Channel Up', 0x2196F3);
    chUpButton.position.set(0.12, 0.12, zBtn);
    remoteGroup.add(chUpButton);
    const chDownButton = createButton(0.055, 0.055, 0x15, 'Channel Down', 0x2196F3);
    chDownButton.position.set(0.12, 0.04, zBtn);
    remoteGroup.add(chDownButton);
    const homeButton = createButton(0.08, 0.055, 0x20, 'Home', 0xFFC107);
    homeButton.position.set(0, 0.04, zBtn);
    remoteGroup.add(homeButton);
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const numButton = createButton(0.055, 0.05, 0x51 + i, `${i + 1}`, 0x333344);
        numButton.position.set((col - 1) * 0.07, -0.08 - row * 0.065, zBtn);
        remoteGroup.add(numButton);
    }
    const zeroButton = createButton(0.055, 0.05, 0x50, '0', 0x333344);
    zeroButton.position.set(0, -0.29, zBtn);
    remoteGroup.add(zeroButton);
    const streamingButtons = [
        { name: 'YouTube', code: 0x01, color: 0xff0000 },
        { name: 'Netflix', code: 0x02, color: 0xe50914 },
        { name: 'Amazon Prime', code: 0x03, color: 0x00a8e1 },
        { name: 'HBO Max', code: 0x04, color: 0x800080 }
    ];
    streamingButtons.forEach(function(btn, i) {
        const b = createButton(0.065, 0.04, btn.code, btn.name, btn.color);
        b.position.set((i - 1.5) * 0.075, -0.34, zBtn);
        remoteGroup.add(b);
    });
    addSharedRoomButtons(zBtn, -0.39, 0.05, 0.03, 0.06, 0.052);
}

// Room/Smart Home buttons (shared by handheld and digital)
function addSharedRoomButtons(z, startY, bw, bh, colOff, rowOff) {
    const roomButtons = [
        { code: 0xE0, name: 'Room: Movie', color: 0x5a3d8a },
        { code: 0xE1, name: 'Room: Relax', color: 0x4a7c59 },
        { code: 0xE2, name: 'Room: Off', color: 0x444444 },
        { code: 0xE3, name: 'Room: Lights Dim', color: 0x8a7a4a },
        { code: 0xE4, name: 'Room: Lights Full', color: 0xe8c858 },
        { code: 0xE5, name: 'Room: Plug 1', color: 0x00aa66 },
        { code: 0xE6, name: 'Room: Speaker', color: 0x0088cc },
        { code: 0xE7, name: 'Room: Ambient', color: 0x4488dd }
    ];
    roomButtons.forEach(function(btn, i) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const roomBtn = createButton(bw, bh, btn.code, btn.name, btn.color);
        roomBtn.position.set((col - 1.5) * colOff, startY - row * rowOff, z);
        remoteGroup.add(roomBtn);
    });
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

// First-person arm: extends from shoulder (near camera) to wrist (hand). Only visible when in first-person "Look at remote" view.
function createFirstPersonArm() {
    if (armGroup) return; // only create once (hand is recreated when switching remote style)
    armGroup = new THREE.Group();
    const skinColor = 0xC4956A;
    const skinMaterial = new THREE.MeshStandardMaterial({
        color: skinColor,
        roughness: 0.75,
        metalness: 0.02,
        emissive: 0x221108,
        emissiveIntensity: 0.04
    });
    // Forearm: cylinder (Y-up, height 1), will be scaled and rotated each frame to span shoulder -> wrist
    const forearmGeom = new THREE.CylinderGeometry(0.055, 0.07, 1, 12);
    const forearm = new THREE.Mesh(forearmGeom, skinMaterial);
    forearm.castShadow = true;
    forearm.name = 'forearm';
    armGroup.add(forearm);
    // Upper arm: slightly thicker, from shoulder to elbow (we'll do one segment for now: shoulder to wrist)
    // Use a second cylinder for upper arm so we have shoulder->elbow->wrist in first person
    const upperGeom = new THREE.CylinderGeometry(0.07, 0.08, 1, 12);
    const upperArm = new THREE.Mesh(upperGeom, skinMaterial);
    upperArm.castShadow = true;
    upperArm.name = 'upperArm';
    armGroup.add(upperArm);
    armGroup.visible = false;
    armGroup.raycast = function() {};
    scene.add(armGroup);
    // Container that follows the camera in first-person so remote+hand move with the viewer
    firstPersonHolder = new THREE.Group();
    firstPersonHolder.raycast = function() {};
    scene.add(firstPersonHolder);
}

// Update first-person arm to span from shoulder (derived from camera) to wrist (hand). Call from animate() when firstPersonMode.
function updateFirstPersonArm() {
    if (!armGroup || !handGroup || !camera) return;
    const wrist = new THREE.Vector3(-0.06, 0.02, 0);
    handGroup.localToWorld(wrist);
    // Shoulder: in front of and below camera (right arm, so slightly to the right)
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const shoulder = camera.position.clone()
        .add(camRight.clone().multiplyScalar(0.22))
        .add(new THREE.Vector3(0, -1, 0).multiplyScalar(0.5))
        .add(camDir.clone().multiplyScalar(-0.35));
    const forearm = armGroup.getObjectByName('forearm');
    const upperArm = armGroup.getObjectByName('upperArm');
    if (!forearm || !upperArm) return;
    // Elbow: 45% along from shoulder to wrist for a natural bend
    const elbow = new THREE.Vector3().lerpVectors(shoulder, wrist, 0.45);
    const dirUpper = new THREE.Vector3().subVectors(elbow, shoulder).normalize();
    const lenUpper = shoulder.distanceTo(elbow);
    const dirForearm = new THREE.Vector3().subVectors(wrist, elbow).normalize();
    const lenForearm = elbow.distanceTo(wrist);
    const yUp = new THREE.Vector3(0, 1, 0);
    // Upper arm: center at midpoint, Y axis along dirUpper
    upperArm.position.copy(shoulder).add(elbow).multiplyScalar(0.5);
    upperArm.scale.set(1, lenUpper, 1);
    upperArm.quaternion.setFromUnitVectors(yUp, dirUpper);
    // Forearm: center at midpoint elbow-wrist
    forearm.position.copy(elbow).add(wrist).multiplyScalar(0.5);
    forearm.scale.set(1, lenForearm, 1);
    forearm.quaternion.setFromUnitVectors(yUp, dirForearm);
    armGroup.visible = true;
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

