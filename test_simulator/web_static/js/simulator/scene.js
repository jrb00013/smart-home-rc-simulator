function initScene() {
    const container = document.getElementById('canvas-container');
    var preset = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET) ? window.GRAPHICS_PRESET : DEFAULT_GRAPHICS_PRESET;

    // Scene - futuristic smart room (cool dark, blue fog)
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141820);
    var fogFar = presetNum(preset, 'fogFar', 80);
    scene.fog = new THREE.Fog(0x1a2030, 35, Math.max(50, fogFar));

    // Camera (near plane 0.2 to avoid clipping into floor when looking down in walk mode)
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.2,
        1000
    );
    camera.position.set(0, 1.5, 14);

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
    renderer.toneMappingExposure = Math.max(0.1, presetNum(preset, 'toneMappingExposure', 1.22));
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // Lights - futuristic: cool white + blue accent + soft fill
    const ambientLight = new THREE.AmbientLight(0xe0e8f8, 0.45);
    scene.add(ambientLight);
    const hemiLight = new THREE.HemisphereLight(0xe8f0ff, 0x1e2432, 0.48);
    scene.add(hemiLight);

    const mainLight = new THREE.DirectionalLight(0xf0f4ff, 1.1);
    mainLight.position.set(13, 15, 9);
    mainLight.castShadow = preset.castShadow === true;
    var mapSize = Math.max(256, Math.min(8192, presetNum(preset, 'shadowMapSize', 4096)));
    mainLight.shadow.mapSize.width = mapSize;
    mainLight.shadow.mapSize.height = mapSize;
    mainLight.shadow.bias = -0.0001;
    mainLight.shadow.normalBias = 0.015;
    if (mainLight.shadow.radius !== undefined) mainLight.shadow.radius = Math.max(0, presetNum(preset, 'shadowRadius', 6));
    const shadowCam = mainLight.shadow.camera;
    shadowCam.left = -35;
    shadowCam.right = 35;
    shadowCam.top = 35;
    shadowCam.bottom = -35;
    shadowCam.near = 0.5;
    shadowCam.far = 95;
    scene.add(mainLight);
    
    const fillLight = new THREE.DirectionalLight(0xc8d8f0, 0.5);
    fillLight.position.set(-13, 7, -9);
    scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xa0c8ff, 0.4);
    rimLight.position.set(0, 8, -26);
    scene.add(rimLight);
    
    const backKey = new THREE.DirectionalLight(0x80b0f0, 0.25);
    backKey.position.set(0, 5.6, -31);
    scene.add(backKey);
    
    const bounceLight = new THREE.PointLight(0xb0d0ff, 0.28, 12);
    bounceLight.position.set(-6.6, 2.8, -9);
    scene.add(bounceLight);
    
    const accentCyan = new THREE.PointLight(0x40e0f0, 0.12, 8);
    accentCyan.position.set(0, 2.1, -16.5);
    scene.add(accentCyan);
    
    // Point light for TV glow (will be animated, slight blue when on)
    const tvGlow = new THREE.PointLight(0xe0f0ff, 0, 10);
    tvGlow.position.set(0, 1.68, -17.6);
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
    if (typeof window.initControls === 'function') {
        window.initControls();
    } else if (typeof initControls === 'function') {
        initControls();
    } else {
        console.error('initControls is not defined. Make sure controls.js is loaded.');
    }
    
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

    // Huge smart home: main room dimensions (scale 2.2x from original 20x20x10)
    const ROOM_W = 44, ROOM_D = 44, ROOM_H = 14;
    const sx = ROOM_W / 20, sz = ROOM_D / 20, sy = ROOM_H / 10;
    const rx = (x) => x * sx, ry = (y) => y * sy, rz = (z) => z * sz;

    roomGroup = new THREE.Group();

    // --- Floor: futuristic dark slate with subtle tech grid ---
    const floorGeometry = new THREE.PlaneGeometry(ROOM_W, ROOM_D, 1, 1);
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = Math.max(512, floorW * 2);
    floorCanvas.height = Math.max(256, floorH * 2);
    const fw = floorCanvas.width, fh = floorCanvas.height;
    const floorCtx = floorCanvas.getContext('2d');
    floorCtx.fillStyle = '#1e2430';
    floorCtx.fillRect(0, 0, fw, fh);
    for (var g = 0; g < fw; g += 32) {
        floorCtx.strokeStyle = 'rgba(60,80,120,0.2)';
        floorCtx.lineWidth = 1;
        floorCtx.beginPath();
        floorCtx.moveTo(g, 0);
        floorCtx.lineTo(g, fh);
        floorCtx.stroke();
    }
    for (var g = 0; g < fh; g += 24) {
        floorCtx.beginPath();
        floorCtx.moveTo(0, g);
        floorCtx.lineTo(fw, g);
        floorCtx.stroke();
    }
    for (var py = 0; py < fh; py += 4) {
        for (var px = 0; px < fw; px += 4) {
            if (Math.random() < 0.04) {
                floorCtx.fillStyle = 'rgba(80,160,220,0.12)';
                floorCtx.fillRect(px, py, 2, 2);
            }
        }
    }
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(5, 3);
    floorTexture.anisotropy = 16;
    var floorBumpCanvas = document.createElement('canvas');
    floorBumpCanvas.width = 256;
    floorBumpCanvas.height = 128;
    var floorBumpCtx = floorBumpCanvas.getContext('2d');
    for (var by = 0; by < 128; by++) {
        for (var bx = 0; bx < 256; bx++) {
            var g = 128 + (Math.sin(bx * 0.15) * 12) + (Math.random() - 0.5) * 20;
            floorBumpCtx.fillStyle = 'rgb(' + Math.max(0, Math.min(255, g)) + ',' + Math.max(0, Math.min(255, g)) + ',' + Math.max(0, Math.min(255, g)) + ')';
            floorBumpCtx.fillRect(bx, by, 1, 1);
        }
    }
    var floorBumpTex = new THREE.CanvasTexture(floorBumpCanvas);
    floorBumpTex.wrapS = THREE.RepeatWrapping;
    floorBumpTex.wrapT = THREE.RepeatWrapping;
    floorBumpTex.repeat.copy(floorTexture.repeat);
    const floorMaterial = new THREE.MeshStandardMaterial({
        map: floorTexture,
        bumpMap: floorBumpTex,
        bumpScale: 0.06,
        roughness: 0.5,
        metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = castShadow;
    roomGroup.add(floor);

    // --- Walls: futuristic slate blue-gray with subtle tech lines ---
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = Math.max(512, wallSize * 2);
    wallCanvas.height = Math.max(512, wallSize * 2);
    const ww = wallCanvas.width, wh = wallCanvas.height;
    const wallCtx = wallCanvas.getContext('2d');
    const wallGrad = wallCtx.createLinearGradient(0, 0, 0, wh);
    wallGrad.addColorStop(0, '#c8d4dc');
    wallGrad.addColorStop(0.5, '#b8c4cc');
    wallGrad.addColorStop(1, '#a8b4bc');
    wallCtx.fillStyle = wallGrad;
    wallCtx.fillRect(0, 0, ww, wh);
    for (var row = 1; row <= 4; row++) {
        wallCtx.strokeStyle = 'rgba(100,140,180,0.14)';
        wallCtx.lineWidth = 1;
        wallCtx.beginPath();
        wallCtx.moveTo(0, (wh / 5) * row);
        wallCtx.lineTo(ww, (wh / 5) * row);
        wallCtx.stroke();
    }
    for (let i = 0; i < (ww * wh) / 120; i++) {
        wallCtx.fillStyle = `rgba(180,200,220,${0.03 + Math.random() * 0.05})`;
        wallCtx.fillRect(Math.random() * ww, Math.random() * wh, 2, 2);
    }
    const wallTexture = new THREE.CanvasTexture(wallCanvas);
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(2, 2);
    wallTexture.anisotropy = 16;
    var wallBumpCanvas = document.createElement('canvas');
    wallBumpCanvas.width = 128;
    wallBumpCanvas.height = 128;
    var wallBumpCtx = wallBumpCanvas.getContext('2d');
    for (var wy = 0; wy < 128; wy++) {
        for (var wx = 0; wx < 128; wx++) {
            var v = 128 + (Math.random() - 0.5) * 24;
            wallBumpCtx.fillStyle = 'rgb(' + (v|0) + ',' + (v|0) + ',' + (v|0) + ')';
            wallBumpCtx.fillRect(wx, wy, 1, 1);
        }
    }
    var wallBumpTex = new THREE.CanvasTexture(wallBumpCanvas);
    wallBumpTex.wrapS = wallBumpTex.wrapT = THREE.RepeatWrapping;
    wallBumpTex.repeat.set(2, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({
        map: wallTexture,
        bumpMap: wallBumpTex,
        bumpScale: 0.04,
        roughness: 0.9,
        metalness: 0
    });
    const wallGeometry = new THREE.PlaneGeometry(ROOM_W, ROOM_H);
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.z = -ROOM_D / 2;
    backWall.position.y = ROOM_H / 2;
    backWall.receiveShadow = castShadow;
    roomGroup.add(backWall);

    const leftWallGeom = new THREE.PlaneGeometry(ROOM_D, ROOM_H);
    const leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -ROOM_W / 2;
    leftWall.position.y = ROOM_H / 2;
    leftWall.receiveShadow = castShadow;
    roomGroup.add(leftWall);

    const rightWall = new THREE.Mesh(leftWallGeom, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = ROOM_W / 2;
    rightWall.position.y = ROOM_H / 2;
    rightWall.receiveShadow = castShadow;
    roomGroup.add(rightWall);

    // Front wall (with doorway to entry foyer)
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.rotation.y = Math.PI;
    frontWall.position.z = ROOM_D / 2;
    frontWall.position.y = ROOM_H / 2;
    frontWall.receiveShadow = castShadow;
    roomGroup.add(frontWall);
    
    // Front wall doorway opening (archway to entry)
    const frontDoorwayWidth = 2.5;
    const frontDoorwayHeight = 2.4;
    // Create front wall with doorway by using two wall pieces
    const frontWallLeft = new THREE.Mesh(
        new THREE.PlaneGeometry((ROOM_W - frontDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    frontWallLeft.rotation.y = Math.PI;
    frontWallLeft.position.set(-(ROOM_W + frontDoorwayWidth) / 4, ROOM_H / 2, ROOM_D / 2);
    frontWallLeft.receiveShadow = castShadow;
    roomGroup.add(frontWallLeft);
    
    const frontWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry((ROOM_W - frontDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    frontWallRight.rotation.y = Math.PI;
    frontWallRight.position.set((ROOM_W + frontDoorwayWidth) / 4, ROOM_H / 2, ROOM_D / 2);
    frontWallRight.receiveShadow = castShadow;
    roomGroup.add(frontWallRight);
    
    // Doorway arch top
    const frontArchTop = new THREE.Mesh(
        new THREE.BoxGeometry(frontDoorwayWidth + 0.2, 0.3, 0.2),
        wallMaterial
    );
    frontArchTop.position.set(0, ROOM_H - 0.15, ROOM_D / 2 - 0.1);
    roomGroup.add(frontArchTop);
    
    // Doorway sides
    const frontDoorwaySideL = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, frontDoorwayHeight, 0.2),
        wallMaterial
    );
    frontDoorwaySideL.position.set(-frontDoorwayWidth / 2, frontDoorwayHeight / 2, ROOM_D / 2 - 0.1);
    roomGroup.add(frontDoorwaySideL);
    
    const frontDoorwaySideR = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, frontDoorwayHeight, 0.2),
        wallMaterial
    );
    frontDoorwaySideR.position.set(frontDoorwayWidth / 2, frontDoorwayHeight / 2, ROOM_D / 2 - 0.1);
    roomGroup.add(frontDoorwaySideR);

    // --- Window (right wall): frame with wood grain, sill, glass, curtains with fabric ---
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = 256;
    frameCanvas.height = 128;
    const frameCtx = frameCanvas.getContext('2d');
    const frameGrad = frameCtx.createLinearGradient(0, 0, 256, 0);
    frameGrad.addColorStop(0, '#e8e2d8');
    frameGrad.addColorStop(0.5, '#f2ebe0');
    frameGrad.addColorStop(1, '#e0dac8');
    frameCtx.fillStyle = frameGrad;
    frameCtx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 200; i++) {
        frameCtx.fillStyle = `rgba(180,170,150,${0.03 + Math.random() * 0.05})`;
        frameCtx.fillRect(Math.random() * 256, Math.random() * 128, 1, 2);
    }
    const windowFrameTex = new THREE.CanvasTexture(frameCanvas);
    const windowFrameMat = new THREE.MeshStandardMaterial({
        map: windowFrameTex,
        roughness: 0.58,
        metalness: 0.02
    });
    const windowFrame = new THREE.Mesh(
        new THREE.BoxGeometry(2.3, 1.85, 0.08),
        windowFrameMat
    );
    windowFrame.position.set(ROOM_W / 2 - 0.04, ROOM_H * 0.45, -ROOM_D * 0.18);
    windowFrame.castShadow = true;
    roomGroup.add(windowFrame);
    const sillCanvas = document.createElement('canvas');
    sillCanvas.width = 128;
    sillCanvas.height = 32;
    const sillCtx = sillCanvas.getContext('2d');
    sillCtx.fillStyle = '#eae4da';
    sillCtx.fillRect(0, 0, 128, 32);
    for (let i = 0; i < 80; i++) {
        sillCtx.fillStyle = `rgba(200,190,175,${0.04 + Math.random() * 0.06})`;
        sillCtx.fillRect(Math.random() * 128, Math.random() * 32, 2, 1);
    }
    const windowSill = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.06, 0.2),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(sillCanvas), roughness: 0.65 })
    );
    windowSill.position.set(ROOM_W / 2 - 0.04, ROOM_H * 0.38, -ROOM_D * 0.18 + 0.1);
    windowSill.castShadow = true;
    roomGroup.add(windowSill);
    const windowGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(2.05, 1.65),
        new THREE.MeshStandardMaterial({
            color: 0x90b8e0,
            transparent: true,
            opacity: 0.7,
            roughness: 0.02,
            metalness: 0.14
        })
    );
    windowGlass.position.set(ROOM_W / 2 - 0.04, ROOM_H * 0.45, -ROOM_D * 0.18 + 0.04);
    roomGroup.add(windowGlass);
    const curtainCanvas = document.createElement('canvas');
    curtainCanvas.width = 128;
    curtainCanvas.height = 256;
    const curtainCtx = curtainCanvas.getContext('2d');
    curtainCtx.fillStyle = '#d8dce4';
    curtainCtx.fillRect(0, 0, 128, 256);
    for (let y = 0; y < 256; y += 4) {
        for (let x = 0; x < 128; x += 3) {
            curtainCtx.fillStyle = `rgba(220,228,240,${0.02 + Math.random() * 0.04})`;
            curtainCtx.fillRect(x, y, 2, 2);
        }
    }
    const curtainTex = new THREE.CanvasTexture(curtainCanvas);
    const curtainMat = new THREE.MeshStandardMaterial({
        map: curtainTex,
        color: 0xe4e8f0,
        roughness: 0.88,
        side: THREE.DoubleSide
    });
    const curtainL = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), curtainMat);
    curtainL.position.set(ROOM_W / 2 - 1.25, ROOM_H * 0.45, -ROOM_D * 0.18 + 0.02);
    curtainL.castShadow = true;
    roomGroup.add(curtainL);
    const curtainR = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.0), curtainMat.clone());
    curtainR.position.set(ROOM_W / 2 + 1.21, ROOM_H * 0.45, -ROOM_D * 0.18 + 0.02);
    curtainR.castShadow = true;
    roomGroup.add(curtainR);
    const windowLight = new THREE.DirectionalLight(0xb0d0ee, 0.26);
    windowLight.position.set(ROOM_W / 2 + 4, ROOM_H * 0.45, -ROOM_D * 0.18);
    scene.add(windowLight);

    // --- Smart motorized blinds (window) ---
    const blindsGroup = new THREE.Group();
    const blindSlatMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.85, metalness: 0.05 });
    const numSlats = 12;
    for (let i = 0; i < numSlats; i++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.04, 0.02), blindSlatMat);
        slat.position.set(0, -0.82 + i * 0.155, 0);
        slat.castShadow = true;
        blindsGroup.add(slat);
    }
    blindsGroup.position.set(ROOM_W / 2 - 0.04, ROOM_H * 0.45, -ROOM_D * 0.18 + 0.05);
    blindsGroup.rotation.y = 0;
    roomGroup.add(blindsGroup);
    roomDeviceRefs.blinds = blindsGroup;

    // --- Ceiling: futuristic cool white with subtle panel feel ---
    const ceilingCanvas = document.createElement('canvas');
    ceilingCanvas.width = Math.max(256, ceilingSize * 2);
    ceilingCanvas.height = Math.max(256, ceilingSize * 2);
    const cw = ceilingCanvas.width, ch = ceilingCanvas.height;
    const ceilingCtx = ceilingCanvas.getContext('2d');
    ceilingCtx.fillStyle = '#e8ecf0';
    ceilingCtx.fillRect(0, 0, cw, ch);
    for (let i = 0; i < (cw * ch) / 120; i++) {
        ceilingCtx.fillStyle = `rgba(220,228,240,${0.03 + Math.random() * 0.05})`;
        ceilingCtx.beginPath();
        ceilingCtx.arc(Math.random() * cw, Math.random() * ch, 0.5 + Math.random() * 1.2, 0, Math.PI * 2);
        ceilingCtx.fill();
    }
    for (let i = 0; i < (cw * ch) / 400; i++) {
        ceilingCtx.fillStyle = `rgba(200,210,225,${0.02 + Math.random() * 0.04})`;
        ceilingCtx.fillRect(Math.random() * cw, Math.random() * ch, 1, 1);
    }
    const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas);
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(3, 3);
    ceilingTexture.anisotropy = 16;
    var ceilBumpCanvas = document.createElement('canvas');
    ceilBumpCanvas.width = 64;
    ceilBumpCanvas.height = 64;
    var ceilBumpCtx = ceilBumpCanvas.getContext('2d');
    for (var cy = 0; cy < 64; cy++) {
        for (var cx = 0; cx < 64; cx++) {
            var cv = 128 + (Math.random() - 0.5) * 20;
            ceilBumpCtx.fillStyle = 'rgb(' + (cv|0) + ',' + (cv|0) + ',' + (cv|0) + ')';
            ceilBumpCtx.fillRect(cx, cy, 1, 1);
        }
    }
    var ceilingBumpTex = new THREE.CanvasTexture(ceilBumpCanvas);
    ceilingBumpTex.wrapS = ceilingBumpTex.wrapT = THREE.RepeatWrapping;
    ceilingBumpTex.repeat.set(3, 3);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
        map: ceilingTexture,
        bumpMap: ceilingBumpTex,
        bumpScale: 0.03,
        roughness: 0.84
    });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = ROOM_H;
    roomGroup.add(ceiling);

    // --- Baseboards (futuristic dark slate) ---
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = 512;
    baseCanvas.height = 32;
    const baseCtx = baseCanvas.getContext('2d');
    const baseGrad = baseCtx.createLinearGradient(0, 0, 512, 0);
    baseGrad.addColorStop(0, '#2a3240');
    baseGrad.addColorStop(0.5, '#343d4a');
    baseGrad.addColorStop(1, '#2c3542');
    baseCtx.fillStyle = baseGrad;
    baseCtx.fillRect(0, 0, 512, 32);
    for (let x = 0; x < 512; x += 3) {
        baseCtx.fillStyle = `rgba(40,55,75,${0.06 + Math.random() * 0.08})`;
        baseCtx.fillRect(x, 2, 1, 28);
    }
    const baseboardTex = new THREE.CanvasTexture(baseCanvas);
    baseboardTex.wrapS = THREE.RepeatWrapping;
    baseboardTex.repeat.set(4, 1);
    const baseboardMat = new THREE.MeshStandardMaterial({
        map: baseboardTex,
        roughness: 0.5,
        metalness: 0.08
    });
    const baseboardGeom = new THREE.BoxGeometry(ROOM_W + 0.2, 0.15, 0.1);
    const baseBack = new THREE.Mesh(baseboardGeom, baseboardMat);
    baseBack.position.set(0, 0.075, -ROOM_D / 2 + 0.05);
    roomGroup.add(baseBack);
    const baseLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, ROOM_D + 0.2), baseboardMat);
    baseLeft.position.set(-ROOM_W / 2 + 0.05, 0.075, 0);
    roomGroup.add(baseLeft);
    const baseRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, ROOM_D + 0.2), baseboardMat);
    baseRight.position.set(ROOM_W / 2 - 0.05, 0.075, 0);
    roomGroup.add(baseRight);

    // --- Wall outlet (back wall, behind console - lived-in detail) ---
    const outletPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.08, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
    );
    outletPlate.position.set(rx(0.6), ry(0.35), rz(-9.98));
    roomGroup.add(outletPlate);
    const outletSlot1 = new THREE.Mesh(
        new THREE.PlaneGeometry(0.04, 0.025),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    outletSlot1.position.set(rx(0.6), ry(0.35), rz(-9.97));
    roomGroup.add(outletSlot1);
    const outletSlot2 = outletSlot1.clone();
    outletSlot2.position.set(rx(0.66), ry(0.35), rz(-9.97));
    roomGroup.add(outletSlot2);

    // --- Area rug: futuristic dark base with cyan/blue accent ---
    const rugGeometry = new THREE.PlaneGeometry(5.5, 4);
    const rugCanvas = document.createElement('canvas');
    rugCanvas.width = 512;
    rugCanvas.height = 512;
    const rugCtx = rugCanvas.getContext('2d');
    rugCtx.fillStyle = '#1a2230';
    rugCtx.fillRect(0, 0, 512, 512);
    rugCtx.strokeStyle = 'rgba(60,140,200,0.35)';
    rugCtx.lineWidth = 12;
    rugCtx.strokeRect(12, 12, 488, 488);
    rugCtx.strokeStyle = 'rgba(80,180,240,0.2)';
    rugCtx.lineWidth = 4;
    rugCtx.strokeRect(18, 18, 476, 476);
    for (let i = 0; i < 512; i += 24) {
        rugCtx.strokeStyle = 'rgba(70,120,180,0.12)';
        rugCtx.lineWidth = 1;
        rugCtx.beginPath();
        rugCtx.moveTo(i, 0);
        rugCtx.lineTo(i, 512);
        rugCtx.stroke();
    }
    for (let i = 0; i < 512; i += 24) {
        rugCtx.beginPath();
        rugCtx.moveTo(0, i);
        rugCtx.lineTo(512, i);
        rugCtx.stroke();
    }
    for (let i = 0; i < 4000; i++) {
        rugCtx.fillStyle = `rgba(80,140,200,${0.02 + Math.random() * 0.04})`;
        rugCtx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }
    const rugTexture = new THREE.CanvasTexture(rugCanvas);
    var rugBumpCanvas = document.createElement('canvas');
    rugBumpCanvas.width = 256;
    rugBumpCanvas.height = 256;
    var rugBumpCtx = rugBumpCanvas.getContext('2d');
    for (var py = 0; py < 256; py++) {
        for (var px = 0; px < 256; px++) {
            var rv = 128 + (Math.sin(px * 0.08) * 8) + (Math.sin(py * 0.08) * 8) + (Math.random() - 0.5) * 12;
            rv = Math.max(0, Math.min(255, rv));
            rugBumpCtx.fillStyle = 'rgb(' + (rv|0) + ',' + (rv|0) + ',' + (rv|0) + ')';
            rugBumpCtx.fillRect(px, py, 1, 1);
        }
    }
    var rugBumpTex = new THREE.CanvasTexture(rugBumpCanvas);
    rugBumpTex.wrapS = rugBumpTex.wrapT = THREE.RepeatWrapping;
    const rugMat = new THREE.MeshStandardMaterial({
        map: rugTexture,
        bumpMap: rugBumpTex,
        bumpScale: 0.05,
        roughness: 0.88,
        metalness: 0
    });
    const rug = new THREE.Mesh(rugGeometry, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(rx(0), ry(0.006), rz(-2.15));
    rug.receiveShadow = true;
    roomGroup.add(rug);

    // --- Sofa (facing TV, detailed fabric-style materials) ---
    const sofaFabricCanvas = document.createElement('canvas');
    sofaFabricCanvas.width = 128;
    sofaFabricCanvas.height = 128;
    const sofaCtx = sofaFabricCanvas.getContext('2d');
    sofaCtx.fillStyle = '#352218';
    sofaCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
        sofaCtx.fillStyle = `rgba(60,35,25,${0.03 + Math.random() * 0.05})`;
        sofaCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const sofaFabricTex = new THREE.CanvasTexture(sofaFabricCanvas);
    sofaFabricTex.wrapS = sofaFabricTex.wrapT = THREE.RepeatWrapping;
    sofaFabricTex.repeat.set(2, 2);
    const sofaBaseMat = new THREE.MeshStandardMaterial({
        map: sofaFabricTex,
        color: 0x3a2618,
        roughness: 0.88,
        metalness: 0
    });
    const sofaBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.42, 1.15),
        sofaBaseMat
    );
    sofaBase.position.set(rx(0), ry(0.21), rz(-2.55));
    sofaBase.castShadow = true;
    sofaBase.receiveShadow = true;
    roomGroup.add(sofaBase);
    const sofaBack = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.9, 0.25),
        new THREE.MeshStandardMaterial({
            map: sofaFabricTex.clone(),
            color: 0x4a3020,
            roughness: 0.82,
            metalness: 0
        })
    );
    sofaBack.position.set(rx(0), ry(0.66), rz(-2.55));
    sofaBack.castShadow = true;
    roomGroup.add(sofaBack);
    const sofaCushion = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.18, 0.95),
        new THREE.MeshStandardMaterial({
            map: sofaFabricTex.clone(),
            color: 0x553828,
            roughness: 0.86,
            metalness: 0
        })
    );
    sofaCushion.position.set(rx(0), ry(0.525), rz(-2.55));
    sofaCushion.castShadow = true;
    roomGroup.add(sofaCushion);
    const armMat = new THREE.MeshStandardMaterial({
        map: sofaFabricTex.clone(),
        color: 0x453022,
        roughness: 0.82,
        metalness: 0
    });
    const armL = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.52, 1.15),
        armMat
    );
    armL.position.set(rx(-1.28), ry(0.48), rz(-2.55));
    armL.castShadow = true;
    roomGroup.add(armL);
    const armR = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.52, 1.15),
        armMat.clone()
    );
    armR.position.set(rx(1.28), ry(0.48), rz(-2.55));
    armR.castShadow = true;
    roomGroup.add(armR);

    // --- Coffee table (wood grain top, detailed legs) ---
    const tableTopCanvas = document.createElement('canvas');
    tableTopCanvas.width = 256;
    tableTopCanvas.height = 128;
    const tableTopCtx = tableTopCanvas.getContext('2d');
    tableTopCtx.fillStyle = '#1e1610';
    tableTopCtx.fillRect(0, 0, 256, 128);
    for (let x = 0; x < 256; x += 2) {
        tableTopCtx.fillStyle = `rgba(40,28,18,${0.06 + Math.random() * 0.08})`;
        tableTopCtx.fillRect(x, 4, 1, 120);
    }
    const tableTopTex = new THREE.CanvasTexture(tableTopCanvas);
    tableTopTex.wrapS = THREE.RepeatWrapping;
    tableTopTex.repeat.set(1.2, 0.8);
    const tableTop = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.06, 0.7),
        new THREE.MeshStandardMaterial({
            map: tableTopTex,
            color: 0x261c14,
            roughness: 0.32,
            metalness: 0.06
        })
    );
    tableTop.position.set(rx(0), ry(0.39), rz(-1.95));
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    roomGroup.add(tableTop);
    const tableLegGeom = new THREE.BoxGeometry(0.055, 0.33, 0.055);
    const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x2e2418, roughness: 0.52, metalness: 0.03 });
    [[-0.65, 0.2], [0.65, 0.2], [-0.65, -0.2], [0.65, -0.2]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(tableLegGeom, tableLegMat);
        leg.position.set(rx(x), ry(0.195), rz(-1.95 + z));
        leg.castShadow = true;
        roomGroup.add(leg);
    });
    // Coffee table props: mug, book, remote (smoother mug)
    const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.035, 0.1, 24),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.55, metalness: 0.02 })
    );
    mug.position.set(rx(-0.22), ry(0.435), rz(-1.95));
    mug.castShadow = true;
    roomGroup.add(mug);
    const mugHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.03, 0.008, 12, 24, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.55, metalness: 0.02 })
    );
    mugHandle.rotation.x = Math.PI / 2;
    mugHandle.position.set(rx(-0.17), ry(0.435), rz(-1.95));
    roomGroup.add(mugHandle);
    const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.028, 0.26),
        new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.8 })
    );
    book.position.set(rx(0.28), ry(0.42), rz(-2.08));
    book.rotation.y = -0.25;
    book.castShadow = true;
    roomGroup.add(book);
    const remoteProp = new THREE.Mesh(
        new THREE.BoxGeometry(0.11, 0.022, 0.038),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    remoteProp.position.set(rx(0.12), ry(0.418), rz(-1.82));
    remoteProp.rotation.y = 0.4;
    remoteProp.castShadow = true;
    roomGroup.add(remoteProp);

    // --- Side table + lamp (left of sofa, higher segment count) ---
    const sideTableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.35, 0.035, 32),
        new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.48, metalness: 0.04 })
    );
    sideTableTop.position.set(rx(-2.25), ry(0.5), rz(-2.55));
    sideTableTop.castShadow = true;
    roomGroup.add(sideTableTop);
    const sideTableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.48, 20),
        new THREE.MeshStandardMaterial({ color: 0x1a0f08, roughness: 0.58, metalness: 0.02 })
    );
    sideTableLeg.position.set(rx(-2.25), ry(0.25), rz(-2.55));
    sideTableLeg.castShadow = true;
    roomGroup.add(sideTableLeg);
    const lampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.14, 0.04, 24),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.28 })
    );
    lampBase.position.set(rx(-2.25), ry(0.54), rz(-2.55));
    roomGroup.add(lampBase);
    const lampPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.48, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.38 })
    );
    lampPole.position.set(rx(-2.25), ry(0.79), rz(-2.55));
    roomGroup.add(lampPole);
    const lampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.2, 24, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xfaf0e0,
            side: THREE.DoubleSide,
            roughness: 0.92,
            emissive: 0xffe8b8,
            emissiveIntensity: 0.18
        })
    );
    lampShade.position.set(rx(-2.25), ry(0.99), rz(-2.55));
    lampShade.castShadow = true;
    roomGroup.add(lampShade);
    roomDeviceRefs.lamp_left_shade = lampShade;
    const lampLight = new THREE.PointLight(0xffeedd, 0.45, 4.5);
    lampLight.position.set(rx(-2.25), ry(1.0), rz(-2.55));
    scene.add(lampLight);
    roomLights.lamp_left = lampLight;
    // Side table props: coaster, small book
    const coaster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 })
    );
    coaster.position.set(rx(-2.25), ry(0.525), rz(-2.52));
    roomGroup.add(coaster);
    const sideBook = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.85 })
    );
    sideBook.position.set(rx(-2.38), ry(0.535), rz(-2.58));
    sideBook.rotation.y = 0.6;
    sideBook.castShadow = true;
    roomGroup.add(sideBook);

    // --- Floor lamp (right side, smoother geometry) ---
    const floorLampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.04, 28),
        new THREE.MeshStandardMaterial({ color: 0x252525, metalness: 0.52, roughness: 0.36 })
    );
    floorLampBase.position.set(rx(3.5), ry(0.02), rz(-3));
    floorLampBase.castShadow = true;
    roomGroup.add(floorLampBase);
    const floorLampPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 1.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.4, roughness: 0.48 })
    );
    floorLampPole.position.set(rx(3.5), ry(0.74), rz(-3));
    roomGroup.add(floorLampPole);
    const floorLampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.3, 0.25, 24, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xf0e6d4,
            side: THREE.DoubleSide,
            roughness: 0.88,
            emissive: 0xf5e4a0,
            emissiveIntensity: 0.15
        })
    );
    floorLampShade.position.set(rx(3.5), ry(1.45), rz(-3));
    floorLampShade.castShadow = true;
    roomGroup.add(floorLampShade);
    roomDeviceRefs.lamp_right_shade = floorLampShade;
    const floorLampLight = new THREE.PointLight(0xffeedd, 0.4, 5.5);
    floorLampLight.position.set(rx(3.5), ry(1.4), rz(-3));
    scene.add(floorLampLight);
    roomLights.lamp_right = floorLampLight;

    // --- Potted plants (detailed pots, smoother foliage) ---
    function addPlant(x, z, scale) {
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2 * scale, 0.18 * scale, 0.25 * scale, 20),
            new THREE.MeshStandardMaterial({ color: 0x9c5c2e, roughness: 0.8, metalness: 0.02 })
        );
        pot.position.set(x, ry(0.125 * scale), z);
        pot.castShadow = true;
        roomGroup.add(pot);
        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.04 * scale, 20),
            new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.95 })
        );
        soil.position.set(x, ry(0.27 * scale), z);
        roomGroup.add(soil);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a5c28, roughness: 0.86 });
        const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x387238, roughness: 0.86 });
        const foliage1 = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 16, 14), leafMat);
        foliage1.position.set(x, ry(0.55 * scale), z);
        foliage1.castShadow = true;
        roomGroup.add(foliage1);
        const foliage2 = new THREE.Mesh(new THREE.SphereGeometry(0.2 * scale, 12, 10), leafMat2);
        foliage2.position.set(x + rx(0.15 * scale), ry(0.45 * scale), z + rz(-0.1 * scale));
        foliage2.castShadow = true;
        roomGroup.add(foliage2);
        const foliage3 = new THREE.Mesh(new THREE.SphereGeometry(0.18 * scale, 12, 10), leafMat2);
        foliage3.position.set(x + rx(-0.1 * scale), ry(0.5 * scale), z + rz(0.12 * scale));
        foliage3.castShadow = true;
        roomGroup.add(foliage3);
    }
    addPlant(rx(2.8), rz(-4.2), 0.9);
    addPlant(rx(-3), rz(-3.8), 0.7);

    // --- Wall art (back wall) with drawn canvas textures ---
    function makeArtTexture(w, h, draw) {
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        draw(ctx, w, h);
        return new THREE.CanvasTexture(c);
    }
    const frameMat = new THREE.MeshStandardMaterial({
        color: 0x4a3525,
        roughness: 0.65,
        metalness: 0.03
    });
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
    artLeft.position.set(rx(-4), ry(4.2), rz(-9.99));
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
    artRight.position.set(rx(4), ry(4.0), rz(-9.99));
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
    artSmall.position.set(rx(-5.5), ry(5.5), rz(-9.99));
    roomGroup.add(artSmall);

    // --- Shelf under TV (media console, futuristic dark slate) ---
    const consoleCanvas = document.createElement('canvas');
    consoleCanvas.width = 256;
    consoleCanvas.height = 64;
    const consoleCtx = consoleCanvas.getContext('2d');
    consoleCtx.fillStyle = '#1a2230';
    consoleCtx.fillRect(0, 0, 256, 64);
    for (let x = 0; x < 256; x += 2) {
        consoleCtx.fillStyle = `rgba(50,70,95,${0.05 + Math.random() * 0.08})`;
        consoleCtx.fillRect(x, 2, 1, 60);
    }
    const consoleTex = new THREE.CanvasTexture(consoleCanvas);
    consoleTex.wrapS = THREE.RepeatWrapping;
    consoleTex.repeat.set(1.5, 0.5);
    const consoleTop = new THREE.Mesh(
        new THREE.BoxGeometry(3.6, 0.08, 0.5),
        new THREE.MeshStandardMaterial({
            map: consoleTex,
            color: 0x1e2430,
            roughness: 0.4,
            metalness: 0.15
        })
    );
    consoleTop.position.set(rx(0), ry(0.44), rz(-8));
    consoleTop.castShadow = true;
    roomGroup.add(consoleTop);
    const consoleBody = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.36, 0.4),
        new THREE.MeshStandardMaterial({
            map: consoleTex.clone(),
            color: 0x252d3a,
            roughness: 0.5,
            metalness: 0.12
        })
    );
    consoleBody.position.set(rx(0), ry(0.22), rz(-8));
    consoleBody.castShadow = true;
    roomGroup.add(consoleBody);
    const setTopBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.06, 0.25),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    setTopBox.position.set(rx(-0.5), ry(0.47), rz(-8));
    setTopBox.castShadow = true;
    roomGroup.add(setTopBox);
    const speakerMat = new THREE.MeshStandardMaterial({ color: 0x252525, roughness: 0.5 });
    const speakerL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), speakerMat);
    speakerL.position.set(rx(-1.1), ry(0.455), rz(-8));
    speakerL.castShadow = true;
    roomGroup.add(speakerL);
    const speakerR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.2), speakerMat);
    speakerR.position.set(rx(1.1), ry(0.455), rz(-8));
    speakerR.castShadow = true;
    roomGroup.add(speakerR);
    const consoleBook = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.04, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.8 })
    );
    consoleBook.position.set(rx(0.4), ry(0.46), rz(-8));
    consoleBook.rotation.y = 0.2;
    consoleBook.castShadow = true;
    roomGroup.add(consoleBook);

    // --- Sofa cushions (two pillows, fabric texture) ---
    const pillowMat1 = new THREE.MeshStandardMaterial({
        map: sofaFabricTex.clone(),
        color: 0x6b4423,
        roughness: 0.88,
        metalness: 0
    });
    const throwPillow = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.12, 0.45),
        pillowMat1
    );
    throwPillow.position.set(rx(0.5), ry(0.6), rz(-2.55));
    throwPillow.rotation.y = 0.4;
    throwPillow.castShadow = true;
    roomGroup.add(throwPillow);
    const throwPillow2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.4),
        new THREE.MeshStandardMaterial({
            map: sofaFabricTex.clone(),
            color: 0x5a3d2a,
            roughness: 0.88,
            metalness: 0
        })
    );
    throwPillow2.position.set(rx(-0.6), ry(0.58), rz(-2.6));
    throwPillow2.rotation.y = -0.25;
    throwPillow2.castShadow = true;
    roomGroup.add(throwPillow2);

    // --- Ceiling light fixture (smoother geometry) ---
    const ceilingLightCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.32, roughness: 0.56 })
    );
    ceilingLightCable.position.set(rx(0), ry(9.8), rz(-3));
    roomGroup.add(ceilingLightCable);
    const ceilingLightShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.45, 0.2, 32, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xfaf6eb,
            side: THREE.DoubleSide,
            roughness: 0.88,
            emissive: 0xffeed8,
            emissiveIntensity: 0.22
        })
    );
    ceilingLightShade.position.set(rx(0), ry(9.6), rz(-3));
    ceilingLightShade.castShadow = true;
    roomGroup.add(ceilingLightShade);
    const ceilingPointLight = new THREE.PointLight(0xffeed8, 0.32, 9);
    ceilingPointLight.position.set(rx(0), ry(9.5), rz(-3));
    scene.add(ceilingPointLight);
    roomLights.ceiling = ceilingPointLight;

    // --- Extra room detail: smart home, more props, accent furniture ---

    // Smart speaker (on side table) - controllable: glow when TV active
    const speakerBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.09, 0.12, 16),
        new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            roughness: 0.4,
            metalness: 0.3,
            emissive: 0x2040a0,
            emissiveIntensity: 0
        })
    );
    speakerBody.position.set(rx(-2.25), ry(0.62), rz(-2.48));
    speakerBody.castShadow = true;
    roomGroup.add(speakerBody);
    roomDeviceRefs.smart_speaker = speakerBody;
    const speakerTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.08, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.5 })
    );
    speakerTop.position.set(rx(-2.25), ry(0.69), rz(-2.48));
    roomGroup.add(speakerTop);
    const smartSpeakerLight = new THREE.PointLight(0x4080ff, 0.08, 1.2);
    smartSpeakerLight.position.set(rx(-2.25), ry(0.68), rz(-2.48));
    scene.add(smartSpeakerLight);

    // Small candle on coffee table
    const candleStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.028, 0.12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: 0.7 })
    );
    candleStick.position.set(rx(-0.5), ry(0.45), rz(-1.9));
    candleStick.castShadow = true;
    roomGroup.add(candleStick);
    const candleFlame = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6622, emissiveIntensity: 0.4 })
    );
    candleFlame.position.set(rx(-0.5), ry(0.52), rz(-1.9));
    roomGroup.add(candleFlame);
    roomDeviceRefs.candle = candleFlame;

    // Small bowl on coffee table
    const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4),
        new THREE.MeshStandardMaterial({ color: 0xc4a574, roughness: 0.6, metalness: 0.05 })
    );
    bowl.position.set(rx(0.45), ry(0.44), rz(-2.02));
    bowl.rotation.x = Math.PI / 2;
    bowl.castShadow = true;
    roomGroup.add(bowl);

    // Throw blanket draped on sofa (folded rectangle)
    const blanket = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.06, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x5c4a38, roughness: 0.92 })
    );
    blanket.position.set(rx(-0.7), ry(0.57), rz(-2.72));
    blanket.rotation.set(0.1, 0.35, 0.05);
    blanket.castShadow = true;
    roomGroup.add(blanket);

    // Wall clock (back wall, above outlet)
    const clockBack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.03, 32),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.5 })
    );
    clockBack.rotation.x = Math.PI / 2;
    clockBack.position.set(rx(0), ry(1.6), rz(-9.97));
    clockBack.castShadow = true;
    roomGroup.add(clockBack);
    const clockFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32),
        new THREE.MeshStandardMaterial({ color: 0xfaf8f2, roughness: 0.8 })
    );
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(rx(0), ry(1.6), rz(-9.96));
    roomGroup.add(clockFace);
    const clockHandH = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.012, 0.005),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    clockHandH.position.set(rx(0.04), ry(1.6), rz(-9.955));
    clockHandH.rotation.z = -Math.PI / 6;
    roomGroup.add(clockHandH);
    const clockHandM = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.008, 0.004),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    clockHandM.position.set(rx(0.06), ry(1.6), rz(-9.955));
    clockHandM.rotation.z = Math.PI / 4;
    roomGroup.add(clockHandM);

    // Floating shelf (left wall) with books and small vase
    const shelfBoard = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.04, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x3d3020, roughness: 0.7 })
    );
    shelfBoard.position.set(rx(-9.97), ry(2.2), rz(-5));
    shelfBoard.rotation.y = Math.PI / 2;
    shelfBoard.castShadow = true;
    roomGroup.add(shelfBoard);
    const shelfBook1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.22, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x5a3d2a, roughness: 0.85 })
    );
    shelfBook1.position.set(rx(-9.96), ry(2.24), rz(-4.92));
    shelfBook1.rotation.y = Math.PI / 2;
    roomGroup.add(shelfBook1);
    const shelfBook2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.2, 0.035),
        new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.85 })
    );
    shelfBook2.position.set(rx(-9.96), ry(2.24), rz(-5.08));
    shelfBook2.rotation.y = Math.PI / 2;
    roomGroup.add(shelfBook2);
    const shelfVase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12),
        new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.5 })
    );
    shelfVase.position.set(rx(-9.96), ry(2.28), rz(-5));
    roomGroup.add(shelfVase);

    // Window sill plants (two small pots)
    function addSillPlant(xOff, scale) {
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06 * scale, 0.055 * scale, 0.08 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x7a5c3a, roughness: 0.8 })
        );
        pot.position.set(rx(9.95 + xOff), ry(3.58), rz(-3.85));
        pot.rotation.y = Math.PI / 2;
        roomGroup.add(pot);
        const soil = new THREE.Mesh(
            new THREE.CylinderGeometry(0.052 * scale, 0.052 * scale, 0.02 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.95 })
        );
        soil.position.set(rx(9.95 + xOff), ry(3.62), rz(-3.85));
        soil.rotation.y = Math.PI / 2;
        roomGroup.add(soil);
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(0.08 * scale, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3d6b38, roughness: 0.9 })
        );
        leaves.position.set(rx(9.95 + xOff), ry(3.68), rz(-3.85));
        leaves.rotation.y = Math.PI / 2;
        leaves.castShadow = true;
        roomGroup.add(leaves);
    }
    addSillPlant(0.4, 1);
    addSillPlant(-0.5, 0.85);

    // Power strip under console (visible cable management)
    const powerStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.05, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x353535, roughness: 0.6 })
    );
    powerStrip.position.set(rx(0.5), ry(0.18), rz(-7.75));
    powerStrip.castShadow = true;
    roomGroup.add(powerStrip);
    const stripLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, 0.01),
        new THREE.MeshStandardMaterial({ color: 0x00aa00, emissive: 0x008800, emissiveIntensity: 0.6 })
    );
    stripLed.position.set(rx(0.42), ry(0.205), rz(-7.74));
    roomGroup.add(stripLed);
    roomDeviceRefs.power_strip_led = stripLed;

    // Game controller on console
    const controllerBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    controllerBody.position.set(rx(-0.75), ry(0.47), rz(-7.95));
    controllerBody.rotation.y = 0.3;
    controllerBody.castShadow = true;
    roomGroup.add(controllerBody);
    const controllerStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.015, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a })
    );
    controllerStick.position.set(rx(-0.72), ry(0.485), rz(-7.95));
    roomGroup.add(controllerStick);

    // Smart hub on console (controllable: status LED when TV on)
    const smartHubBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 })
    );
    smartHubBody.position.set(rx(0.85), ry(0.47), rz(-7.95));
    roomGroup.add(smartHubBody);
    const smartHubLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x4080ff, emissive: 0x2060cc, emissiveIntensity: 0 })
    );
    smartHubLed.position.set(rx(0.85), ry(0.49), rz(-7.93));
    roomGroup.add(smartHubLed);
    roomDeviceRefs.smart_hub = smartHubLed;

    // Magazine / basket next to sofa (right side)
    const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.18, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b5344, roughness: 0.9 })
    );
    basket.position.set(rx(2.1), ry(0.145), rz(-2.5));
    basket.rotation.x = Math.PI / 2;
    basket.castShadow = true;
    roomGroup.add(basket);
    const mag1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.28, 0.015),
        new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.85 })
    );
    mag1.position.set(rx(2.12), ry(0.2), rz(-2.45));
    mag1.rotation.y = -0.2;
    roomGroup.add(mag1);

    // Accent armchair (corner, right side near window)
    const chairSeat = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.12, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.88 })
    );
    chairSeat.position.set(rx(5.5), ry(0.2), rz(-4.2));
    chairSeat.castShadow = true;
    roomGroup.add(chairSeat);
    const chairBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.55, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.85 })
    );
    chairBack.position.set(rx(5.5), ry(0.515), rz(-4.5));
    chairBack.castShadow = true;
    roomGroup.add(chairBack);
    const chairArmL = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.88 })
    );
    chairArmL.position.set(rx(5.18), ry(0.42), rz(-4.2));
    chairArmL.castShadow = true;
    roomGroup.add(chairArmL);
    const chairArmR = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.88 })
    );
    chairArmR.position.set(rx(5.82), ry(0.42), rz(-4.2));
    chairArmR.castShadow = true;
    roomGroup.add(chairArmR);

    // Thermostat / smart panel (back wall, left of outlet)
    const thermoPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.6 })
    );
    thermoPlate.position.set(rx(-0.5), ry(1.5), rz(-9.97));
    roomGroup.add(thermoPlate);
    const thermoScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.09, 0.11),
        new THREE.MeshStandardMaterial({ color: 0x203020, emissive: 0x102010, emissiveIntensity: 0.3 })
    );
    thermoScreen.position.set(rx(-0.5), ry(1.5), rz(-9.96));
    roomGroup.add(thermoScreen);
    roomDeviceRefs.thermostat = thermoScreen;

    // --- Central Smart Home panel (wall tablet: scenes, security, status) ---
    const smartPanelFrame = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.18, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4, metalness: 0.3 })
    );
    smartPanelFrame.position.set(rx(-9.96), ry(1.5), rz(-6));
    roomGroup.add(smartPanelFrame);
    const smartPanelScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x0a2030, emissive: 0x102840, emissiveIntensity: 0.35 })
    );
    smartPanelScreen.position.set(rx(-9.95), ry(1.5), rz(-5.99));
    roomGroup.add(smartPanelScreen);
    roomDeviceRefs.smart_panel = smartPanelScreen;

    // Third wall art (center, smaller - above console)
    const artCenter = new THREE.Group();
    const texCenter = makeArtTexture(100, 80, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#6b5a4a');
        g.addColorStop(0.6, '#8b7a6a');
        g.addColorStop(1, '#4a3d2e');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(w * 0.25, h * 0.2, w * 0.5, h * 0.5);
    });
    const frameCenter = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), frameMat);
    const imgCenter = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.32),
        new THREE.MeshStandardMaterial({ map: texCenter, roughness: 0.9 })
    );
    imgCenter.position.z = 0.01;
    artCenter.add(frameCenter);
    artCenter.add(imgCenter);
    artCenter.position.set(rx(0), ry(1.0), rz(-9.99));
    roomGroup.add(artCenter);

    // Small diffuser / object on side table
    const diffuser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.05, 0.08, 12),
        new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.7 })
    );
    diffuser.position.set(rx(-2.42), ry(0.56), rz(-2.6));
    roomGroup.add(diffuser);

    // Floor vent (right side)
    const ventGrille = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.02, 0.15),
        new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.7, metalness: 0.2 })
    );
    ventGrille.rotation.x = -Math.PI / 2;
    ventGrille.position.set(rx(4), ry(0.015), rz(-6));
    roomGroup.add(ventGrille);

    // Small side table next to accent chair (with tiny plant)
    const accentTableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.26, 0.04, 16),
        new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.6 })
    );
    accentTableTop.position.set(rx(5.5), ry(0.38), rz(-3.9));
    accentTableTop.castShadow = true;
    roomGroup.add(accentTableTop);
    const accentTableLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.34, 10),
        new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.55 })
    );
    accentTableLeg.position.set(rx(5.5), ry(0.19), rz(-3.9));
    roomGroup.add(accentTableLeg);
    const accentPlantPot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.07, 0.1, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8 })
    );
    accentPlantPot.position.set(rx(5.5), ry(0.43), rz(-3.9));
    roomGroup.add(accentPlantPot);
    const accentPlantLeaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x2d5a2d, roughness: 0.88 })
    );
    accentPlantLeaf.position.set(rx(5.5), ry(0.55), rz(-3.9));
    accentPlantLeaf.castShadow = true;
    roomGroup.add(accentPlantLeaf);

    // Tall plant in corner (left, near back)
    const cornerPot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.2, 0.35, 14),
        new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.82 })
    );
    cornerPot.position.set(rx(-4.5), ry(0.2), rz(-7.5));
    cornerPot.castShadow = true;
    roomGroup.add(cornerPot);
    const cornerSoil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.19, 0.19, 0.04, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.95 })
    );
    cornerSoil.position.set(rx(-4.5), ry(0.38), rz(-7.5));
    roomGroup.add(cornerSoil);
    const cornerFoliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x2a5c28, roughness: 0.9 })
    );
    cornerFoliage.position.set(rx(-4.5), ry(0.85), rz(-7.5));
    cornerFoliage.castShadow = true;
    roomGroup.add(cornerFoliage);
    const cornerFoliage2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x387238, roughness: 0.9 })
    );
    cornerFoliage2.position.set(rx(-4.3), ry(0.7), rz(-7.4));
    cornerFoliage2.castShadow = true;
    roomGroup.add(cornerFoliage2);

    // --- Controllable smart devices (driven by remote / TV state) ---

    // Ambient LED strip behind console (color follows app/channel)
    const ambientStripGeom = new THREE.BoxGeometry(3.2, 0.03, 0.08);
    const ambientStripMat = new THREE.MeshStandardMaterial({
        color: 0x4040ff,
        emissive: 0x2020aa,
        emissiveIntensity: 0,
        transparent: true,
        opacity: 0.95
    });
    const ambientStrip = new THREE.Mesh(ambientStripGeom, ambientStripMat);
    ambientStrip.position.set(rx(0), ry(0.52), rz(-7.85));
    roomGroup.add(ambientStrip);
    roomDeviceRefs.ambient_strip = ambientStrip;

    // Smart plug 2 (window sill) - LED on when "on"
    const smartPlug2Plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.1, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xe0e0dc, roughness: 0.6 })
    );
    smartPlug2Plate.position.set(rx(10.2), ry(3.45), rz(-3.7));
    smartPlug2Plate.rotation.y = Math.PI / 2;
    roomGroup.add(smartPlug2Plate);
    const smartPlug2Led = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00cc00, emissive: 0x008800, emissiveIntensity: 0 })
    );
    smartPlug2Led.position.set(rx(10.2), ry(3.48), rz(-3.7));
    smartPlug2Led.rotation.y = Math.PI / 2;
    roomGroup.add(smartPlug2Led);
    roomDeviceRefs.smart_plug_2 = smartPlug2Led;

    // Smart plug 3 (accent table) - LED on when "on"
    const smartPlug3Plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.1, 0.02),
        new THREE.MeshStandardMaterial({ color: 0xe0e0dc, roughness: 0.6 })
    );
    smartPlug3Plate.position.set(rx(5.35), ry(0.42), rz(-3.88));
    roomGroup.add(smartPlug3Plate);
    const smartPlug3Led = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x00cc00, emissive: 0x008800, emissiveIntensity: 0 })
    );
    smartPlug3Led.position.set(rx(5.35), ry(0.45), rz(-3.88));
    roomGroup.add(smartPlug3Led);
    roomDeviceRefs.smart_plug_3 = smartPlug3Led;

    // Smart bulb (visible in floor lamp) - brightness follows room "scene"
    const smartBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffeed8,
            emissiveIntensity: 0.3
        })
    );
    smartBulb.position.set(rx(3.5), ry(1.38), rz(-3));
    roomGroup.add(smartBulb);
    roomDeviceRefs.smart_bulb = smartBulb;

    // Smart bulb in side table lamp
    const sideLampBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 10, 10),
        new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffeed8,
            emissiveIntensity: 0.25
        })
    );
    sideLampBulb.position.set(rx(-2.25), ry(0.92), rz(-2.55));
    roomGroup.add(sideLampBulb);
    roomDeviceRefs.side_lamp_bulb = sideLampBulb;

    // Ceiling smart bulb (in fixture) - small glow disc
    const ceilingBulb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.15, 0.02, 24, 1, true),
        new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffeed8,
            emissiveIntensity: 0.2,
            side: THREE.DoubleSide
        })
    );
    ceilingBulb.position.set(rx(0), ry(9.55), rz(-3));
    roomGroup.add(ceilingBulb);
    roomDeviceRefs.ceiling_bulb = ceilingBulb;

    // --- Rug pattern final (stripes + double border + subtle weave) ---
    rugCtx.fillStyle = '#352a1e';
    rugCtx.fillRect(0, 0, 512, 512);
    rugCtx.fillStyle = '#4a3d2a';
    for (let i = 0; i < 512; i += 24) rugCtx.fillRect(0, i, 512, 12);
    rugCtx.fillStyle = '#3d3225';
    for (let i = 12; i < 512; i += 24) rugCtx.fillRect(0, i, 512, 12);
    rugCtx.strokeStyle = '#6b5a48';
    rugCtx.lineWidth = 10;
    rugCtx.strokeRect(10, 10, 492, 492);
    rugCtx.strokeStyle = '#5c4d38';
    rugCtx.lineWidth = 3;
    rugCtx.strokeRect(16, 16, 480, 480);
    for (let i = 0; i < 6000; i++) {
        rugCtx.fillStyle = `rgba(55,45,32,${0.015 + Math.random() * 0.025})`;
        rugCtx.fillRect(Math.random() * 512, Math.random() * 512, 1, 1);
    }
    rugTexture.needsUpdate = true;

    // Improve texture sharpness at angle (anisotropic filtering)
    var maxAni = 16;
    if (typeof renderer !== 'undefined' && renderer.capabilities && renderer.capabilities.getMaxAnisotropy) {
        maxAni = renderer.capabilities.getMaxAnisotropy();
    }
    if (floorTexture) floorTexture.anisotropy = maxAni;
    if (wallTexture) wallTexture.anisotropy = maxAni;
    if (ceilingTexture) ceilingTexture.anisotropy = maxAni;
    if (rugTexture) rugTexture.anisotropy = maxAni;
    if (baseboardTex) baseboardTex.anisotropy = maxAni;

    // ========== WHOLE HOUSE: hallway, kitchen, dining, entry ==========
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2e1f, roughness: 0.7, metalness: 0.05 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.6, metalness: 0.02 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.65, metalness: 0.04 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.75, metalness: 0.02 });
    const stainlessMat = new THREE.MeshStandardMaterial({ color: 0xc0c4c8, roughness: 0.35, metalness: 0.7 });

    // --- Left hallway: doorway frame, corridor floor/walls/ceiling, doors ---
    const corridorFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 7),
        new THREE.MeshStandardMaterial({ color: 0x2a2832, roughness: 0.88, metalness: 0 })
    );
    corridorFloor.rotation.x = -Math.PI / 2;
    corridorFloor.position.set(rx(-13), ry(0), rz(-6.5));
    corridorFloor.receiveShadow = true;
    roomGroup.add(corridorFloor);
    const corridorLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(7, 10), wallMaterial);
    corridorLeftWall.rotation.y = Math.PI / 2;
    corridorLeftWall.position.set(rx(-16), ry(5), rz(-6.5));
    corridorLeftWall.receiveShadow = true;
    roomGroup.add(corridorLeftWall);
    const corridorCeiling = new THREE.Mesh(new THREE.PlaneGeometry(6, 7), ceilingMaterial);
    corridorCeiling.rotation.x = Math.PI / 2;
    corridorCeiling.position.set(rx(-13), ry(10), rz(-6.5));
    roomGroup.add(corridorCeiling);
    // Corridor: motion sensor (wall) + smoke/CO detector (ceiling)
    const motionSensorBody = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.025), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5 }));
    motionSensorBody.position.set(rx(-12.7), ry(2.2), rz(-6.5));
    roomGroup.add(motionSensorBody);
    const motionSensorLed = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x00aa33, emissiveIntensity: 0 }));
    motionSensorLed.position.set(rx(-12.68), ry(2.2), rz(-6.48));
    roomGroup.add(motionSensorLed);
    roomDeviceRefs.motion_sensor = motionSensorLed;
    const smokeDetectorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 16), new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.7 }));
    smokeDetectorBody.position.set(rx(-13), ry(9.85), rz(-6.5));
    roomGroup.add(smokeDetectorBody);
    const smokeDetectorLed = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), new THREE.MeshStandardMaterial({ color: 0x00ff44, emissive: 0x00cc33, emissiveIntensity: 0.4 }));
    smokeDetectorLed.position.set(rx(-13), ry(9.82), rz(-6.45));
    roomGroup.add(smokeDetectorLed);
    roomDeviceRefs.smoke_detector = smokeDetectorLed;
    const doorJambMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.6 });
    const jambW = 0.08;
    const jambH = 2.2;
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, jambW, jambW), doorJambMat);
    archTop.position.set(rx(-9.98), ry(5.1), rz(-5));
    roomGroup.add(archTop);
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(jambW, jambH, jambW), doorJambMat);
    jambL.position.set(rx(-9.98), ry(3.9), rz(-5.5));
    roomGroup.add(jambL);
    const jambR = new THREE.Mesh(new THREE.BoxGeometry(jambW, jambH, jambW), doorJambMat);
    jambR.position.set(rx(-9.98), ry(3.9), rz(-4.5));
    roomGroup.add(jambR);
    [[-5.5, 'bedroom'], [-8, 'bathroom']].forEach(([z, _]) => {
        const frameTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), doorJambMat);
        frameTop.position.set(rx(-13), ry(5.03), rz(z));
        roomGroup.add(frameTop);
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), doorJambMat);
        frameL.position.set(rx(-13.35), ry(3.95), rz(z));
        roomGroup.add(frameL);
        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.06), doorJambMat);
        frameR.position.set(rx(-12.65), ry(3.95), rz(z));
        roomGroup.add(frameR);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.02, 0.04), darkWoodMat);
        door.position.set(rx(-13), ry(3.95), rz(z));
        door.castShadow = true;
        roomGroup.add(door);
    });
    // Bedroom: complete bedroom with all walls
    const bedroomFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        new THREE.MeshStandardMaterial({ color: 0x2a2832, roughness: 0.88 })
    );
    bedroomFloor.rotation.x = -Math.PI / 2;
    bedroomFloor.position.set(rx(-14.2), ry(0), rz(-5.5));
    bedroomFloor.receiveShadow = true;
    roomGroup.add(bedroomFloor);
    
    const bedroomWall1 = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 10),
        wallMaterial
    );
    bedroomWall1.position.set(rx(-14.2), ry(5), rz(-7.5));
    bedroomWall1.receiveShadow = true;
    roomGroup.add(bedroomWall1);
    
    const bedroomWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 10),
        wallMaterial
    );
    bedroomWall2.rotation.y = Math.PI / 2;
    bedroomWall2.position.set(rx(-16.2), ry(5), rz(-5.5));
    bedroomWall2.receiveShadow = true;
    roomGroup.add(bedroomWall2);
    
    const bedroomWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 10),
        wallMaterial
    );
    bedroomWall3.position.set(rx(-14.2), ry(5), rz(-3.5));
    bedroomWall3.receiveShadow = true;
    roomGroup.add(bedroomWall3);
    
    const bedroomCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        ceilingMaterial
    );
    bedroomCeiling.rotation.x = Math.PI / 2;
    bedroomCeiling.position.set(rx(-14.2), ry(10), rz(-5.5));
    roomGroup.add(bedroomCeiling);
    
    // Bedroom glimpse: bed + nightstand through first door
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 2), woodMat);
    bedBase.position.set(rx(-14.2), ry(0.08), rz(-5.5));
    bedBase.castShadow = true;
    roomGroup.add(bedBase);
    const bedMattress = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.9), new THREE.MeshStandardMaterial({ color: 0xf8f6f2, roughness: 0.9 }));
    bedMattress.position.set(rx(-14.2), ry(0.28), rz(-5.5));
    bedMattress.castShadow = true;
    roomGroup.add(bedMattress);
    const bedHeadboard = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.9, 0.08), woodMat);
    bedHeadboard.position.set(rx(-14.2), ry(0.55), rz(-6.5));
    bedHeadboard.castShadow = true;
    roomGroup.add(bedHeadboard);
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.4), woodMat);
    nightstand.position.set(rx(-15), ry(0.25), rz(-5.5));
    nightstand.castShadow = true;
    roomGroup.add(nightstand);
    const bedroomLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xf5e6d3, emissive: 0x202010, emissiveIntensity: 0.15 }));
    bedroomLampShade.position.set(rx(-15), ry(0.58), rz(-5.5));
    bedroomLampShade.castShadow = true;
    roomGroup.add(bedroomLampShade);
    roomDeviceRefs.bedroom_lamp = bedroomLampShade;
    
    // Bedroom dresser
    const bedroomDresser = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.8, 0.5),
        woodMat
    );
    bedroomDresser.position.set(rx(-12.5), ry(0.4), rz(-5.5));
    bedroomDresser.castShadow = true;
    roomGroup.add(bedroomDresser);
    
    // Bedroom window
    const bedroomWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x90b8e0, transparent: true, opacity: 0.7 })
    );
    bedroomWindow.position.set(rx(-16.15), ry(1.0), rz(-5.5));
    roomGroup.add(bedroomWindow);
    
    // Corridor bathroom: complete bathroom
    const corridorBathroomFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        tileMat
    );
    corridorBathroomFloor.rotation.x = -Math.PI / 2;
    corridorBathroomFloor.position.set(rx(-13), ry(0), rz(-8));
    corridorBathroomFloor.receiveShadow = true;
    roomGroup.add(corridorBathroomFloor);
    
    const corridorBathroomWall1 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 10),
        whiteMat
    );
    corridorBathroomWall1.position.set(rx(-13), ry(5), rz(-9.5));
    roomGroup.add(corridorBathroomWall1);
    
    const corridorBathroomWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 10),
        whiteMat
    );
    corridorBathroomWall2.rotation.y = Math.PI / 2;
    corridorBathroomWall2.position.set(rx(-14.5), ry(5), rz(-8));
    roomGroup.add(corridorBathroomWall2);
    
    const corridorBathroomWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 10),
        whiteMat
    );
    corridorBathroomWall3.rotation.y = -Math.PI / 2;
    corridorBathroomWall3.position.set(rx(-11.5), ry(5), rz(-8));
    roomGroup.add(corridorBathroomWall3);
    
    const corridorBathroomCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        ceilingMaterial
    );
    corridorBathroomCeiling.rotation.x = Math.PI / 2;
    corridorBathroomCeiling.position.set(rx(-13), ry(10), rz(-8));
    roomGroup.add(corridorBathroomCeiling);
    
    // Corridor bathroom sink
    const corridorBathroomSink = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.4),
        whiteMat
    );
    corridorBathroomSink.position.set(rx(-13), ry(0.175), rz(-6.8));
    corridorBathroomSink.castShadow = true;
    roomGroup.add(corridorBathroomSink);
    
    // Corridor bathroom toilet
    const corridorBathroomToilet = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.5),
        whiteMat
    );
    corridorBathroomToilet.position.set(rx(-11.8), ry(0.2), rz(-8));
    corridorBathroomToilet.castShadow = true;
    roomGroup.add(corridorBathroomToilet);
    
    // Corridor bathroom mirror
    const corridorBathroomMirror = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.4),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 })
    );
    corridorBathroomMirror.position.set(rx(-13), ry(0.5), rz(-6.8));
    roomGroup.add(corridorBathroomMirror);
    
    // Corridor bathroom shower
    const corridorBathroomShower = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.4, 0.8),
        whiteMat
    );
    corridorBathroomShower.position.set(rx(-14.2), ry(0.2), rz(-8));
    corridorBathroomShower.castShadow = true;
    roomGroup.add(corridorBathroomShower);

    // --- Laundry Room (off kitchen, with doorway) ---
    const laundryFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        tileMat
    );
    laundryFloor.rotation.x = -Math.PI / 2;
    laundryFloor.position.set(rx(9.75), ry(0), rz(-1));
    laundryFloor.receiveShadow = true;
    roomGroup.add(laundryFloor);
    
    const laundryDoorwayWidth = 1.0;
    // Laundry wall with doorway
    const laundryWall1Left = new THREE.Mesh(
        new THREE.PlaneGeometry((3 - laundryDoorwayWidth) / 2, ROOM_H),
        whiteMat
    );
    laundryWall1Left.position.set(rx(9.75), ry(ROOM_H / 2), rz(1.25));
    roomGroup.add(laundryWall1Left);
    
    const laundryWall1Right = new THREE.Mesh(
        new THREE.PlaneGeometry((3 - laundryDoorwayWidth) / 2, ROOM_H),
        whiteMat
    );
    laundryWall1Right.position.set(rx(9.75), ry(ROOM_H / 2), rz(-0.25));
    roomGroup.add(laundryWall1Right);
    
    const laundryDoorwayArch = new THREE.Mesh(
        new THREE.BoxGeometry(laundryDoorwayWidth + 0.15, 0.25, 0.15),
        whiteMat
    );
    laundryDoorwayArch.position.set(rx(9.75), ry(ROOM_H - 0.125), rz(0.5));
    roomGroup.add(laundryDoorwayArch);
    
    const laundryWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, ROOM_H),
        whiteMat
    );
    laundryWall2.rotation.y = Math.PI / 2;
    laundryWall2.position.set(rx(11.25), ry(ROOM_H / 2), rz(-1));
    roomGroup.add(laundryWall2);
    
    const laundryWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, ROOM_H),
        whiteMat
    );
    laundryWall3.position.set(rx(9.75), ry(ROOM_H / 2), rz(-2.5));
    roomGroup.add(laundryWall3);
    
    const laundryCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        ceilingMaterial
    );
    laundryCeiling.rotation.x = Math.PI / 2;
    laundryCeiling.position.set(rx(9.75), ry(ROOM_H), rz(-1));
    roomGroup.add(laundryCeiling);
    
    // Washer
    const washer = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.85, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.4, metalness: 0.3 })
    );
    washer.position.set(rx(10.5), ry(0.425), rz(-1.5));
    washer.castShadow = true;
    roomGroup.add(washer);
    
    // Dryer
    const dryer = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.85, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 })
    );
    dryer.position.set(rx(9), ry(0.425), rz(-1.5));
    dryer.castShadow = true;
    roomGroup.add(dryer);
    
    // Laundry room shelf
    const laundryShelf = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.04, 0.3),
        woodMat
    );
    laundryShelf.position.set(rx(9.75), ry(1.2), rz(-1.5));
    laundryShelf.castShadow = true;
    roomGroup.add(laundryShelf);
    
    // --- Office/Study (right side of living room, with doorway) ---
    const officeFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.85 })
    );
    officeFloor.rotation.x = -Math.PI / 2;
    officeFloor.position.set(rx(6), ry(0), rz(2));
    officeFloor.receiveShadow = true;
    roomGroup.add(officeFloor);
    
    const officeDoorwayWidth = 1.2;
    // Office wall with doorway to living room
    const officeWall1Left = new THREE.Mesh(
        new THREE.PlaneGeometry((6 - officeDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    officeWall1Left.position.set(rx(6), ry(ROOM_H / 2), rz(5.4));
    officeWall1Left.receiveShadow = true;
    roomGroup.add(officeWall1Left);
    
    const officeWall1Right = new THREE.Mesh(
        new THREE.PlaneGeometry((6 - officeDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    officeWall1Right.position.set(rx(6), ry(ROOM_H / 2), rz(3.6));
    officeWall1Right.receiveShadow = true;
    roomGroup.add(officeWall1Right);
    
    const officeDoorwayArch = new THREE.Mesh(
        new THREE.BoxGeometry(officeDoorwayWidth + 0.2, 0.3, 0.2),
        wallMaterial
    );
    officeDoorwayArch.position.set(rx(6), ry(ROOM_H - 0.15), rz(4.5));
    roomGroup.add(officeDoorwayArch);
    
    const officeWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(5, ROOM_H),
        wallMaterial
    );
    officeWall2.rotation.y = -Math.PI / 2;
    officeWall2.position.set(rx(9), ry(ROOM_H / 2), rz(2));
    officeWall2.receiveShadow = true;
    roomGroup.add(officeWall2);
    
    const officeWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(6, ROOM_H),
        wallMaterial
    );
    officeWall3.position.set(rx(6), ry(ROOM_H / 2), rz(-0.5));
    officeWall3.receiveShadow = true;
    roomGroup.add(officeWall3);
    
    const officeCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        ceilingMaterial
    );
    officeCeiling.rotation.x = Math.PI / 2;
    officeCeiling.position.set(rx(6), ry(ROOM_H), rz(2));
    roomGroup.add(officeCeiling);
    
    // Office desk
    const officeDesk = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.75, 0.7),
        woodMat
    );
    officeDesk.position.set(rx(7.5), ry(0.375), rz(2));
    officeDesk.castShadow = true;
    roomGroup.add(officeDesk);
    
    // Office chair
    const officeChairSeat = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.05, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 })
    );
    officeChairSeat.position.set(rx(6.5), ry(0.425), rz(2));
    officeChairSeat.castShadow = true;
    roomGroup.add(officeChairSeat);
    
    const officeChairBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 })
    );
    officeChairBack.position.set(rx(6.5), ry(0.75), rz(1.75));
    officeChairBack.castShadow = true;
    roomGroup.add(officeChairBack);
    
    // Office bookshelf
    const officeBookshelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.5, 1.2),
        woodMat
    );
    officeBookshelf.position.set(rx(8.5), ry(0.75), rz(2));
    officeBookshelf.castShadow = true;
    roomGroup.add(officeBookshelf);
    
    // Office window
    const officeWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x90b8e0, transparent: true, opacity: 0.7 })
    );
    officeWindow.position.set(rx(8.95), ry(1.0), rz(2));
    roomGroup.add(officeWindow);
    
    // Office lamp
    const officeLampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.3, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5 })
    );
    officeLampBase.position.set(rx(7.5), ry(0.75), rz(1.8));
    roomGroup.add(officeLampBase);
    
    const officeLampShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.15, 0.15, 16, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xf5e6d3, emissive: 0xffeed8, emissiveIntensity: 0.2 })
    );
    officeLampShade.position.set(rx(7.5), ry(0.925), rz(1.8));
    officeLampShade.castShadow = true;
    roomGroup.add(officeLampShade);
    
    const officeLampLight = new THREE.PointLight(0xffeed8, 0.25, 3);
    officeLampLight.position.set(rx(7.5), ry(0.9), rz(1.8));
    scene.add(officeLampLight);
    roomLights.office = officeLampLight;

    // --- Stairs (left side, from corridor up to second floor) ---
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x3a3530, roughness: 0.8, metalness: 0.05 });
    const numSteps = 14;
    const stepW = 1.0;
    const stepD = 0.35;
    const stepH = 10 / numSteps;
    for (let i = 0; i < numSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stairMat);
        step.position.set(rx(-14.5), ry(stepH * (i + 0.5)), rz(-2.2 - i * stepD));
        step.castShadow = true;
        roomGroup.add(step);
    }
    const railPostMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.5, metalness: 0.2 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, numSteps * stepD + 0.5), railPostMat);
    rail.position.set(rx(-14.5 + stepW * 0.5 + 0.1), ry(5), rz(-2.2 - (numSteps * stepD) * 0.5));
    roomGroup.add(rail);

    // --- Upstairs: landing, hallway, bedroom, bathroom ---
    const upstairsFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.85, metalness: 0 })
    );
    upstairsFloor.rotation.x = -Math.PI / 2;
    upstairsFloor.position.set(rx(-8), ry(10), rz(-5));
    upstairsFloor.receiveShadow = true;
    roomGroup.add(upstairsFloor);
    const upstairsWallBack = new THREE.Mesh(new THREE.PlaneGeometry(12, 4), wallMaterial);
    upstairsWallBack.rotation.y = 0;
    upstairsWallBack.position.set(rx(-8), ry(12), rz(-9));
    roomGroup.add(upstairsWallBack);
    const upstairsWallLeft = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), wallMaterial);
    upstairsWallLeft.rotation.y = Math.PI / 2;
    upstairsWallLeft.position.set(rx(-14), ry(12), rz(-5));
    roomGroup.add(upstairsWallLeft);
    const upstairsCeiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), ceilingMaterial);
    upstairsCeiling.rotation.x = Math.PI / 2;
    upstairsCeiling.position.set(rx(-8), ry(14), rz(-5));
    roomGroup.add(upstairsCeiling);
    const upstairsHallLight = new THREE.PointLight(0xf8f4e8, 0, 6);
    upstairsHallLight.position.set(rx(-8), ry(13.2), rz(-5));
    scene.add(upstairsHallLight);
    roomLights.upstairs_hall = upstairsHallLight;
    const upstairsBedroomLight = new THREE.PointLight(0xf8f4e8, 0, 5);
    upstairsBedroomLight.position.set(rx(-12), ry(13), rz(-6));
    scene.add(upstairsBedroomLight);
    roomLights.upstairs_bedroom = upstairsBedroomLight;
    const upstairsBathroomLight = new THREE.PointLight(0xe8f4ff, 0, 4);
    upstairsBathroomLight.position.set(rx(-4), ry(13), rz(-7));
    scene.add(upstairsBathroomLight);
    roomLights.upstairs_bathroom = upstairsBathroomLight;
    const upstairsBed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 2), woodMat);
    upstairsBed.position.set(rx(-12), ry(10.1), rz(-6));
    roomGroup.add(upstairsBed);
    const upstairsNightstand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.35), woodMat);
    upstairsNightstand.position.set(rx(-13.2), ry(10.225), rz(-6));
    roomGroup.add(upstairsNightstand);
    const upstairsLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xf5e6d3, emissive: 0x202010, emissiveIntensity: 0 }));
    upstairsLampShade.position.set(rx(-13.2), ry(10.55), rz(-6));
    roomGroup.add(upstairsLampShade);
    roomDeviceRefs.upstairs_bedroom_lamp = upstairsLampShade;
    // Upstairs bathroom: complete bathroom
    const bathroomFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        tileMat
    );
    bathroomFloor.rotation.x = -Math.PI / 2;
    bathroomFloor.position.set(rx(-4), ry(10), rz(-7));
    bathroomFloor.receiveShadow = true;
    roomGroup.add(bathroomFloor);
    
    const bathroomWall1 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 4),
        whiteMat
    );
    bathroomWall1.position.set(rx(-4), ry(12), rz(-8.5));
    roomGroup.add(bathroomWall1);
    
    const bathroomWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 4),
        whiteMat
    );
    bathroomWall2.rotation.y = Math.PI / 2;
    bathroomWall2.position.set(rx(-5.5), ry(12), rz(-7));
    roomGroup.add(bathroomWall2);
    
    const bathroomWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 4),
        whiteMat
    );
    bathroomWall3.rotation.y = -Math.PI / 2;
    bathroomWall3.position.set(rx(-2.5), ry(12), rz(-7));
    roomGroup.add(bathroomWall3);
    
    const bathroomSink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), whiteMat);
    bathroomSink.position.set(rx(-4), ry(10.175), rz(-7));
    bathroomSink.castShadow = true;
    roomGroup.add(bathroomSink);
    
    // Bathroom mirror
    const bathroomMirror = new THREE.Mesh(
        new THREE.PlaneGeometry(0.6, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.7 })
    );
    bathroomMirror.position.set(rx(-4), ry(10.5), rz(-6.8));
    roomGroup.add(bathroomMirror);
    
    // Toilet
    const toiletBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.5),
        whiteMat
    );
    toiletBase.position.set(rx(-5), ry(10.2), rz(-7));
    toiletBase.castShadow = true;
    roomGroup.add(toiletBase);
    
    const toiletTank = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.3, 0.25),
        whiteMat
    );
    toiletTank.position.set(rx(-5), ry(10.45), rz(-6.75));
    roomGroup.add(toiletTank);
    
    // Shower/tub
    const tub = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.4, 1.2),
        whiteMat
    );
    tub.position.set(rx(-2.5), ry(10.2), rz(-7.5));
    tub.castShadow = true;
    roomGroup.add(tub);
    
    const bathroomLightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.15), new THREE.MeshStandardMaterial({ color: 0xf8f8f0, emissive: 0x404040, emissiveIntensity: 0 }));
    bathroomLightMesh.position.set(rx(-4), ry(13.8), rz(-7));
    roomGroup.add(bathroomLightMesh);
    roomDeviceRefs.upstairs_bathroom_light = bathroomLightMesh;
    
    // Upstairs bedroom: complete bedroom
    const upstairsBedroomFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.85 })
    );
    upstairsBedroomFloor.rotation.x = -Math.PI / 2;
    upstairsBedroomFloor.position.set(rx(-12), ry(10), rz(-6));
    upstairsBedroomFloor.receiveShadow = true;
    roomGroup.add(upstairsBedroomFloor);
    
    const upstairsBedroomWall1 = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        wallMaterial
    );
    upstairsBedroomWall1.position.set(rx(-12), ry(12), rz(-8));
    roomGroup.add(upstairsBedroomWall1);
    
    const upstairsBedroomWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 4),
        wallMaterial
    );
    upstairsBedroomWall2.rotation.y = Math.PI / 2;
    upstairsBedroomWall2.position.set(rx(-14), ry(12), rz(-6));
    roomGroup.add(upstairsBedroomWall2);
    
    // Upstairs bedroom dresser
    const upstairsDresser = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.7, 0.5),
        woodMat
    );
    upstairsDresser.position.set(rx(-10.5), ry(10.35), rz(-6));
    upstairsDresser.castShadow = true;
    roomGroup.add(upstairsDresser);
    
    // Upstairs bedroom window
    const upstairsWindow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.0),
        new THREE.MeshStandardMaterial({ color: 0x90b8e0, transparent: true, opacity: 0.7 })
    );
    upstairsWindow.position.set(rx(-13.95), ry(10.5), rz(-6));
    roomGroup.add(upstairsWindow);

    // --- Kitchen walls: separate kitchen from living room (with doorway) ---
    const kitchenDoorwayWidth = 2.0;
    // Kitchen wall left section
    const kitchenWall1Left = new THREE.Mesh(
        new THREE.PlaneGeometry((8 - kitchenDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    kitchenWall1Left.rotation.y = Math.PI / 2;
    kitchenWall1Left.position.set(rx(5), ry(ROOM_H / 2), rz(-2.5));
    kitchenWall1Left.receiveShadow = castShadow;
    roomGroup.add(kitchenWall1Left);
    
    // Kitchen wall right section
    const kitchenWall1Right = new THREE.Mesh(
        new THREE.PlaneGeometry((8 - kitchenDoorwayWidth) / 2, ROOM_H),
        wallMaterial
    );
    kitchenWall1Right.rotation.y = Math.PI / 2;
    kitchenWall1Right.position.set(rx(5), ry(ROOM_H / 2), rz(0.5));
    kitchenWall1Right.receiveShadow = castShadow;
    roomGroup.add(kitchenWall1Right);
    
    // Kitchen doorway arch
    const kitchenDoorwayArch = new THREE.Mesh(
        new THREE.BoxGeometry(kitchenDoorwayWidth + 0.2, 0.3, 0.2),
        wallMaterial
    );
    kitchenDoorwayArch.position.set(rx(5), ry(ROOM_H - 0.15), rz(-1));
    roomGroup.add(kitchenDoorwayArch);
    
    // Kitchen doorway sides
    const kitchenDoorwaySideL = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, ROOM_H - 0.3, 0.2),
        wallMaterial
    );
    kitchenDoorwaySideL.position.set(rx(5), ry((ROOM_H - 0.3) / 2 + 0.15), rz(-2.4));
    roomGroup.add(kitchenDoorwaySideL);
    
    const kitchenDoorwaySideR = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, ROOM_H - 0.3, 0.2),
        wallMaterial
    );
    kitchenDoorwaySideR.position.set(rx(5), ry((ROOM_H - 0.3) / 2 + 0.15), rz(0.4));
    roomGroup.add(kitchenDoorwaySideR);
    
    // Kitchen back wall (right side)
    const kitchenBackWall = new THREE.Mesh(
        new THREE.PlaneGeometry(12, ROOM_H),
        wallMaterial
    );
    kitchenBackWall.position.set(rx(9.75), ry(ROOM_H / 2), rz(-9.75));
    kitchenBackWall.receiveShadow = castShadow;
    roomGroup.add(kitchenBackWall);
    
    // Kitchen floor (tile)
    const kitchenFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 8),
        tileMat
    );
    kitchenFloor.rotation.x = -Math.PI / 2;
    kitchenFloor.position.set(rx(7.5), ry(0), rz(-5));
    kitchenFloor.receiveShadow = castShadow;
    roomGroup.add(kitchenFloor);
    
    // Kitchen ceiling
    const kitchenCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 8),
        ceilingMaterial
    );
    kitchenCeiling.rotation.x = Math.PI / 2;
    kitchenCeiling.position.set(rx(7.5), ry(ROOM_H), rz(-5));
    roomGroup.add(kitchenCeiling);
    
    // Dining room floor
    const diningFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        new THREE.MeshStandardMaterial({ color: 0x3a2e1f, roughness: 0.75, metalness: 0.02 })
    );
    diningFloor.rotation.x = -Math.PI / 2;
    diningFloor.position.set(rx(4), ry(0), rz(-6));
    diningFloor.receiveShadow = castShadow;
    roomGroup.add(diningFloor);
    
    // Dining room ceiling
    const diningCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 5),
        ceilingMaterial
    );
    diningCeiling.rotation.x = Math.PI / 2;
    diningCeiling.position.set(rx(4), ry(ROOM_H), rz(-6));
    roomGroup.add(diningCeiling);
    
    // Entry foyer floor
    const entryFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 5),
        new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.8, metalness: 0 })
    );
    entryFloor.rotation.x = -Math.PI / 2;
    entryFloor.position.set(rx(0), ry(0), rz(8));
    entryFloor.receiveShadow = castShadow;
    roomGroup.add(entryFloor);
    
    // Entry foyer ceiling
    const entryCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 5),
        ceilingMaterial
    );
    entryCeiling.rotation.x = Math.PI / 2;
    entryCeiling.position.set(rx(0), ry(ROOM_H), rz(8));
    roomGroup.add(entryCeiling);
    
    // Entry foyer walls
    const entryLeftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(5, ROOM_H),
        wallMaterial
    );
    entryLeftWall.rotation.y = Math.PI / 2;
    entryLeftWall.position.set(rx(-2), ry(ROOM_H / 2), rz(8));
    entryLeftWall.receiveShadow = castShadow;
    roomGroup.add(entryLeftWall);
    
    const entryRightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(5, ROOM_H),
        wallMaterial
    );
    entryRightWall.rotation.y = -Math.PI / 2;
    entryRightWall.position.set(rx(2), ry(ROOM_H / 2), rz(8));
    entryRightWall.receiveShadow = castShadow;
    roomGroup.add(entryRightWall);
    
    // Entry back wall (with front door)
    const entryBackWall = new THREE.Mesh(
        new THREE.PlaneGeometry(4, ROOM_H),
        wallMaterial
    );
    entryBackWall.position.set(rx(0), ry(ROOM_H / 2), rz(10.5));
    entryBackWall.receiveShadow = castShadow;
    roomGroup.add(entryBackWall);

    // --- Kitchen: island, counter + uppers, fridge, oven, hood, stools ---
    const islandTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.0), darkWoodMat);
    islandTop.position.set(rx(6.5), ry(0.92), rz(-5));
    islandTop.castShadow = true;
    roomGroup.add(islandTop);
    const islandBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.88, 0.9), whiteMat);
    islandBase.position.set(rx(6.5), ry(0.44), rz(-5));
    islandBase.castShadow = true;
    roomGroup.add(islandBase);
    const counterDepth = 0.5;
    for (let z = -2; z >= -8; z -= 1.5) {
        const lowerCab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, counterDepth), whiteMat);
        lowerCab.position.set(rx(9.75), ry(0.45), rz(z));
        lowerCab.castShadow = true;
        roomGroup.add(lowerCab);
        const upperCab = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.7, 0.35), whiteMat);
        upperCab.position.set(rx(9.75), ry(2.15), rz(z));
        roomGroup.add(upperCab);
    }
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.04, counterDepth + 0.1), tileMat);
    counterTop.position.set(9.75, 0.92, -5);
    roomGroup.add(counterTop);
    const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.85, 0.65), new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.3 }));
    fridge.position.set(rx(9.75), ry(0.925), rz(-7.5));
    fridge.castShadow = true;
    roomGroup.add(fridge);
    const fridgeLed = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe0e8ff, emissiveIntensity: 0 }));
    fridgeLed.position.set(rx(9.75), ry(1.2), rz(-7.15));
    roomGroup.add(fridgeLed);
    roomDeviceRefs.fridge_led = fridgeLed;
    const oven = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.55), stainlessMat);
    oven.position.set(rx(9.75), ry(1.17), rz(-4));
    roomGroup.add(oven);
    const ovenLed = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshStandardMaterial({ color: 0x202020, emissive: 0xffaa40, emissiveIntensity: 0 }));
    ovenLed.position.set(rx(9.75), ry(1.42), rz(-3.72));
    roomGroup.add(ovenLed);
    roomDeviceRefs.oven_led = ovenLed;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), stainlessMat);
    hood.position.set(rx(9.75), ry(2.5), rz(-4));
    roomGroup.add(hood);
    const hoodLight = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.1), new THREE.MeshStandardMaterial({ color: 0xf8f8f0, emissive: 0x404040, emissiveIntensity: 0 }));
    hoodLight.position.set(rx(9.75), ry(2.32), rz(-4));
    roomGroup.add(hoodLight);
    roomDeviceRefs.hood_light = hoodLight;
    // Under-cabinet smart LED strip (kitchen)
    const underCabinetStrip = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.015, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf8f4e8, emissiveIntensity: 0 })
    );
    underCabinetStrip.position.set(rx(9.75), ry(1.92), rz(-5));
    roomGroup.add(underCabinetStrip);
    roomDeviceRefs.under_cabinet_strip = underCabinetStrip;
    const kitchenPointLight = new THREE.PointLight(0xf8f4e8, 0, 5);
    kitchenPointLight.position.set(rx(8), ry(2.5), rz(-5));
    scene.add(kitchenPointLight);
    roomLights.kitchen = kitchenPointLight;
    [ -5.4, -5.9 ].forEach((z, i) => {
        const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5 }));
        seat.position.set(rx(6.5 + (i === 0 ? -0.5 : 0.5)), ry(0.25), rz(z));
        seat.castShadow = true;
        roomGroup.add(seat);
    });

    // --- Dining: table + 4 chairs + more details ---
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.9), woodMat);
    diningTable.position.set(rx(4), ry(0.75), rz(-6));
    diningTable.castShadow = true;
    roomGroup.add(diningTable);
    
    // Dining table legs
    [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12),
            woodMat
        );
        leg.position.set(rx(4 + x), ry(0.375), rz(-6 + z));
        leg.castShadow = true;
        roomGroup.add(leg);
    });
    
    // Dining room chandelier
    const chandelierCable = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.3, 8),
        new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5 })
    );
    chandelierCable.position.set(rx(4), ry(9.85), rz(-6));
    roomGroup.add(chandelierCable);
    const chandelierBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0xf5f0e8, emissive: 0xffeed8, emissiveIntensity: 0.2 })
    );
    chandelierBody.position.set(rx(4), ry(9.7), rz(-6));
    roomGroup.add(chandelierBody);
    const diningChandelierLight = new THREE.PointLight(0xffeed8, 0.3, 6);
    diningChandelierLight.position.set(rx(4), ry(9.65), rz(-6));
    scene.add(diningChandelierLight);
    roomLights.dining = diningChandelierLight;
    
    const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x4a3d2e, roughness: 0.8 });
    [[4.75, -5.6], [3.25, -5.6], [4.75, -6.4], [3.25, -6.4]].forEach(([x, z]) => {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.42), chairSeatMat);
        seat.position.set(rx(x), ry(0.775), rz(z));
        seat.castShadow = true;
        roomGroup.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.04), chairSeatMat);
        back.position.set(rx(x), ry(1.0), rz(z + (z > -6 ? -0.22 : 0.22)));
        back.castShadow = true;
        roomGroup.add(back);
        // Chair legs
        [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([lx, lz]) => {
            const chairLeg = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.015, 0.775, 8),
                chairSeatMat
            );
            chairLeg.position.set(rx(x + lx), ry(0.3875), rz(z + lz));
            chairLeg.castShadow = true;
            roomGroup.add(chairLeg);
        });
    });
    
    // Dining room sideboard/buffet
    const sideboard = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.9, 0.5),
        woodMat
    );
    sideboard.position.set(rx(1.5), ry(0.45), rz(-6));
    sideboard.castShadow = true;
    roomGroup.add(sideboard);
    
    // Dining room artwork
    const diningArtFrame = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.65 })
    );
    diningArtFrame.position.set(rx(1.5), ry(1.2), rz(-5.75));
    roomGroup.add(diningArtFrame);

    // --- Entry foyer: console table, front door frame, mirror, more details ---
    const consoleTable = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.45), woodMat);
    consoleTable.position.set(rx(0), ry(0.425), rz(7.5));
    consoleTable.castShadow = true;
    roomGroup.add(consoleTable);
    
    // Entry mirror above console
    const mirrorFrame = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.65 })
    );
    mirrorFrame.position.set(rx(0), ry(1.25), rz(7.48));
    roomGroup.add(mirrorFrame);
    const mirrorGlass = new THREE.Mesh(
        new THREE.PlaneGeometry(0.85, 1.15),
        new THREE.MeshStandardMaterial({ 
            color: 0x888888, 
            roughness: 0.1, 
            metalness: 0.9,
            transparent: true,
            opacity: 0.7
        })
    );
    mirrorGlass.position.set(rx(0), ry(1.25), rz(7.47));
    roomGroup.add(mirrorGlass);
    
    // Entry rug
    const entryRug = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x3a2e1f, roughness: 0.9 })
    );
    entryRug.rotation.x = -Math.PI / 2;
    entryRug.position.set(rx(0), ry(0.01), rz(8));
    entryRug.receiveShadow = true;
    roomGroup.add(entryRug);
    const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0xe0dcd2, roughness: 0.55 });
    const frontDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.12), doorFrameMat);
    frontDoorFrame.position.set(rx(0), ry(4.1), rz(9.92));
    roomGroup.add(frontDoorFrame);
    const frontDoor = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.1, 0.04), darkWoodMat);
    frontDoor.position.set(rx(0), ry(4.05), rz(9.96));
    roomGroup.add(frontDoor);
    // Smart door lock panel (keypad + status LED)
    const doorLockPanel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.4 }));
    doorLockPanel.position.set(rx(0.55), ry(1.2), rz(9.94));
    roomGroup.add(doorLockPanel);
    const doorLockLed = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 8), new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x00aa33, emissiveIntensity: 0.5 }));
    doorLockLed.position.set(rx(0.55), ry(1.22), rz(9.93));
    roomGroup.add(doorLockLed);
    roomDeviceRefs.door_lock = doorLockLed;
    // Video doorbell (smart doorbell with status LED)
    const doorbellBody = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.03), new THREE.MeshStandardMaterial({ color: 0x252528, roughness: 0.4 }));
    doorbellBody.position.set(rx(-0.42), ry(1.5), rz(9.94));
    roomGroup.add(doorbellBody);
    const doorbellLed = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), new THREE.MeshStandardMaterial({ color: 0x4080ff, emissive: 0x2060cc, emissiveIntensity: 0.3 }));
    doorbellLed.position.set(rx(-0.42), ry(1.52), rz(9.93));
    roomGroup.add(doorbellLed);
    roomDeviceRefs.doorbell = doorbellLed;
    const coatHook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x808080, metalness: 0.6, roughness: 0.4 }));
    coatHook.position.set(rx(0.4), ry(1.4), rz(7.5));
    roomGroup.add(coatHook);
    const entryLightFixture = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.15), new THREE.MeshStandardMaterial({ color: 0xf0f0e8, emissive: 0x303030, emissiveIntensity: 0 }));
    entryLightFixture.position.set(rx(0), ry(9.9), rz(8));
    roomGroup.add(entryLightFixture);
    roomDeviceRefs.entry_light = entryLightFixture;
    const entryPointLight = new THREE.PointLight(0xf8f4e8, 0, 4);
    entryPointLight.position.set(rx(0), ry(9.5), rz(8));
    scene.add(entryPointLight);
    roomLights.entry = entryPointLight;
    const corridorBathroomLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0xf8f8f0, emissive: 0x404040, emissiveIntensity: 0 }));
    corridorBathroomLight.position.set(rx(-13), ry(9.95), rz(-8));
    roomGroup.add(corridorBathroomLight);
    roomDeviceRefs.bathroom_light = corridorBathroomLight;
    const corridorBathroomPoint = new THREE.PointLight(0xe8f4ff, 0, 4);
    corridorBathroomPoint.position.set(rx(-13), ry(9.5), rz(-8));
    scene.add(corridorBathroomPoint);
    roomLights.bathroom = corridorBathroomPoint;
    const bedroomPointLight = new THREE.PointLight(0xf8f4e8, 0, 4);
    bedroomPointLight.position.set(rx(-14.2), ry(2), rz(-5.5));
    scene.add(bedroomPointLight);
    roomLights.bedroom = bedroomPointLight;
    const upstairsHallLightMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.12), new THREE.MeshStandardMaterial({ color: 0xf8f8f0, emissive: 0x404040, emissiveIntensity: 0 }));
    upstairsHallLightMesh.position.set(rx(-8), ry(13.95), rz(-5));
    roomGroup.add(upstairsHallLightMesh);
    roomDeviceRefs.upstairs_hall_light = upstairsHallLightMesh;
    
    // --- Upstairs hallway: complete hallway with walls ---
    const upstairsHallWallRight = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 4),
        wallMaterial
    );
    upstairsHallWallRight.rotation.y = -Math.PI / 2;
    upstairsHallWallRight.position.set(rx(-2), ry(12), rz(-5));
    roomGroup.add(upstairsHallWallRight);
    
    // Upstairs hallway floor extension
    const upstairsHallFloorExt = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 8),
        new THREE.MeshStandardMaterial({ color: 0x2e2a26, roughness: 0.85 })
    );
    upstairsHallFloorExt.rotation.x = -Math.PI / 2;
    upstairsHallFloorExt.position.set(rx(-2), ry(10), rz(-5));
    upstairsHallFloorExt.receiveShadow = true;
    roomGroup.add(upstairsHallFloorExt);
    
    // Upstairs hallway ceiling extension
    const upstairsHallCeilingExt = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 8),
        ceilingMaterial
    );
    upstairsHallCeilingExt.rotation.x = Math.PI / 2;
    upstairsHallCeilingExt.position.set(rx(-2), ry(14), rz(-5));
    roomGroup.add(upstairsHallCeilingExt);
    
    // --- Garage (attached to house, accessible from entry) ---
    const garageFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    );
    garageFloor.rotation.x = -Math.PI / 2;
    garageFloor.position.set(rx(-4), ry(0), rz(8));
    garageFloor.receiveShadow = true;
    roomGroup.add(garageFloor);
    
    const garageWall1 = new THREE.Mesh(
        new THREE.PlaneGeometry(8, ROOM_H),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
    );
    garageWall1.position.set(rx(-4), ry(ROOM_H / 2), rz(11));
    roomGroup.add(garageWall1);
    
    const garageWall2 = new THREE.Mesh(
        new THREE.PlaneGeometry(6, ROOM_H),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
    );
    garageWall2.rotation.y = Math.PI / 2;
    garageWall2.position.set(rx(-8), ry(ROOM_H / 2), rz(8));
    roomGroup.add(garageWall2);
    
    const garageWall3 = new THREE.Mesh(
        new THREE.PlaneGeometry(8, ROOM_H),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 })
    );
    garageWall3.position.set(rx(-4), ry(ROOM_H / 2), rz(5));
    roomGroup.add(garageWall3);
    
    const garageCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(8, 6),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    );
    garageCeiling.rotation.x = Math.PI / 2;
    garageCeiling.position.set(rx(-4), ry(ROOM_H), rz(8));
    roomGroup.add(garageCeiling);
    
    // Garage door (large opening)
    const garageDoorFrame = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2.5, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 })
    );
    garageDoorFrame.position.set(rx(-4), ry(4.25), rz(10.9));
    roomGroup.add(garageDoorFrame);
    
    // Garage workbench
    const garageWorkbench = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.9, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 })
    );
    garageWorkbench.position.set(rx(-6.5), ry(0.45), rz(8));
    garageWorkbench.castShadow = true;
    roomGroup.add(garageWorkbench);
    
    // Garage storage shelves
    const garageShelf = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 1.5, 2),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 })
    );
    garageShelf.position.set(rx(-7.5), ry(0.75), rz(7));
    garageShelf.castShadow = true;
    roomGroup.add(garageShelf);
    
    // Garage light
    const garageLight = new THREE.PointLight(0xf8f4e8, 0.2, 8);
    garageLight.position.set(rx(-4), ry(9), rz(8));
    scene.add(garageLight);
    roomLights.garage = garageLight;

    // ========== AUTONOMOUS EVERYTHING: robot dogs, toaster, fridge, sensors, autonomous furniture, carpet bot ==========
    roomGroup.userData.roomScale = { rx, ry, rz };
    createAutonomousEntities(roomGroup);

    scene.add(roomGroup);
}

