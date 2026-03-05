
// Helper function to convert hex to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 26, g: 26, b: 46 }; // Default dark blue
}

// Stub functions to prevent ReferenceError if called before initControls() runs
// These will be replaced by the actual implementations in initControls()
window.switchViewToTVZoom = function() {
    console.warn('switchViewToTVZoom called before controls initialized');
};
window.switchViewToRemote = function() {
    console.warn('switchViewToRemote called before controls initialized');
};
window.enterWalkMode = function() {
    console.warn('enterWalkMode called before controls initialized');
};

// Enhanced VR-like controls with smooth movement
function initControls() {
    let isDragging = false;
    let mouseDownPosition = { x: 0, y: 0 };
    let previousMousePosition = { x: 0, y: 0 };
    const DRAG_THRESHOLD_PX = 5;
    let cameraDistance = 5;
    let targetCameraPosition = new THREE.Vector3(0, 1.5, 5);
    let currentCameraPosition = targetCameraPosition.clone();
    let targetCameraLookAt = new THREE.Vector3(TV_POSITION.x, TV_POSITION.y, TV_POSITION.z);
    let currentCameraLookAt = targetCameraLookAt.clone();
    // Only these two + keydown below may set target* – no other code path (prevents bleed)
    const TV_CENTER = new THREE.Vector3(TV_POSITION.x, TV_POSITION.y, TV_POSITION.z);
    
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
        if (e.button !== 0) return; // only left button starts drag
        mouseDownPosition = { x: e.clientX, y: e.clientY };
        previousMousePosition = { x: e.clientX, y: e.clientY };
        isDragging = false; // will set true in mousemove once past threshold
    });
    
    canvas.addEventListener('mousemove', (e) => {
        // Walk mode: pointer lock look (FIXED: inverted controls)
        if (walkMode && document.pointerLockElement === canvas) {
            playerYaw -= e.movementX * 0.002;  // Inverted: move mouse right = turn right
            playerPitch -= e.movementY * 0.002; // Inverted: move mouse up = look up
            playerPitch = Math.max(-Math.PI / 2 + 0.15, Math.min(Math.PI / 2 - 0.15, playerPitch));
            return;
        }
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
        // Use TARGET position for orbit (not lerped current) so orbit is stable and doesn't drift toward TV
        const orbitCenter = targetCameraLookAt.clone();
        cameraDistance = targetCameraPosition.distanceTo(orbitCenter);
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(targetCameraPosition.clone().sub(orbitCenter));
        spherical.theta += deltaX * 0.01;  // FIXED: inverted - drag right = orbit right
        spherical.phi -= deltaY * 0.01;    // FIXED: inverted - drag up = look up
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
        targetCameraPosition.copy(new THREE.Vector3().setFromSpherical(spherical).add(orbitCenter));
        targetCameraLookAt.copy(orbitCenter);
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            isDragging = false;
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.style.cursor = 'grab';
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraDistance += e.deltaY * 0.01;
        cameraDistance = Math.max(1.2, Math.min(15, cameraDistance));
        const center = targetCameraLookAt.clone();
        // Use target position for direction so zoom doesn't pull toward TV when current is still lerping
        const direction = targetCameraPosition.clone().sub(center).normalize();
        targetCameraPosition.copy(center).add(direction.multiplyScalar(cameraDistance));
    });
    
    // WASD keyup: clear movement flags (walk mode)
    window.addEventListener('keyup', (e) => {
        if (!walkMode) return;
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') moveLeft = false;
        if (e.code === 'KeyD') moveRight = false;
    });

    // Only place (with the two buttons below) that set camera targets – no other logic may touch them
    window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // ignore key hold so orbit/scroll don't get overwritten by repeated reset
        if (walkMode) {
            if (e.code === 'KeyW') { e.preventDefault(); moveForward = true; return; }
            if (e.code === 'KeyS') { e.preventDefault(); moveBackward = true; return; }
            if (e.code === 'KeyA') { e.preventDefault(); moveLeft = true; return; }
            if (e.code === 'KeyD') { e.preventDefault(); moveRight = true; return; }
            if (e.code === 'Escape') {
                e.preventDefault();
                document.exitPointerLock();
                return;
            }
        }
        if (e.code === 'Space') {
            e.preventDefault();
            firstPersonMode = false;
            if (armGroup) armGroup.visible = false;
            if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                scene.add(remoteGroup);
                remoteGroup.position.copy(remoteLookClose.basePosition);
                remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
                remoteGroup.scale.setScalar(remoteLookClose.baseScale);
            }
            targetCameraPosition.set(0, 1.5, 5);
            targetCameraLookAt.copy(TV_CENTER);
            snapCameraToTarget();
            document.getElementById('btn-zoom-tv')?.classList.remove('active');
            document.getElementById('btn-look-remote')?.classList.remove('active');
        } else if (e.code === 'Digit1') {
            firstPersonMode = false;
            if (armGroup) armGroup.visible = false;
            if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                scene.add(remoteGroup);
                remoteGroup.position.copy(remoteLookClose.basePosition);
                remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
                remoteGroup.scale.setScalar(remoteLookClose.baseScale);
            }
            targetCameraPosition.set(0, 1.5, 5);
            targetCameraLookAt.copy(TV_CENTER);
            snapCameraToTarget();
        } else if (e.code === 'Digit2') {
            firstPersonMode = false;
            if (armGroup) armGroup.visible = false;
            if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                scene.add(remoteGroup);
                remoteGroup.position.copy(remoteLookClose.basePosition);
                remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
                remoteGroup.scale.setScalar(remoteLookClose.baseScale);
            }
            targetCameraPosition.set(5, 1.5, 0);
            targetCameraLookAt.copy(TV_CENTER);
        } else if (e.code === 'Digit3') {
            firstPersonMode = false;
            if (armGroup) armGroup.visible = false;
            if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                scene.add(remoteGroup);
                remoteGroup.position.copy(remoteLookClose.basePosition);
                remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
                remoteGroup.scale.setScalar(remoteLookClose.baseScale);
            }
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
        // F1–F8: Room / Smart Home scenes and devices (0xE0–0xE7)
        if (e.code >= 'F1' && e.code <= 'F8' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const idx = parseInt(e.code.slice(1), 10) - 1;
            const code = 0xE0 + idx;
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('button_press', { button_code: code });
            }
        }
        // Shift+F1–F8: House device toggles (0xE8–0xEF)
        if (e.shiftKey && e.code >= 'F1' && e.code <= 'F8' && !e.ctrlKey && !e.metaKey) {
            const idx = parseInt(e.code.slice(1), 10) - 1;
            const code = 0xE8 + idx;
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('button_press', { button_code: code });
            }
        }
        // Ctrl+F1–F4: More house devices (0xF0–0xF3)
        if (e.ctrlKey && !e.metaKey && e.code >= 'F1' && e.code <= 'F4') {
            const idx = parseInt(e.code.slice(1), 10) - 1;
            const code = 0xF0 + idx;
            e.preventDefault();
            if (socket && socket.connected) {
                socket.emit('button_press', { button_code: code });
            }
        }
    });
    
    // Pointer lock: enter/exit walk mode
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            walkMode = true;
            moveForward = moveBackward = moveLeft = moveRight = false;
            firstPersonMode = true; // Enable first person mode to show hand/arm
            // Show arm and hand in walk mode
            if (armGroup) armGroup.visible = true;
            if (handGroup) handGroup.visible = true;
            // Attach remote+hand to first person holder so they follow camera
            if (remoteGroup && firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                remoteGroup.position.set(0, -0.35, -1.05);
                remoteGroup.rotation.set(0.25, 0, 0.05);
                remoteGroup.scale.setScalar(1);
                firstPersonHolder.add(remoteGroup);
            }
            document.getElementById('btn-zoom-tv')?.classList.remove('active');
            document.getElementById('btn-look-remote')?.classList.remove('active');
            if (!playerPosition) playerPosition = new THREE.Vector3();
            playerPosition.copy(camera.position);
            playerPosition.y = EYE_HEIGHT;
            playerPosition.x = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, playerPosition.x));
            playerPosition.z = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, playerPosition.z));
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            playerYaw = Math.atan2(forward.x, forward.z);
            playerPitch = Math.asin(Math.max(-1, Math.min(1, forward.y)));
            if (playerBody) playerBody.visible = true;
        } else {
            walkMode = false;
            moveForward = moveBackward = moveLeft = moveRight = false;
            if (playerBody) playerBody.visible = false;
            if (targetCameraPosition && currentCameraPosition) {
                targetCameraPosition.copy(camera.position);
                currentCameraPosition.copy(camera.position);
                targetCameraLookAt.copy(camera.position.clone().add(new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)));
                currentCameraLookAt.copy(targetCameraLookAt);
                cameraDistance = camera.position.distanceTo(targetCameraLookAt);
            }
        }
    });

    // Smooth camera interpolation (position and lookAt); dt for walk mode movement
    function updateCamera(dt) {
        if (walkMode && playerPosition) {
            const move = (moveForward ? 1 : 0) - (moveBackward ? 1 : 0);
            const strafe = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
            const rawDt = typeof dt === 'number' && dt > 0 ? dt : 0.016;
            const clampedDt = Math.min(rawDt, 0.1);
            const step = clampedDt * WALK_SPEED;
            if (move !== 0 || strafe !== 0) {
                const dx = Math.sin(playerYaw) * move + Math.cos(playerYaw) * strafe;
                const dz = Math.cos(playerYaw) * move - Math.sin(playerYaw) * strafe;
                const len = Math.sqrt(dx * dx + dz * dz);
                if (len > 0) {
                    playerPosition.x += (dx / len) * step;
                    playerPosition.z += (dz / len) * step;
                    playerPosition.x = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, playerPosition.x));
                    playerPosition.z = Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, playerPosition.z));
                }
            }
            playerPosition.y = EYE_HEIGHT;
            camera.position.set(playerPosition.x, EYE_HEIGHT, playerPosition.z);
            const lookDir = new THREE.Vector3(
                Math.sin(playerYaw) * Math.cos(playerPitch),
                Math.sin(playerPitch),
                Math.cos(playerYaw) * Math.cos(playerPitch)
            );
            camera.lookAt(camera.position.clone().add(lookDir));
            return;
        }
        currentCameraPosition.lerp(targetCameraPosition, 0.1);
        currentCameraLookAt.lerp(targetCameraLookAt, 0.1);
        camera.position.copy(currentCameraPosition);
        camera.lookAt(currentCameraLookAt);
    }
    
    window.updateCamera = updateCamera;
    
    // Snap camera current to target so view switch doesn't lerp from old position (fixes broken POV)
    function snapCameraToTarget() {
        currentCameraPosition.copy(targetCameraPosition);
        currentCameraLookAt.copy(targetCameraLookAt);
        camera.position.copy(currentCameraPosition);
        camera.lookAt(currentCameraLookAt);
    }

    // Only these two + keydown above set target* – no camera orientation or other logic
    window.switchViewToTVZoom = function() {
        firstPersonMode = false;
        if (armGroup) armGroup.visible = false;
        if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
            if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
            scene.add(remoteGroup);
            remoteGroup.position.copy(remoteLookClose.basePosition);
            remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
            remoteGroup.scale.setScalar(remoteLookClose.baseScale);
        }
        targetCameraPosition.set(0, 1.2, -5.6);
        targetCameraLookAt.copy(TV_CENTER);
        cameraDistance = 2.5;
        snapCameraToTarget();
        document.getElementById('btn-zoom-tv')?.classList.add('active');
        document.getElementById('btn-look-remote')?.classList.remove('active');
    };
    // Toggle: press once = lock into first-person (look at remote), press again = release to default view
    window.switchViewToRemote = function() {
        if (firstPersonMode) {
            // Already in first-person: release back to default TV view
            firstPersonMode = false;
            if (armGroup) armGroup.visible = false;
            if (remoteGroup && firstPersonHolder && remoteGroup.parent === firstPersonHolder) {
                if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
                scene.add(remoteGroup);
                remoteGroup.position.copy(remoteLookClose.basePosition);
                remoteGroup.rotation.set(0, remoteLookClose.baseRotationY, 0);
                remoteGroup.scale.setScalar(remoteLookClose.baseScale);
            }
            targetCameraPosition.set(0, 1.5, 5);
            targetCameraLookAt.copy(TV_CENTER);
            cameraDistance = 5;
            snapCameraToTarget();
            document.getElementById('btn-look-remote')?.classList.remove('active');
            return;
        }
        firstPersonMode = true;
        var r = remoteLookClose.basePosition;
        // First-person: eye position (slightly back and up), looking at the remote
        targetCameraPosition.set(r.x, r.y + 0.6, r.z + 1.5);
        targetCameraLookAt.set(r.x, r.y, r.z);
        cameraDistance = 1.8;
        // Attach remote+hand to holder that follows camera so they move with the viewer
        if (remoteGroup && firstPersonHolder) {
            if (remoteGroup.parent) remoteGroup.parent.remove(remoteGroup);
            remoteGroup.position.set(0, -0.35, -1.05);
            remoteGroup.rotation.set(0.25, 0, 0.05);
            remoteGroup.scale.setScalar(1);
            firstPersonHolder.add(remoteGroup);
        }
        snapCameraToTarget();
        document.getElementById('btn-zoom-tv')?.classList.remove('active');
        document.getElementById('btn-look-remote')?.classList.add('active');
    };
    // Enter first-person walk mode: pointer lock, WASD move, mouse look, visible body
    window.enterWalkMode = function() {
        canvas.requestPointerLock();
    };
}

