/**
 * TV Simulator – camera controls, keyboard, remote click.
 * Depends: globals, scene, ir-remote.
 */
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
        if (e.button !== 0) return; // only left button starts drag
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
        // Low sensitivity orbit so camera stays grounded (no spin-out)
        const orbitCenter = targetCameraLookAt.clone();
        cameraDistance = targetCameraPosition.distanceTo(orbitCenter);
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(targetCameraPosition.clone().sub(orbitCenter));
        spherical.theta -= deltaX * 0.0028;
        spherical.phi += deltaY * 0.0028;
        spherical.phi = Math.max(0.35, Math.min(Math.PI - 0.35, spherical.phi));
        spherical.radius = Math.max(1.5, Math.min(12, spherical.radius));
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
        cameraDistance += e.deltaY * 0.004;
        cameraDistance = Math.max(1.5, Math.min(12, cameraDistance));
        const center = targetCameraLookAt.clone();
        // Use target position for direction so zoom doesn't pull toward TV when current is still lerping
        const direction = targetCameraPosition.clone().sub(center).normalize();
        targetCameraPosition.copy(center).add(direction.multiplyScalar(cameraDistance));
    });
    
    // Only place (with the two buttons below) that set camera targets – no other logic may touch them
    window.addEventListener('keydown', (e) => {
        if (e.repeat) return; // ignore key hold so orbit/scroll don't get overwritten by repeated reset
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
        } else if (e.code === 'F1' || e.code === 'F2' || e.code === 'F3' || e.code === 'F4' ||
                   e.code === 'F5' || e.code === 'F6' || e.code === 'F7' || e.code === 'F8') {
            // F1–F8 = Room automation (Movie, Relax, Off, Dim, Full, Plug, Speaker, Ambient)
            e.preventDefault();
            const roomCodes = [0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7];
            const idx = parseInt(e.code.replace('F', ''), 10) - 1;
            if (socket && socket.connected && idx >= 0 && idx < 8) {
                socket.emit('button_press', { button_code: roomCodes[idx] });
            }
        }
    });
    
    // Smooth camera interpolation – slower lerp so it doesn’t spin out or feel detached
    function updateCamera() {
        currentCameraPosition.lerp(targetCameraPosition, 0.055);
        currentCameraLookAt.lerp(targetCameraLookAt, 0.055);
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
}


