/**
 * TV Simulator – power/channel/app/volume/HDMI animations, volume stabilizer.
 * Depends: globals.
 */
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