// Make initControls available globally
window.initControls = initControls;

// Remote style: 'handheld' (3D physical) or 'digital' (flat screen/tablet)
let currentRemoteStyle = 'handheld';
let digitalRemoteGroup = null;

// Switch between handheld (3D physical) and digital (flat screen/tablet) remote styles
window.switchRemoteStyle = function(style) {
    if (style !== 'handheld' && style !== 'digital') {
        console.warn('Invalid remote style:', style);
        return;
    }
    
    currentRemoteStyle = style;
    
    // Update button states
    const handheldBtn = document.getElementById('btn-remote-handheld');
    const digitalBtn = document.getElementById('btn-remote-digital');
    
    if (handheldBtn) {
        if (style === 'handheld') {
            handheldBtn.classList.add('active');
        } else {
            handheldBtn.classList.remove('active');
        }
    }
    
    if (digitalBtn) {
        if (style === 'digital') {
            digitalBtn.classList.add('active');
        } else {
            digitalBtn.classList.remove('active');
        }
    }
    
    // Show/hide 3D handheld remote
    if (remoteGroup) {
        remoteGroup.visible = (style === 'handheld');
    }
    
    // Show/hide digital remote (create if needed)
    if (style === 'digital') {
        if (!digitalRemoteGroup) {
            createDigitalRemote();
        }
        if (digitalRemoteGroup) {
            digitalRemoteGroup.visible = true;
        }
    } else {
        if (digitalRemoteGroup) {
            digitalRemoteGroup.visible = false;
        }
    }
    
    console.log('Remote style switched to:', style);
};