function createAutonomousEntities(roomGroup) {
    const scale = roomGroup.userData.roomScale;
    const rx = scale ? scale.rx : (x => x);
    const ry = scale ? scale.ry : (y => y);
    const rz = scale ? scale.rz : (z => z);

    const metalDark = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.35, metalness: 0.8 });
    const metalLight = new THREE.MeshStandardMaterial({ color: 0x505058, roughness: 0.3, metalness: 0.85 });
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, emissive: 0x0088cc, emissiveIntensity: 0.6 });
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.4, metalness: 0.6 });
    const sensorLedMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00cc66, emissiveIntensity: 0.3 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.65, metalness: 0.04 });

    // --- Robot dog 1 (living room, near sofa) ---
    function makeRobotDog(x, z, name) {
        const dog = new THREE.Group();
        dog.userData.phase = Math.random() * Math.PI * 2;
        dog.userData.tailPhase = Math.random() * Math.PI * 2;
        dog.userData.legPhase = Math.random() * Math.PI * 2;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.5), metalDark);
        body.position.y = 0.2;
        body.castShadow = true;
        dog.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), metalLight);
        head.position.set(0, 0.28, 0.28);
        head.castShadow = true;
        dog.add(head);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        eyeL.position.set(-0.05, 0.02, 0.12);
        head.add(eyeL);
        const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
        eyeR.position.set(0.05, 0.02, 0.12);
        head.add(eyeR);
        const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.2, 6), metalDark);
        tail.position.set(0, 0.22, -0.32);
        tail.rotation.x = 0.4;
        dog.add(tail);
        dog.userData.tail = tail;
        [-1, 1].forEach((s, i) => {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), metalDark);
            leg.position.set(s * 0.14, 0.07, 0.15 + i * 0.2);
            dog.add(leg);
            dog.userData['legF' + i] = leg;
            const legB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.06), metalDark);
            legB.position.set(s * 0.14, 0.07, -0.15 - i * 0.2);
            dog.add(legB);
            dog.userData['legB' + i] = legB;
        });
        dog.position.set(x, 0, z);
        dog.rotation.y = Math.PI * 0.5;
        roomGroup.add(dog);
        autonomousEntities.push({
            group: dog,
            update: function(time) {
                const p = dog.userData.phase + time * 0.8;
                dog.userData.phase = p;
                dog.position.y = 0.02 * Math.sin(time * 2.5);
                if (dog.userData.tail) {
                    dog.userData.tail.rotation.x = 0.4 + 0.35 * Math.sin(time * 4);
                }
                [0, 1].forEach(i => {
                    const legF = dog.userData['legF' + i];
                    const legB = dog.userData['legB' + i];
                    if (legF) legF.rotation.x = 0.15 * Math.sin(time * 5 + i * Math.PI);
                    if (legB) legB.rotation.x = 0.15 * Math.sin(time * 5 + Math.PI * 0.5 + i * Math.PI);
                });
            }
        });
    }
    makeRobotDog(rx(1.8), rz(-2.2), 'dog1');
    makeRobotDog(rx(-1.2), rz(-3.8), 'dog2');

    // --- Robot cat (smaller, kitchen area) ---
    const cat = new THREE.Group();
    cat.userData.phase = 0;
    const catBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.38), metalDark);
    catBody.position.y = 0.14;
    cat.add(catBody);
    const catHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), metalLight);
    catHead.position.set(0, 0.2, 0.22);
    cat.add(catHead);
    const catEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeMat);
    catEyeL.position.set(-0.03, 0.01, 0.08);
    catHead.add(catEyeL);
    const catEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeMat);
    catEyeR.position.set(0.03, 0.01, 0.08);
    catHead.add(catEyeR);
    const catTail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.18, 6), metalDark);
    catTail.position.set(0, 0.16, -0.28);
    catTail.rotation.x = 0.5;
    cat.add(catTail);
    cat.userData.baseY = ry(0.95);
    cat.position.set(rx(7.8), cat.userData.baseY, rz(-4.5));
    cat.rotation.y = -0.4;
    roomGroup.add(cat);
    autonomousEntities.push({
        group: cat,
        update: function(time) {
            cat.position.y = cat.userData.baseY + 0.012 * Math.sin(time * 2);
            catTail.rotation.x = 0.5 + 0.25 * Math.sin(time * 3.5);
        }
    });

    // --- Robot toaster (kitchen counter: face + small arms) ---
    const toaster = new THREE.Group();
    const toasterBody = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.14), new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.4, metalness: 0.6 }));
    toasterBody.castShadow = true;
    toaster.add(toasterBody);
    const toasterFace = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.08), new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 0.5 }));
    toasterFace.position.set(0, 0, 0.08);
    toaster.add(toasterFace);
    const toasterEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat.clone());
    toasterEyeL.position.set(-0.03, 0.02, 0.09);
    toaster.add(toasterEyeL);
    const toasterEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat.clone());
    toasterEyeR.position.set(0.03, 0.02, 0.09);
    toaster.add(toasterEyeR);
    const toasterAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), metalDark);
    toasterAntenna.position.set(0, 0.1, 0);
    toaster.add(toasterAntenna);
    const toasterAntennaBall = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), sensorLedMat);
    toasterAntennaBall.position.y = 0.03;
    toasterAntenna.add(toasterAntennaBall);
    toaster.userData.baseY = ry(0.99);
    toaster.position.set(rx(9.2), toaster.userData.baseY, rz(-3.2));
    toaster.rotation.y = Math.PI * 0.5;
    roomGroup.add(toaster);
    autonomousEntities.push({
        group: toaster,
        update: function(time) {
            toaster.position.y = toaster.userData.baseY + 0.008 * Math.sin(time * 1.8);
            toasterAntenna.rotation.z = 0.1 * Math.sin(time * 2);
            const blink = Math.sin(time * 5) > 0.7 ? 0.2 : 0.6;
            toasterEyeL.material.emissiveIntensity = blink;
            toasterEyeR.material.emissiveIntensity = blink;
        }
    });

    // --- Robot fridge face (panel on fridge door) ---
    const robotFridgeFace = new THREE.Group();
    const fridgePanel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.3, metalness: 0.7 }));
    robotFridgeFace.add(fridgePanel);
    const fridgeScreenMat = new THREE.MeshStandardMaterial({ color: 0x102020, emissive: 0x0a3040, emissiveIntensity: 0.15 });
    const fridgeScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.22), fridgeScreenMat);
    fridgeScreen.position.z = 0.012;
    robotFridgeFace.add(fridgeScreen);
    const fridgeEyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), eyeMat.clone());
    fridgeEyeL.position.set(-0.06, 0.05, 0.015);
    robotFridgeFace.add(fridgeEyeL);
    const fridgeEyeR = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), eyeMat.clone());
    fridgeEyeR.position.set(0.06, 0.05, 0.015);
    robotFridgeFace.add(fridgeEyeR);
    const fridgeStripMat = new THREE.MeshStandardMaterial({ color: 0x00aacc, emissive: 0x0088aa, emissiveIntensity: 0.2 });
    const fridgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.01), fridgeStripMat);
    fridgeStrip.position.set(0, -0.12, 0.015);
    robotFridgeFace.add(fridgeStrip);
    robotFridgeFace.position.set(rx(9.73), ry(1.35), rz(-7.18));
    roomGroup.add(robotFridgeFace);
    autonomousEntities.push({
        group: robotFridgeFace,
        update: function(time) {
            const scan = (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.15;
            fridgeScreen.material.emissiveIntensity = 0.1 + scan;
            fridgeEyeL.material.emissiveIntensity = 0.4 + 0.2 * Math.sin(time * 2);
            fridgeEyeR.material.emissiveIntensity = 0.4 + 0.2 * Math.sin(time * 2 + 0.5);
            fridgeStrip.material.emissiveIntensity = 0.15 + 0.1 * Math.sin(time * 3);
        }
    });

    // --- Sensors everywhere (walls + ceiling, dome with LED) ---
    const sensorPositions = [
        { pos: [-9.5, 4.5, -2], wall: true }, { pos: [-9.5, 4.5, -6], wall: true },
        { pos: [9.5, 4.5, -3], wall: true }, { pos: [9.5, 3, -7], wall: true },
        { pos: [0, 9.8, -8], wall: false }, { pos: [-5, 9.8, -4], wall: false },
        { pos: [5, 9.8, -5], wall: false }, { pos: [-13, 4, -5], wall: true },
        { pos: [-8, 13.8, -5], wall: false }, { pos: [4, 7.5, 8], wall: true },
        { pos: [8.5, 9.8, -5], wall: false }, { pos: [-3, 4.5, -9.5], wall: true },
        { pos: [0, 4, 9.5], wall: true },
    ];
    const sensorMeshes = [];
    sensorPositions.forEach((s, i) => {
        const sensor = new THREE.Group();
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), sensorMat);
        dome.castShadow = true;
        sensor.add(dome);
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), sensorLedMat.clone());
        led.position.set(0, 0, 0.04);
        sensor.add(led);
        sensor.position.set(rx(s.pos[0]), ry(s.pos[1]), rz(s.pos[2]));
        if (s.wall) sensor.rotation.x = -Math.PI / 2;
        roomGroup.add(sensor);
        sensorMeshes.push({ sensor: sensor, led: led, phase: i * 0.7 });
    });
    autonomousEntities.push({
        group: new THREE.Group(),
        update: function(time) {
            sensorMeshes.forEach(function(s) {
                const blink = 0.15 + 0.25 * (Math.sin(time * 4 + s.phase) > 0.5 ? 1 : 0);
                s.led.material.emissiveIntensity = blink;
            });
        }
    });

    // --- Autonomous bed (upstairs: mechanical base + headboard tilt) ---
    const autoBed = new THREE.Group();
    const bedBaseMech = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 2.05), metalDark);
    bedBaseMech.position.y = 0.06;
    bedBaseMech.castShadow = true;
    autoBed.add(bedBaseMech);
    const bedActuator = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.15, 8), metalLight);
    bedActuator.position.set(0, 0.15, -0.6);
    autoBed.add(bedActuator);
    const bedHeadTilt = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.08), metalDark);
    bedHeadTilt.position.set(0, 0.4, -0.98);
    autoBed.add(bedHeadTilt);
    autoBed.userData.headTilt = bedHeadTilt;
    const bedLedMat = sensorLedMat.clone();
    const bedLed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), bedLedMat);
    bedLed.position.set(0.35, 0.08, 0);
    autoBed.add(bedLed);
    autoBed.position.set(rx(-12), ry(10.08), rz(-6));
    roomGroup.add(autoBed);
    autonomousEntities.push({
        group: autoBed,
        update: function(time) {
            autoBed.userData.headTilt.rotation.x = 0.05 * Math.sin(time * 0.5);
            bedLedMat.emissiveIntensity = 0.2 + 0.15 * Math.sin(time * 2);
        }
    });

    // --- Autonomous desk (living: height-adjustable + LED strip) ---
    const autoDesk = new THREE.Group();
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), darkWoodMat);
    deskTop.position.y = 0.72;
    deskTop.castShadow = true;
    autoDesk.add(deskTop);
    const deskLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), metalDark);
    deskLeg1.position.set(-0.42, 0.34, -0.22);
    autoDesk.add(deskLeg1);
    const deskLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), metalDark);
    deskLeg2.position.set(0.42, 0.34, -0.22);
    autoDesk.add(deskLeg2);
    const deskLeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), metalDark);
    deskLeg3.position.set(-0.42, 0.34, 0.22);
    autoDesk.add(deskLeg3);
    const deskLeg4 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), metalDark);
    deskLeg4.position.set(0.42, 0.34, 0.22);
    autoDesk.add(deskLeg4);
    const deskStripMat = new THREE.MeshStandardMaterial({ color: 0x00aacc, emissive: 0x006688, emissiveIntensity: 0.25 });
    const deskStrip = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.015, 0.02), deskStripMat);
    deskStrip.position.set(0, 0.74, -0.24);
    autoDesk.add(deskStrip);
    autoDesk.position.set(-4.5, 0, -5);
    roomGroup.add(autoDesk);
    autonomousEntities.push({
        group: autoDesk,
        update: function(time) {
            const bob = 0.01 * Math.sin(time * 1.2);
            autoDesk.position.y = bob;
            deskStripMat.emissiveIntensity = 0.2 + 0.12 * Math.sin(time * 2.5);
        }
    });

    // --- Autonomous carpet bot (floor cleaner, circular path) ---
    const carpetBot = new THREE.Group();
    const botBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 24), metalLight);
    botBody.castShadow = true;
    carpetBot.add(botBody);
    const botDome = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), sensorMat);
    botDome.position.y = 0.06;
    carpetBot.add(botDome);
    const botEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    botEye.position.set(0, 0.12, 0.1);
    carpetBot.add(botEye);
    const botLedMat = sensorLedMat.clone();
    const botLed = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 8, 24), botLedMat);
    botLed.rotation.x = Math.PI / 2;
    botLed.position.y = 0.05;
    carpetBot.add(botLed);
    carpetBot.userData.pathPhase = Math.random() * Math.PI * 2;
    roomGroup.add(carpetBot);
    autonomousEntities.push({
        group: carpetBot,
        update: function(time) {
            const phase = carpetBot.userData.pathPhase + time * 0.1;
            carpetBot.userData.pathPhase = phase;
            const r = 2.2;
            const oldX = carpetBot.position.x;
            const oldZ = carpetBot.position.z;
            carpetBot.position.set(Math.cos(phase) * r, 0.04 + 0.008 * Math.sin(time * 6), -2.5 + Math.sin(phase) * r * 0.6);
            // Rotate to face direction of movement
            const dx = carpetBot.position.x - oldX;
            const dz = carpetBot.position.z - oldZ;
            if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                carpetBot.rotation.y = Math.atan2(dx, dz);
            }
            botLedMat.emissiveIntensity = 0.25 + 0.15 * Math.sin(time * 4);
        }
    });

    // --- Second carpet bot (corridor) ---
    const carpetBot2 = new THREE.Group();
    const bot2Body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), metalDark);
    bot2Body.castShadow = true;
    carpetBot2.add(bot2Body);
    const bot2Dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), sensorMat);
    bot2Dome.position.y = 0.05;
    carpetBot2.add(bot2Dome);
    const bot2LedMat = sensorLedMat.clone();
    const bot2Led = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.008, 6, 20), bot2LedMat);
    bot2Led.rotation.x = Math.PI / 2;
    bot2Led.position.y = 0.04;
    carpetBot2.add(bot2Led);
    carpetBot2.userData.pathPhase = Math.PI;
    roomGroup.add(carpetBot2);
    autonomousEntities.push({
        group: carpetBot2,
        update: function(time) {
            const phase = carpetBot2.userData.pathPhase + time * 0.08;
            carpetBot2.userData.pathPhase = phase;
            const oldX = carpetBot2.position.x;
            const oldZ = carpetBot2.position.z;
            carpetBot2.position.set(-12.5 + Math.sin(phase) * 1.5, 0.03, -5.5 + Math.cos(phase * 0.7) * 1.2);
            // Rotate to face direction of movement
            const dx = carpetBot2.position.x - oldX;
            const dz = carpetBot2.position.z - oldZ;
            if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
                carpetBot2.rotation.y = Math.atan2(dx, dz);
            }
            bot2LedMat.emissiveIntensity = 0.2 + 0.1 * Math.sin(time * 5);
        }
    });
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
    
    // Position TV in room (use global scaled position)
    tvGroup.position.set(TV_POSITION.x, TV_POSITION.y, TV_POSITION.z);
    tvGroup.rotation.y = 0;
    
    tvMesh = tvGroup;
    scene.add(tvMesh);
}

// Create 3D Remote Control
