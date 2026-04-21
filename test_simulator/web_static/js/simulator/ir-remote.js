// Helper function to get button symbol/icon
function getButtonSymbol(buttonCode, buttonName) {
    const symbols = {
        // Basic controls
        0x10: '⏻', // Power
        0x11: '🔊', // Volume Up
        0x12: '🔉', // Volume Down
        0x13: '🔇', // Mute
        0x14: '⬆', // Channel Up
        0x15: '⬇', // Channel Down
        // Navigation
        0x20: '🏠', // Home
        0x21: '☰', // Menu
        0x22: '◀', // Back
        0x23: '✕', // Exit
        0x24: '⚙', // Options
        0x25: '📥', // Input
        0x26: '📺', // Source
        // D-pad
        0x30: '▲', // Up
        0x31: '▼', // Down
        0x32: '◀', // Left
        0x33: '▶', // Right
        0x34: '✓', // OK
        0x35: '↵', // Enter
        // Playback
        0x40: '▶', // Play
        0x41: '⏸', // Pause
        0x42: '⏹', // Stop
        0x43: '⏩', // Fast Forward
        0x44: '⏪', // Rewind
        0x45: '●', // Record
        // Streaming
        0x01: 'YT', // YouTube
        0x02: 'NF', // Netflix
        0x03: 'PR', // Amazon Prime
        0x04: 'HB', // HBO Max
        0x05: 'DS', // Disney+
        0x06: 'AP', // Apple TV+
        0x07: 'HL', // Hulu
        0x08: 'PC', // Peacock
        // New features
        0x7C: '📋', // Record List
        0x7D: '📅', // Schedule
        0x7E: '⏰', // Sleep Timer
        0x7F: '⏱', // Timer Menu
        // Gaming
        0xA1: '🎮', // Game 1
        0xA2: '🎮', // Game 2
        0xA3: '🎮', // Game 3
        0xA4: '📕', // Game Guide
        // Connectivity
        0xD3: '📱', // Cast
        0xD4: '📲', // Screen Share
        0xD5: 'HDR', // HDR Mode
        0xD6: 'HG', // HDR Game
        0xD7: 'HF', // HDR Film
        // Picture
        0xB0: '🎬', // Motion
        // Smart Home - Scenes
        0xE0: '🎬', // Movie
        0xE1: '😌', // Relax
        0xE2: '🌙', // Off
        0xE3: '💡', // Lights Dim
        0xE4: '💡', // Lights Full
        // Smart Home - Devices
        0xE5: '🔌', // Plug 1
        0xE6: '🔊', // Speaker
        0xE7: '🌈', // Ambient
        0xE8: '🔌', // Plug 2
        0xE9: '🔌', // Plug 3
        0xEA: '💡', // Kitchen Light
        0xEB: '❄', // Fridge
        0xEC: '🔥', // Oven
        0xED: '💡', // Bedroom Lamp
        0xEE: '💡', // Bathroom Light
        0xEF: '💡', // Upstairs Hall
        0xF0: '💡', // Entry Light
        0xF1: '💡', // Upstairs Bedroom
        0xF2: '💡', // Upstairs Bathroom
        0xF3: '💡', // Hood Light
        0xF4: '🌡', // Thermostat Up
        0xF5: '🌡', // Thermostat Down
        0xF6: '❄', // AC On
        0xF7: '🔥', // Heating On
        0xF8: '🚗', // Garage Door
        0xF9: '🔒', // Door Lock
        0xFA: '🛡', // Security Arm
        0xFB: '🪟', // Blinds Open
        0xFC: '🪟', // Blinds Close
        0xFD: '🌀', // Ceiling Fan
        0xFE: '💡', // Living Room Light
        0xFF: '💡', // Dining Room Light
    };
    return symbols[buttonCode] || buttonName.substring(0, 2).toUpperCase();
}