// Create a flat digital/tablet-style remote with all buttons
function createDigitalRemote() {
    if (digitalRemoteGroup) return; // Already created
    if (typeof scene === 'undefined' || !scene) {
        console.warn('Scene not ready, cannot create digital remote');
        return;
    }
    
    digitalRemoteGroup = new THREE.Group();
    
    // Create a larger flat tablet-like remote to fit all buttons
    const tabletGeometry = new THREE.PlaneGeometry(0.5, 1.5);
    const tabletMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.2,
        metalness: 0.3,
        emissive: 0x000000,
        emissiveIntensity: 0
    });
    const tablet = new THREE.Mesh(tabletGeometry, tabletMaterial);
    tablet.rotation.x = -Math.PI / 2; // Lay flat
    digitalRemoteGroup.add(tablet);
    
    // Screen area (lighter)
    const screenGeometry = new THREE.PlaneGeometry(0.48, 1.48);
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.1,
        metalness: 0.4,
        emissive: 0x1a1a1a,
        emissiveIntensity: 0.1
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.rotation.x = -Math.PI / 2;
    screen.position.y = 0.001;
    digitalRemoteGroup.add(screen);
    
    // Import button creation function (assuming it's available globally or we recreate it)
    // For digital remote, we'll create buttons similar to handheld but flatter
    let yPos = 0.7;
    
    // Power button
    const powerBtn = createDigitalButton(0.08, 0.08, 0x10, 'Power', 0xff0000);
    powerBtn.position.set(0, yPos, 0.002);
    digitalRemoteGroup.add(powerBtn);
    yPos -= 0.12;
    
    // Volume/Channel row
    const volUpBtn = createDigitalButton(0.06, 0.06, 0x11, 'Vol+', 0x4CAF50);
    volUpBtn.position.set(-0.15, yPos, 0.002);
    digitalRemoteGroup.add(volUpBtn);
    
    const volDownBtn = createDigitalButton(0.06, 0.06, 0x12, 'Vol-', 0xf44336);
    volDownBtn.position.set(-0.15, yPos - 0.08, 0.002);
    digitalRemoteGroup.add(volDownBtn);
    
    const muteBtn = createDigitalButton(0.06, 0.06, 0x13, 'Mute', 0xFF9800);
    muteBtn.position.set(-0.15, yPos - 0.16, 0.002);
    digitalRemoteGroup.add(muteBtn);
    
    const chUpBtn = createDigitalButton(0.06, 0.06, 0x14, 'Ch+', 0x2196F3);
    chUpBtn.position.set(0.15, yPos, 0.002);
    digitalRemoteGroup.add(chUpBtn);
    
    const chDownBtn = createDigitalButton(0.06, 0.06, 0x15, 'Ch-', 0x2196F3);
    chDownBtn.position.set(0.15, yPos - 0.08, 0.002);
    digitalRemoteGroup.add(chDownBtn);
    
    // Navigation
    const homeBtn = createDigitalButton(0.06, 0.06, 0x20, 'Home', 0xFFC107);
    homeBtn.position.set(0, yPos, 0.002);
    digitalRemoteGroup.add(homeBtn);
    
    const menuBtn = createDigitalButton(0.06, 0.06, 0x21, 'Menu', 0x9C27B0);
    menuBtn.position.set(0, yPos - 0.08, 0.002);
    digitalRemoteGroup.add(menuBtn);
    
    const backBtn = createDigitalButton(0.06, 0.06, 0x22, 'Back', 0x607D8B);
    backBtn.position.set(0, yPos - 0.16, 0.002);
    digitalRemoteGroup.add(backBtn);
    
    yPos -= 0.24;
    
    // D-pad
    const upBtn = createDigitalButton(0.05, 0.05, 0x30, '▲', 0x00BCD4);
    upBtn.position.set(0, yPos + 0.06, 0.002);
    digitalRemoteGroup.add(upBtn);
    
    const leftBtn = createDigitalButton(0.05, 0.05, 0x32, '◀', 0x00BCD4);
    leftBtn.position.set(-0.06, yPos, 0.002);
    digitalRemoteGroup.add(leftBtn);
    
    const okBtn = createDigitalButton(0.05, 0.05, 0x34, 'OK', 0x4CAF50);
    okBtn.position.set(0, yPos, 0.002);
    digitalRemoteGroup.add(okBtn);
    
    const rightBtn = createDigitalButton(0.05, 0.05, 0x33, '▶', 0x00BCD4);
    rightBtn.position.set(0.06, yPos, 0.002);
    digitalRemoteGroup.add(rightBtn);
    
    const downBtn = createDigitalButton(0.05, 0.05, 0x31, '▼', 0x00BCD4);
    downBtn.position.set(0, yPos - 0.06, 0.002);
    digitalRemoteGroup.add(downBtn);
    
    yPos -= 0.15;
    
    // Playback
    const playBtn = createDigitalButton(0.04, 0.04, 0x40, '▶', 0x4CAF50);
    playBtn.position.set(-0.1, yPos, 0.002);
    digitalRemoteGroup.add(playBtn);
    
    const pauseBtn = createDigitalButton(0.04, 0.04, 0x41, '⏸', 0xFF9800);
    pauseBtn.position.set(-0.03, yPos, 0.002);
    digitalRemoteGroup.add(pauseBtn);
    
    const stopBtn = createDigitalButton(0.04, 0.04, 0x42, '⏹', 0xf44336);
    stopBtn.position.set(0.04, yPos, 0.002);
    digitalRemoteGroup.add(stopBtn);
    
    const ffBtn = createDigitalButton(0.04, 0.04, 0x43, '⏩', 0x2196F3);
    ffBtn.position.set(0.11, yPos, 0.002);
    digitalRemoteGroup.add(ffBtn);
    
    yPos -= 0.08;
    
    // Number pad (compact)
    for (let i = 0; i < 9; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const numBtn = createDigitalButton(0.04, 0.04, 0x51 + i, `${i + 1}`, 0xffffff);
        numBtn.position.set(
            (col - 1) * 0.06,
            yPos - row * 0.06,
            0.002
        );
        digitalRemoteGroup.add(numBtn);
    }
    
    const zeroBtn = createDigitalButton(0.04, 0.04, 0x50, '0', 0xffffff);
    zeroBtn.position.set(0, yPos - 0.18, 0.002);
    digitalRemoteGroup.add(zeroBtn);
    
    yPos -= 0.25;
    
    // Streaming
    const streamingBtns = [
        { code: 0x01, name: 'YT', color: 0xff0000 },
        { code: 0x02, name: 'NF', color: 0xe50914 },
        { code: 0x03, name: 'PR', color: 0x00a8e1 },
        { code: 0x04, name: 'HB', color: 0x800080 }
    ];
    
    for (let i = 0; i < streamingBtns.length; i++) {
        const btn = streamingBtns[i];
        const streamBtn = createDigitalButton(0.05, 0.04, btn.code, btn.name, btn.color);
        streamBtn.position.set((i - 1.5) * 0.07, yPos, 0.002);
        digitalRemoteGroup.add(streamBtn);
    }
    
    yPos -= 0.08;
    
    // Smart Home buttons (compact grid)
    const smartHomeButtons = [
        // Scenes
        { code: 0xE0, name: '🎬', color: 0x9C27B0 },
        { code: 0xE1, name: '😌', color: 0x4CAF50 },
        { code: 0xE2, name: '🌙', color: 0x424242 },
        { code: 0xE3, name: '💡', color: 0xFFC107 },
        { code: 0xE4, name: '💡', color: 0xFF9800 },
        // Devices row 1
        { code: 0xE5, name: '🔌', color: 0x607D8B },
        { code: 0xE6, name: '🔊', color: 0x2196F3 },
        { code: 0xE7, name: '🌈', color: 0xE91E63 },
        { code: 0xE8, name: '🔌', color: 0x607D8B },
        { code: 0xE9, name: '🔌', color: 0x607D8B },
        // Devices row 2
        { code: 0xEA, name: '💡', color: 0xFFC107 },
        { code: 0xEB, name: '❄', color: 0x00BCD4 },
        { code: 0xEC, name: '🔥', color: 0xf44336 },
        { code: 0xED, name: '💡', color: 0x9C27B0 },
        { code: 0xEE, name: '💡', color: 0x2196F3 },
        // Devices row 3
        { code: 0xEF, name: '💡', color: 0x4CAF50 },
        { code: 0xF0, name: '💡', color: 0xFF9800 },
        { code: 0xF1, name: '💡', color: 0x9C27B0 },
        { code: 0xF2, name: '💡', color: 0x2196F3 },
        { code: 0xF3, name: '💡', color: 0xFFC107 },
        // Devices row 4
        { code: 0xF4, name: '🌡', color: 0xf44336 },
        { code: 0xF5, name: '🌡', color: 0x2196F3 },
        { code: 0xF6, name: '❄', color: 0x00BCD4 },
        { code: 0xF7, name: '🔥', color: 0xf44336 },
        { code: 0xF8, name: '🚗', color: 0x607D8B },
        // Devices row 5
        { code: 0xF9, name: '🔒', color: 0x424242 },
        { code: 0xFA, name: '🛡', color: 0x4CAF50 },
        { code: 0xFB, name: '🪟', color: 0x9E9E9E },
        { code: 0xFC, name: '🪟', color: 0x616161 },
        { code: 0xFD, name: '🌀', color: 0x00BCD4 },
        // Devices row 6
        { code: 0xFE, name: '💡', color: 0xFFC107 },
        { code: 0xFF, name: '💡', color: 0xFF9800 }
    ];
    
    let row = 0;
    let col = 0;
    for (let i = 0; i < smartHomeButtons.length; i++) {
        if (i > 0 && i % 5 === 0) {
            row++;
            col = 0;
            yPos -= 0.07;
        }
        const btn = smartHomeButtons[i];
        const shBtn = createDigitalButton(0.04, 0.035, btn.code, btn.name, btn.color);
        shBtn.position.set((col - 2) * 0.055, yPos, 0.002);
        digitalRemoteGroup.add(shBtn);
        col++;
    }
    
    // Position it similar to the handheld remote
    if (typeof remoteLookClose !== 'undefined' && remoteLookClose && remoteLookClose.basePosition) {
        digitalRemoteGroup.position.copy(remoteLookClose.basePosition);
        digitalRemoteGroup.position.y -= 0.1; // Slightly lower
        digitalRemoteGroup.rotation.y = remoteLookClose.baseRotationY;
        digitalRemoteGroup.scale.setScalar(remoteLookClose.baseScale);
    }
    digitalRemoteGroup.visible = false;
    
    scene.add(digitalRemoteGroup);
}

// Create a flat digital button (for digital remote)
function createDigitalButton(width, height, buttonCode, label, color) {
    const buttonGroup = new THREE.Group();
    
    // Flat button (no depth)
    const buttonGeometry = new THREE.PlaneGeometry(width, height);
    const buttonMaterial = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.3,
        metalness: 0.2,
        emissive: color,
        emissiveIntensity: 0.1
    });
    const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
    buttonGroup.add(button);
    
    // Label/symbol (simplified - just a lighter area)
    const labelGeometry = new THREE.PlaneGeometry(width * 0.8, height * 0.8);
    const labelMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8,
        emissive: 0xffffff,
        emissiveIntensity: 0.3
    });
    const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    labelMesh.position.z = 0.001;
    labelMesh.userData.labelText = label;
    buttonGroup.add(labelMesh);
    
    buttonGroup.userData.buttonCode = buttonCode;
    buttonGroup.userData.buttonName = label;
    return buttonGroup;
}

// Update all room smart devices from TV state (remote-controlled: lights dim when TV on, ambient strip follows app)
