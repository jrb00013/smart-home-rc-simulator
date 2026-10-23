let irParticles = null;
let irParticleSystem = null;
let _irEffect = null; // { objects: [...], rafId } for the beam currently on screen

// Remove an IR beam effect from the scene and free its GPU resources.
function disposeIREffect(effect) {
    if (!effect) return;
    if (effect.rafId) cancelAnimationFrame(effect.rafId);
    effect.rafId = 0;
    effect.objects.forEach(function (obj) {
        if (obj.parent) obj.parent.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    effect.objects.length = 0;
    if (_irEffect === effect) {
        _irEffect = null;
        irSignal = null;
        irParticleSystem = null;
    }
}

// Trigger IR signal visualization with enhanced effects
function triggerIRSignal(buttonName) {
    if (!remoteMesh || !tvMesh) return;
    
    // Replace any beam still animating (each press used to leak its meshes, and a stale
    // animation loop could remove the newer beam through the shared globals)
    disposeIREffect(_irEffect);
    
    // Get remote position (IR emitter location)
    const remotePosition = new THREE.Vector3();
    remoteMesh.getWorldPosition(remotePosition);
    remotePosition.y += 0.1; // IR emitter on top of remote
    
    // Get TV position (IR receiver location)
    const tvPosition = new THREE.Vector3();
    tvMesh.getWorldPosition(tvPosition);
    tvPosition.y += 0.5; // IR receiver on TV
    
    // Create IR signal beam with multiple layers
    const distance = tvPosition.distanceTo(remotePosition);
    
    // Main IR beam (core)
    const irGeometry = new THREE.ConeGeometry(0.03, distance, 16, 1, true);
    const irMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const beam = new THREE.Mesh(irGeometry, irMaterial);
    beam.position.copy(remotePosition);
    beam.lookAt(tvPosition);
    beam.rotateX(Math.PI / 2);
    scene.add(beam);
    
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
    const pos = new THREE.Vector3();
    
    for (let i = 0; i < particleCount; i++) {
        const t = i / particleCount;
        pos.copy(remotePosition).lerp(tvPosition, t);
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
    
    const trail = new THREE.Points(particles, particleMaterial);
    scene.add(trail);
    
    const effect = { objects: [beam, glowBeam, trail], rafId: 0 };
    _irEffect = effect;
    irSignal = beam;
    irParticleSystem = trail;
    
    // Animate IR signal with detailed effects
    const startTime = Date.now();
    const duration = 400; // 400ms for more visible effect
    
    function animateIR() {
        if (_irEffect !== effect) return; // superseded by a newer press
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
            // Core beam pulse
            const pulse = Math.sin(progress * Math.PI * 6) * 0.3 + 0.7;
            beam.material.opacity = 0.8 * pulse * (1 - progress * 0.5);
            beam.scale.set(1 + progress * 0.3, 1, 1);
            
            // Glow beam expansion
            glowBeam.material.opacity = 0.3 * (1 - progress);
            glowBeam.scale.set(1 + progress * 1.5, 1, 1);
            
            // Particle fade
            trail.material.opacity = 0.8 * (1 - progress);
            
            // Animate particles (slight movement)
            const arr = trail.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const offset = Math.sin(progress * Math.PI * 2 + i) * 0.02;
                arr[i * 3 + 1] += offset * 0.01;
            }
            trail.geometry.attributes.position.needsUpdate = true;
            
            effect.rafId = requestAnimationFrame(animateIR);
        } else {
            effect.rafId = 0;
            disposeIREffect(effect);
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
        'Disney+': 'Disney+',
        'Apple TV+': 'Apple TV+',
        'Hulu': 'Hulu',
        'Peacock': 'Peacock',
        'Game Mode': 'Game Mode',
        'Game 1': 'Game 1',
        'Game 2': 'Game 2',
        'Game 3': 'Game 3',
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
    if (!notification) return;
    notification.textContent = message;
    notification.classList.add('show');
    
    // Restart the hide timer so an earlier notification can't hide a newer one early
    clearTimeout(showNotification._timer);
    showNotification._timer = setTimeout(() => {
        notification.classList.remove('show');
    }, 2000);
}

// Default graphics preset (cinematic: soft shadows, rich exposure, high-res textures)