function createRemoteControl() {
    remoteGroup = new THREE.Group();
    
    // Remote body - made larger to fit all buttons (0.4 wide, 1.4 tall)
    const bodyGeometry = new THREE.BoxGeometry(0.4, 1.4, 0.05, 8, 8, 1);
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
    const frontPanelGeometry = new THREE.PlaneGeometry(0.38, 1.38);
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
    logo.position.set(0, 0.65, 0.027);
    logo.raycast = function() {}; // don't block button clicks
    remoteGroup.add(logo);
    
    let yPos = 0.6; // Start from top
    
    // Power button (top center)
    const powerButton = createButtonWithSymbol(0.07, 0.07, 0x10, 'Power', 0xff0000);
    powerButton.position.set(0, yPos, 0.03);
    remoteGroup.add(powerButton);
    yPos -= 0.1;
    
    // Volume and Channel controls (row)
    const volUpButton = createButtonWithSymbol(0.05, 0.05, 0x11, 'Volume Up', 0x4CAF50);
    volUpButton.position.set(-0.12, yPos, 0.03);
    remoteGroup.add(volUpButton);
    
    const volDownButton = createButtonWithSymbol(0.05, 0.05, 0x12, 'Volume Down', 0xf44336);
    volDownButton.position.set(-0.12, yPos - 0.07, 0.03);
    remoteGroup.add(volDownButton);
    
    const muteButton = createButtonWithSymbol(0.05, 0.05, 0x13, 'Mute', 0xFF9800);
    muteButton.position.set(-0.12, yPos - 0.14, 0.03);
    remoteGroup.add(muteButton);
    
    const chUpButton = createButtonWithSymbol(0.05, 0.05, 0x14, 'Channel Up', 0x2196F3);
    chUpButton.position.set(0.12, yPos, 0.03);
    remoteGroup.add(chUpButton);
    
    const chDownButton = createButtonWithSymbol(0.05, 0.05, 0x15, 'Channel Down', 0x2196F3);
    chDownButton.position.set(0.12, yPos - 0.07, 0.03);
    remoteGroup.add(chDownButton);
    
    // Navigation buttons (center)
    const homeButton = createButtonWithSymbol(0.05, 0.05, 0x20, 'Home', 0xFFC107);
    homeButton.position.set(0, yPos, 0.03);
    remoteGroup.add(homeButton);
    
    const menuButton = createButtonWithSymbol(0.05, 0.05, 0x21, 'Menu', 0x9C27B0);
    menuButton.position.set(0, yPos - 0.07, 0.03);
    remoteGroup.add(menuButton);
    
    const backButton = createButtonWithSymbol(0.05, 0.05, 0x22, 'Back', 0x607D8B);
    backButton.position.set(0, yPos - 0.14, 0.03);
    remoteGroup.add(backButton);
    
    yPos -= 0.22;
    
    // D-pad
    const dpadSize = 0.05;
    const dpadY = yPos;
    const upButton = createButtonWithSymbol(dpadSize, dpadSize, 0x30, 'Up', 0x00BCD4);
    upButton.position.set(0, dpadY + 0.06, 0.03);
    remoteGroup.add(upButton);
    
    const leftButton = createButtonWithSymbol(dpadSize, dpadSize, 0x32, 'Left', 0x00BCD4);
    leftButton.position.set(-0.06, dpadY, 0.03);
    remoteGroup.add(leftButton);
    
    const okButton = createButtonWithSymbol(dpadSize, dpadSize, 0x34, 'OK', 0x4CAF50);
    okButton.position.set(0, dpadY, 0.03);
    remoteGroup.add(okButton);
    
    const rightButton = createButtonWithSymbol(dpadSize, dpadSize, 0x33, 'Right', 0x00BCD4);
    rightButton.position.set(0.06, dpadY, 0.03);
    remoteGroup.add(rightButton);
    
    const downButton = createButtonWithSymbol(dpadSize, dpadSize, 0x31, 'Down', 0x00BCD4);
    downButton.position.set(0, dpadY - 0.06, 0.03);
    remoteGroup.add(downButton);
    
    yPos -= 0.15;
    
    // Playback controls
    const playButton = createButtonWithSymbol(0.04, 0.04, 0x40, 'Play', 0x4CAF50);
    playButton.position.set(-0.09, yPos, 0.03);
    remoteGroup.add(playButton);
    
    const pauseButton = createButtonWithSymbol(0.04, 0.04, 0x41, 'Pause', 0xFF9800);
    pauseButton.position.set(-0.03, yPos, 0.03);
    remoteGroup.add(pauseButton);
    
    const stopButton = createButtonWithSymbol(0.04, 0.04, 0x42, 'Stop', 0xf44336);
    stopButton.position.set(0.03, yPos, 0.03);
    remoteGroup.add(stopButton);
    
    const ffButton = createButtonWithSymbol(0.04, 0.04, 0x43, 'Fast Forward', 0x2196F3);
    ffButton.position.set(0.09, yPos, 0.03);
    remoteGroup.add(ffButton);
    
    yPos -= 0.08;
    
    // Number pad (1-9) - smaller to fit more
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const numButton = createButtonWithSymbol(0.04, 0.04, 0x51 + i, `${i + 1}`, 0xffffff);
        numButton.position.set(
            (col - 1) * 0.06,
            yPos - row * 0.06,
            0.03
        );
        remoteGroup.add(numButton);
    }
    
    // Zero button
    const zeroButton = createButtonWithSymbol(0.04, 0.04, 0x50, '0', 0xffffff);
    zeroButton.position.set(0, yPos - 0.18, 0.03);
    remoteGroup.add(zeroButton);
    
    yPos -= 0.25;
    
    // Streaming service buttons
    const streamingButtons = [
        { name: 'YouTube', code: 0x01, color: 0xff0000 },
        { name: 'Netflix', code: 0x02, color: 0xe50914 },
        { name: 'Prime', code: 0x03, color: 0x00a8e1 },
        { name: 'HBO', code: 0x04, color: 0x800080 },
        { name: 'Disney+', code: 0x05, color: 0x113CCF },
        { name: 'Apple TV', code: 0x06, color: 0xA2AAAD },
        { name: 'Hulu', code: 0x07, color: 0x1CE783 },
        { name: 'Peacock', code: 0x08, color: 0x000000 }
    ];
    
    for (let i = 0; i < streamingButtons.length; i++) {
        const btn = streamingButtons[i];
        const streamButton = createButtonWithSymbol(0.05, 0.04, btn.code, btn.name, btn.color);
        streamButton.position.set(
            (i - 1.5) * 0.07,
            yPos,
            0.03
        );
        remoteGroup.add(streamButton);
    }
    
    yPos -= 0.08;
    
    // Smart Home Scene Buttons (first row)
    const sceneButtons = [
        { code: 0xE0, name: 'Movie', color: 0x9C27B0 },
        { code: 0xE1, name: 'Relax', color: 0x4CAF50 },
        { code: 0xE2, name: 'Off', color: 0x424242 },
        { code: 0xE3, name: 'Dim', color: 0xFFC107 },
        { code: 0xE4, name: 'Full', color: 0xFF9800 }
    ];
    
    for (let i = 0; i < sceneButtons.length; i++) {
        const btn = sceneButtons[i];
        const sceneButton = createButtonWithSymbol(0.045, 0.04, btn.code, btn.name, btn.color);
        sceneButton.position.set(
            (i - 2) * 0.055,
            yPos,
            0.03
        );
        remoteGroup.add(sceneButton);
    }
    
    yPos -= 0.07;
    
    // Smart Home Device Buttons (organized in rows)
    const deviceButtons = [
        // Row 1
        { code: 0xE5, name: 'Plug1', color: 0x607D8B },
        { code: 0xE6, name: 'Speaker', color: 0x2196F3 },
        { code: 0xE7, name: 'Ambient', color: 0xE91E63 },
        { code: 0xE8, name: 'Plug2', color: 0x607D8B },
        { code: 0xE9, name: 'Plug3', color: 0x607D8B },
        // Row 2
        { code: 0xEA, name: 'Kitchen', color: 0xFFC107 },
        { code: 0xEB, name: 'Fridge', color: 0x00BCD4 },
        { code: 0xEC, name: 'Oven', color: 0xf44336 },
        { code: 0xED, name: 'Bedroom', color: 0x9C27B0 },
        { code: 0xEE, name: 'Bathroom', color: 0x2196F3 },
        // Row 3
        { code: 0xEF, name: 'UpHall', color: 0x4CAF50 },
        { code: 0xF0, name: 'Entry', color: 0xFF9800 },
        { code: 0xF1, name: 'UpBed', color: 0x9C27B0 },
        { code: 0xF2, name: 'UpBath', color: 0x2196F3 },
        { code: 0xF3, name: 'Hood', color: 0xFFC107 },
        // Row 4
        { code: 0xF4, name: 'Temp+', color: 0xf44336 },
        { code: 0xF5, name: 'Temp-', color: 0x2196F3 },
        { code: 0xF6, name: 'AC', color: 0x00BCD4 },
        { code: 0xF7, name: 'Heat', color: 0xf44336 },
        { code: 0xF8, name: 'Garage', color: 0x607D8B },
        // Row 5
        { code: 0xF9, name: 'Lock', color: 0x424242 },
        { code: 0xFA, name: 'Security', color: 0x4CAF50 },
        { code: 0xFB, name: 'Blinds+', color: 0x9E9E9E },
        { code: 0xFC, name: 'Blinds-', color: 0x616161 },
        { code: 0xFD, name: 'Fan', color: 0x00BCD4 },
        // Row 6
        { code: 0xFE, name: 'Living', color: 0xFFC107 },
        { code: 0xFF, name: 'Dining', color: 0xFF9800 }
    ];
    
    let deviceRow = 0;
    let deviceCol = 0;
    for (let i = 0; i < deviceButtons.length; i++) {
        if (i > 0 && i % 5 === 0) {
            deviceRow++;
            deviceCol = 0;
            yPos -= 0.07;
        }
        const btn = deviceButtons[i];
        const deviceButton = createButtonWithSymbol(0.04, 0.035, btn.code, btn.name, btn.color);
        deviceButton.position.set(
            (deviceCol - 2) * 0.055,
            yPos,
            0.03
        );
        remoteGroup.add(deviceButton);
        deviceCol++;
    }
    
    // IR emitter (red LED on top) with glow effect
    const irEmitterGeometry = new THREE.SphereGeometry(0.015, 16, 16);
    const irEmitterMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const irEmitter = new THREE.Mesh(irEmitterGeometry, irEmitterMaterial);
    irEmitter.position.set(0, 0.7, 0.03);
    remoteGroup.add(irEmitter);
    
    // Add subtle side details (grip texture simulation)
    const sideDetailGeometry = new THREE.PlaneGeometry(0.38, 0.05);
    const sideDetailMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f0f0f,
        roughness: 0.7,
        metalness: 0.05
    });
    const topGrip = new THREE.Mesh(sideDetailGeometry, sideDetailMaterial);
    topGrip.position.set(0, 0.6, 0.027);
    topGrip.raycast = function() {}; // don't block button clicks
    remoteGroup.add(topGrip);
    
    const bottomGrip = new THREE.Mesh(sideDetailGeometry, sideDetailMaterial);
    bottomGrip.position.set(0, -0.6, 0.027);
    bottomGrip.raycast = function() {}; // don't block button clicks
    remoteGroup.add(bottomGrip);
    
    // Position remote in front of camera (on a virtual table)
    remoteGroup.position.copy(remoteLookClose.basePosition);
    remoteGroup.scale.setScalar(remoteLookClose.baseScale);
    remoteGroup.rotation.y = remoteLookClose.baseRotationY;
    
    scene.add(remoteGroup);
    
    // Hand near the remote, not touching (gap so it's clearly separate)
    createHand();
    // First-person arm (shoulder to wrist), only visible in first-person view
    createFirstPersonArm();
    // First-person walk body (torso + legs), only visible in walk mode when looking down
    createPlayerBody();
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

