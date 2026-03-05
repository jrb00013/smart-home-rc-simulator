var _lastAnimTime = 0;
function animate() {
    requestAnimationFrame(animate);
    var now = performance.now();
    var dt = _lastAnimTime ? (now - _lastAnimTime) / 1000 : 0.016;
    _lastAnimTime = now;
    
    // Smooth camera interpolation (or walk mode update)
    if (window.updateCamera) {
        window.updateCamera(dt);
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
                tvGlowLight.intensity = Math.min(lightIntensity, 1.9);
                
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
                tvGlowLight.intensity = eased * 1.05;
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
        
        // TV ambient light breathing effect (strong screen glow)
        if (tvGlowLight) {
            const lightBreath = 1.05 + Math.sin(time * 1.2) * 0.18;
            tvGlowLight.intensity = lightBreath;
        }
    }

    // Room smart devices follow TV state (remote-controlled: dim lights, ambient strip, plugs, etc.)
    try {
        updateRoomDevicesFromTVState();
    } catch (err) {
        if (typeof console !== 'undefined' && console.warn) console.warn('updateRoomDevicesFromTVState:', err);
    }

    // Autonomous entities: robot dogs, toaster, fridge, sensors, autonomous bed/desk, carpet bots
    const autoTime = typeof Date !== 'undefined' ? Date.now() * 0.001 : 0;
    if (typeof autonomousEntities !== 'undefined' && Array.isArray(autonomousEntities)) {
        for (let i = 0; i < autonomousEntities.length; i++) {
            try {
                if (autonomousEntities[i].update) autonomousEntities[i].update(autoTime);
            } catch (e) {
                if (typeof console !== 'undefined' && console.warn) console.warn('autonomousEntities update:', e);
            }
        }
    }

    // Animate button press feedback (green highlight + press-in, then fade out)
    if (activeButton && Date.now() - buttonPressTime < 200) {
        const elapsed = Date.now() - buttonPressTime;
        const intensity = 1 - (elapsed / 200);
        if (activeButton.isGroup) {
            activeButton.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity !== undefined) {
                    child.material.emissiveIntensity = intensity * 0.8;
                }
            });
            activeButton.position.z = -0.01 + (elapsed / 200) * 0.04; // Ease back from press
        } else if (activeButton.material) {
            activeButton.material.emissiveIntensity = intensity;
            activeButton.position.z = 0.03 - (intensity * 0.01);
        }
    } else if (activeButton) {
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
            activeButton.position.z = 0.03;
        }
        activeButton = null;
    }
    
    // First-person: holder (and thus remote+hand) follows camera so arm/hand move with you
    if (firstPersonMode && firstPersonHolder) {
        firstPersonHolder.position.copy(camera.position);
        firstPersonHolder.quaternion.copy(camera.quaternion);
        updateFirstPersonArm();
        // Ensure arm and hand are visible in first person mode (including walk mode)
        if (armGroup) armGroup.visible = true;
        if (handGroup && remoteGroup && remoteGroup.parent === firstPersonHolder) {
            handGroup.visible = true;
        }
    } else if (armGroup && !walkMode) {
        // Only hide arm if not in walk mode (walk mode uses first person)
        armGroup.visible = false;
    }

    // Walk mode: body follows camera (position + rotation) so looking down shows torso/legs
    if (walkMode && playerBody) {
        playerBody.position.copy(camera.position);
        playerBody.quaternion.copy(camera.quaternion);
    }

    // Subtle floating for remote (only when not in first-person)
    if (remoteGroup && !firstPersonMode) {
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

// Add ambient effects for immersion (particle count from GPU preset)
function addAmbientEffects() {
    var preset = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET) ? window.GRAPHICS_PRESET : DEFAULT_GRAPHICS_PRESET;
    var particleCount = Math.max(0, presetNum(preset, 'ambientParticleCount', 100));

    if (particleCount <= 0) {
        window.animateParticles = function() {};
        return;
    }

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

// Handle window resize (re-apply preset pixel ratio so runtime keeps GPU tier limits)
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    var preset = (typeof window.GRAPHICS_PRESET === 'object' && window.GRAPHICS_PRESET) ? window.GRAPHICS_PRESET : DEFAULT_GRAPHICS_PRESET;
    var pixelRatio = presetNum(preset, 'pixelRatio', 1.0);
    if (pixelRatio > 0 && renderer.setPixelRatio) {
        var deviceRatio = window.devicePixelRatio || 1;
        renderer.setPixelRatio(Math.min(deviceRatio, pixelRatio));
    }
}

// Populate Smart Home panel with buttons for every controllable device (0xE0-0xF3)
function initSmartHomePanel() {
    const container = document.getElementById('smart-home-buttons');
    if (!container) return;
    const codes = window.BUTTON_CODES_FROM_C || {};
    for (let code = 0xE0; code <= 0xF3; code++) {
        const label = (codes[code] || ('0x' + code.toString(16))).replace(/^Room: /, '');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.title = codes[code] || ('Code 0x' + code.toString(16));
        btn.style.cssText = 'padding: 4px 8px; font-size: 10px; cursor: pointer; background: rgba(76,175,80,0.3); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; color: #fff;';
        btn.addEventListener('click', () => {
            if (typeof socket !== 'undefined' && socket && socket.connected) {
                socket.emit('button_press', { button_code: code });
            }
        });
        container.appendChild(btn);
    }
}

// Initialize everything
window.addEventListener('DOMContentLoaded', () => {
    // Initialize scene first
    initScene();
    
    // Then initialize socket connection
    initSocket();
    
    initSmartHomePanel();
    
    // Initialize default remote style (handheld)
    if (typeof window.switchRemoteStyle === 'function') {
        window.switchRemoteStyle('handheld');
    }
    
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
