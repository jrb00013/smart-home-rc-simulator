/**
 * TV Simulator – updateTVScreen, captureAndSendFrame (frame pipeline).
 * Depends: globals, shows (draw*), utils (Easing, hexToRgb).
 */
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

    // Revolutionary post-process: glitch + chromatic aberration (channel 0 or when enabled)
    const revMode = screenEffects.revolutionaryMode || state.channel === 0;
    if (revMode && effectivePoweredOn && brightness > 0.2) {
        screenEffects.revolutionaryPhase = (screenEffects.revolutionaryPhase || 0) + 0.016;
        applyRevolutionaryEffects(canvas, screenEffects.revolutionaryPhase);
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
    
    // Capture frame for streaming API: process and send when TV has content (throttled)
    if (socket && socket.connected && canvas) {
        captureAndSendFrame(canvas, effectivePoweredOn);
    }
}

// Revolutionary effects: glitch (slice offset) + chromatic aberration (RGB shift)
function applyRevolutionaryEffects(canvas, time) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const chromaShift = Math.floor(2 + Math.sin(time * 2) * 2);
    const out = new Uint8ClampedArray(data.length);
    for (let y = 0; y < h; y++) {
        const wobble = Math.sin(time + y * 0.02) * 3;
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const xL = Math.max(0, Math.min(w - 1, x - chromaShift + wobble));
            const xR = Math.max(0, Math.min(w - 1, x + chromaShift + wobble));
            const iL = (y * w + (xL | 0)) * 4;
            const iR = (y * w + (xR | 0)) * 4;
            out[i] = data[iL];
            out[i + 1] = data[i + 1];
            out[i + 2] = data[iR + 2];
            out[i + 3] = data[i + 3];
        }
    }
    ctx.putImageData(new ImageData(out, w, h), 0, 0);
    // Glitch: random horizontal slice offsets (draw from copy so we don't read/write same buffer)
    const stripCount = 8 + Math.floor(Math.sin(time * 5) * 4);
    const glitchCanvas = document.createElement('canvas');
    glitchCanvas.width = w;
    glitchCanvas.height = h;
    const gctx = glitchCanvas.getContext('2d');
    if (!gctx) return;
    gctx.drawImage(canvas, 0, 0);
    for (let s = 0; s < stripCount; s++) {
        const stripY = Math.floor((Math.sin(time * 10 + s * 2) * 0.5 + 0.5) * h);
        const stripH = 4 + Math.floor(Math.random() * 20);
        const offset = (Math.random() - 0.5) * 40;
        ctx.drawImage(glitchCanvas, 0, stripY, w, stripH, offset, stripY, w, stripH);
    }
}

// Frame capture for streaming API - ensures /api/frame is always processing latest TV output
let lastFrameSent = 0;
const FRAME_SEND_INTERVAL = 200; // Send every 200ms (~5 FPS) to avoid overload; server always has recent frame

function captureAndSendFrame(canvas, _isTVOn) {
    if (!canvas || typeof canvas.toDataURL !== 'function') return;
    const now = Date.now();
    if (now - lastFrameSent < FRAME_SEND_INTERVAL) return;
    lastFrameSent = now;
    try {
        const frameData = canvas.toDataURL('image/png');
        const base64Data = frameData.split(',')[1];
        if (base64Data) {
            socket.emit('frame_update', {
                frame_data: base64Data,
                width: canvas.width,
                height: canvas.height,
                format: 'png',
                timestamp: now
            });
        }
    } catch (error) {
        console.warn('[Frame Capture] Error capturing frame:', error);
    }
}

// Rich content drawing functions for each app