// First-person walk body: premium look – two-tone outfit, hands, belt, hair, high segment counts, strong materials.
function createPlayerBody() {
    playerBody = new THREE.Group();
    playerBody.visible = false;
    playerBody.raycast = function() {};
    var cast = true;
    var recv = true;
    // Shirt: cool dark, soft specular
    const shirtMat = new THREE.MeshStandardMaterial({
        color: 0x252e3d,
        roughness: 0.48,
        metalness: 0.06,
        emissive: 0x080c12,
        emissiveIntensity: 0.02
    });
    // Pants: darker, matte
    const pantsMat = new THREE.MeshStandardMaterial({
        color: 0x181e28,
        roughness: 0.72,
        metalness: 0.02,
        emissive: 0x05080c,
        emissiveIntensity: 0.01
    });
    // Skin: warm, soft specular, slight subsurface
    const skinMat = new THREE.MeshStandardMaterial({
        color: 0xe0b896,
        roughness: 0.48,
        metalness: 0.0,
        emissive: 0x301810,
        emissiveIntensity: 0.04
    });
    // Neck (slightly darker than face)
    const neckMat = new THREE.MeshStandardMaterial({
        color: 0xc9a882,
        roughness: 0.52,
        metalness: 0.0,
        emissive: 0x281810,
        emissiveIntensity: 0.03
    });
    // Belt
    const beltMat = new THREE.MeshStandardMaterial({
        color: 0x1a1612,
        roughness: 0.35,
        metalness: 0.25
    });
    // Shoes: upper + sole
    const shoeUpperMat = new THREE.MeshStandardMaterial({
        color: 0x0f1218,
        roughness: 0.42,
        metalness: 0.05
    });
    const shoeSoleMat = new THREE.MeshStandardMaterial({
        color: 0x1c1c1c,
        roughness: 0.85,
        metalness: 0.0
    });
    // Watch face (subtle glow)
    const watchMat = new THREE.MeshStandardMaterial({
        color: 0x2a3540,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0x102030,
        emissiveIntensity: 0.08
    });
    // Hair
    const hairMat = new THREE.MeshStandardMaterial({
        color: 0x1a1410,
        roughness: 0.9,
        metalness: 0.0
    });
    // Head – high-res sphere
    const headGeom = new THREE.SphereGeometry(0.122, 32, 24);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.set(0, 0.08, 0);
    head.castShadow = cast;
    head.receiveShadow = recv;
    playerBody.add(head);
    // Hair – dome on top of head
    const hairGeom = new THREE.SphereGeometry(0.1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const hair = new THREE.Mesh(hairGeom, hairMat);
    hair.position.set(0, 0.165, 0.02);
    hair.rotation.x = -0.15;
    hair.castShadow = cast;
    hair.receiveShadow = recv;
    playerBody.add(hair);
    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.052, 0.068, 0.14, 16);
    const neck = new THREE.Mesh(neckGeom, neckMat);
    neck.position.set(0, -0.06, 0);
    neck.castShadow = cast;
    neck.receiveShadow = recv;
    playerBody.add(neck);
    // Collar ring
    const collarGeom = new THREE.CylinderGeometry(0.072, 0.072, 0.03, 16);
    const collar = new THREE.Mesh(collarGeom, shirtMat);
    collar.position.set(0, -0.12, 0);
    playerBody.add(collar);
    // Torso (shirt) – tapered cylinder, high segments
    const torsoGeom = new THREE.CylinderGeometry(0.21, 0.255, 0.5, 20);
    const torso = new THREE.Mesh(torsoGeom, shirtMat);
    torso.position.set(0, -0.37, 0);
    torso.castShadow = cast;
    torso.receiveShadow = recv;
    playerBody.add(torso);
    // Belt
    const beltGeom = new THREE.CylinderGeometry(0.255, 0.255, 0.045, 20);
    const belt = new THREE.Mesh(beltGeom, beltMat);
    belt.position.set(0, -0.6, 0);
    belt.castShadow = cast;
    playerBody.add(belt);
    // Upper arms (shirt sleeves)
    const upperArmGeom = new THREE.CylinderGeometry(0.052, 0.058, 0.28, 16);
    const armL = new THREE.Mesh(upperArmGeom, shirtMat);
    armL.position.set(-0.275, -0.31, 0.05);
    armL.rotation.z = 0.38;
    armL.rotation.x = 0.18;
    armL.castShadow = cast;
    armL.receiveShadow = recv;
    playerBody.add(armL);
    const armR = new THREE.Mesh(upperArmGeom, shirtMat);
    armR.position.set(0.275, -0.31, 0.05);
    armR.rotation.z = -0.38;
    armR.rotation.x = 0.18;
    armR.castShadow = cast;
    armR.receiveShadow = recv;
    playerBody.add(armR);
    // Forearms + wrists
    const forearmGeom = new THREE.CylinderGeometry(0.042, 0.048, 0.24, 16);
    const forearmL = new THREE.Mesh(forearmGeom, skinMat);
    forearmL.position.set(-0.34, -0.5, 0.09);
    forearmL.rotation.x = 0.48;
    forearmL.castShadow = cast;
    forearmL.receiveShadow = recv;
    playerBody.add(forearmL);
    const forearmR = new THREE.Mesh(forearmGeom, skinMat);
    forearmR.position.set(0.34, -0.5, 0.09);
    forearmR.rotation.x = 0.48;
    forearmR.castShadow = cast;
    forearmR.receiveShadow = recv;
    playerBody.add(forearmR);
    // Hands
    const handGeom = new THREE.SphereGeometry(0.038, 12, 10);
    const handL = new THREE.Mesh(handGeom, skinMat);
    handL.position.set(-0.38, -0.64, 0.12);
    handL.rotation.x = 0.5;
    handL.castShadow = cast;
    playerBody.add(handL);
    const handR = new THREE.Mesh(handGeom, skinMat);
    handR.position.set(0.38, -0.64, 0.12);
    handR.rotation.x = 0.5;
    handR.castShadow = cast;
    playerBody.add(handR);
    // Watch on left wrist
    const watchGeom = new THREE.BoxGeometry(0.032, 0.048, 0.02);
    const watch = new THREE.Mesh(watchGeom, watchMat);
    watch.position.set(-0.36, -0.58, 0.11);
    watch.rotation.x = 0.5;
    watch.rotation.z = 0.1;
    playerBody.add(watch);
    // Thighs (pants)
    const thighGeom = new THREE.CylinderGeometry(0.082, 0.072, 0.4, 16);
    const thighL = new THREE.Mesh(thighGeom, pantsMat);
    thighL.position.set(-0.135, -0.76, 0.02);
    thighL.rotation.x = 0.1;
    thighL.castShadow = cast;
    thighL.receiveShadow = recv;
    playerBody.add(thighL);
    const thighR = new THREE.Mesh(thighGeom, pantsMat);
    thighR.position.set(0.135, -0.76, 0.02);
    thighR.rotation.x = 0.1;
    thighR.castShadow = cast;
    thighR.receiveShadow = recv;
    playerBody.add(thighR);
    // Shins (pants)
    const shinGeom = new THREE.CylinderGeometry(0.062, 0.052, 0.38, 16);
    const shinL = new THREE.Mesh(shinGeom, pantsMat);
    shinL.position.set(-0.135, -1.14, 0.06);
    shinL.rotation.x = 0.06;
    shinL.castShadow = cast;
    shinL.receiveShadow = recv;
    playerBody.add(shinL);
    const shinR = new THREE.Mesh(shinGeom, pantsMat);
    shinR.position.set(0.135, -1.14, 0.06);
    shinR.rotation.x = 0.06;
    shinR.castShadow = cast;
    shinR.receiveShadow = recv;
    playerBody.add(shinR);
    // Feet – shoe upper + sole
    const shoeUpperGeom = new THREE.BoxGeometry(0.115, 0.065, 0.22);
    const footL = new THREE.Mesh(shoeUpperGeom, shoeUpperMat);
    footL.position.set(-0.135, -1.38, 0.11);
    footL.castShadow = cast;
    footL.receiveShadow = recv;
    playerBody.add(footL);
    const footR = new THREE.Mesh(shoeUpperGeom, shoeUpperMat);
    footR.position.set(0.135, -1.38, 0.11);
    footR.castShadow = cast;
    footR.receiveShadow = recv;
    playerBody.add(footR);
    const soleGeom = new THREE.BoxGeometry(0.12, 0.025, 0.24);
    const soleL = new THREE.Mesh(soleGeom, shoeSoleMat);
    soleL.position.set(-0.135, -1.42, 0.11);
    soleL.castShadow = cast;
    soleL.receiveShadow = recv;
    playerBody.add(soleL);
    const soleR = new THREE.Mesh(soleGeom, shoeSoleMat);
    soleR.position.set(0.135, -1.42, 0.11);
    soleR.castShadow = cast;
    soleR.receiveShadow = recv;
    playerBody.add(soleR);
    scene.add(playerBody);
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

// Create a button with symbol/icon displayed on it
function createButtonWithSymbol(width, height, buttonCode, buttonName, color) {
    const buttonGroup = createButton(width, height, buttonCode, buttonName, color);
    
    // Get symbol for this button
    const symbol = getButtonSymbol(buttonCode, buttonName);
    
    // Create symbol label (using a plane with text-like appearance)
    // For emoji/symbols, we'll use a colored plane that represents the symbol
    const symbolGeometry = new THREE.PlaneGeometry(width * 0.7, height * 0.7);
    const symbolMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0.95,
        emissive: 0xffffff,
        emissiveIntensity: 0.2
    });
    const symbolPlane = new THREE.Mesh(symbolGeometry, symbolMaterial);
    symbolPlane.position.z = 0.012;
    
    // Store symbol text in userData for potential text rendering later
    symbolPlane.userData.symbolText = symbol;
    symbolPlane.userData.buttonName = buttonName;
    
    buttonGroup.add(symbolPlane);
    
    // For number buttons, add the number as a smaller label
    if (buttonName.match(/^\d+$/)) {
        const numLabel = createLabelPlane(buttonName, width * 0.5, height * 0.5);
        numLabel.position.z = 0.013;
        buttonGroup.add(numLabel);
    }
    
    return buttonGroup;
}

// Update TV screen content
