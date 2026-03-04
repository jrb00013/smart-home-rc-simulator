/**
 * TV Simulator – socket, button mapping, updateTVState.
 * Depends: globals, animations, ir-remote, screen.
 */
// Button map from C (injected by server from include/remote_buttons.h + get_button_name)
// Build name->code reverse map once
var BUTTON_NAME_TO_CODE = null;
function buildButtonNameToCode() {
    if (BUTTON_NAME_TO_CODE) return;
    var codes = window.BUTTON_CODES_FROM_C || {};
    BUTTON_NAME_TO_CODE = {};
    for (var code in codes) { BUTTON_NAME_TO_CODE[codes[code]] = parseInt(code, 10); }
}

function getButtonNameFromCode(buttonCode) {
    buildButtonNameToCode();
    var codes = window.BUTTON_CODES_FROM_C || {};
    var c = typeof buttonCode === 'number' ? buttonCode : parseInt(buttonCode, 10);
    var name = codes[c] || codes[String(c)];
    return name || ('Unknown (0x' + (c >>> 0).toString(16).toUpperCase() + ')');
}

// Update TV state and visual representation
function updateTVState(state) {
    const wasPoweredOn = tvState.powered_on;
    const oldChannel = tvState.channel;
    const oldApp = tvState.current_app;
    const oldVolume = tvState.volume;
    
    tvState = state;
    
    // Log power state changes
    if (wasPoweredOn !== state.powered_on) {
        console.log(`TV Power changed: ${wasPoweredOn} -> ${state.powered_on}`);
        
        // Start power animation
        startPowerAnimation(state.powered_on);
    }
    
    // Channel change animation
    if (oldChannel !== state.channel && state.powered_on) {
        startChannelAnimation(oldChannel, state.channel);
        showChannelOverlay(state.channel);
    }
    
    // App switching animation
    if (oldApp !== state.current_app && state.powered_on) {
        startAppAnimation(oldApp, state.current_app);
        
        // Volume Stabilizer: Prevent volume spikes when switching apps
        if (volumeStabilizer.enabled) {
            stabilizeVolumeOnAppSwitch(oldApp, state.current_app, state.volume);
        }
    }
    
    // Volume Stabilizer: Apply volume limiting to prevent spikes
    if (volumeStabilizer.enabled && state.powered_on && !state.muted) {
        const stabilizedVolume = applyVolumeStabilization(state.volume, state.current_app);
        if (Math.abs(stabilizedVolume - state.volume) > 1) {
            // Volume was adjusted, update state and send to server
            state.volume = stabilizedVolume;
            if (socket && socket.connected) {
                try {
                    socket.emit('update_volume', { volume: stabilizedVolume });
                    console.log(`[Volume Stabilizer] Volume spike prevented: ${state.volume}% -> ${stabilizedVolume}%`);
                } catch (error) {
                    console.error('[Volume Stabilizer] Error sending stabilized volume to server:', error);
                }
            } else {
                console.warn('[Volume Stabilizer] Socket not connected, cannot send stabilized volume');
            }
        }
    }
    
    // HDMI input switching animation
    const oldInput = tvState.input_source;
    if (oldInput !== state.input_source && state.powered_on) {
        startHDMIAnimation(oldInput, state.input_source);
    }
    
    // Volume change animation
    if (Math.abs(oldVolume - state.volume) > 0 && state.powered_on) {
        startVolumeAnimation(oldVolume, state.volume);
        
        // Apply volume stabilization after volume change (prevents spikes from button presses)
        if (volumeStabilizer.enabled && !state.muted) {
            const stabilizedVolume = applyVolumeStabilization(state.volume, state.current_app);
            if (Math.abs(stabilizedVolume - state.volume) > 1) {
                // Volume needs adjustment, smoothly transition
                console.log(`[Volume Stabilizer] Volume change detected: ${state.volume}% -> stabilizing to ${stabilizedVolume}%`);
                smoothVolumeTransition(state.volume, stabilizedVolume);
            }
        }
    }
    
    // Update UI
    if (document.getElementById('power-status')) {
        document.getElementById('power-status').textContent = state.powered_on ? 'ON' : 'OFF';
        document.getElementById('power-status').className = `status-value ${state.powered_on ? 'on' : 'off'}`;
        document.getElementById('volume-status').textContent = state.volume + '%';
        document.getElementById('channel-status').textContent = state.channel;
        document.getElementById('app-status').textContent = state.current_app != null ? state.current_app : 'Live TV';
        document.getElementById('mute-status').textContent = state.muted ? 'Yes' : 'No';
        document.getElementById('game-mode-status').textContent = state.game_mode ? 'ON' : 'OFF';
        
        if (state.last_button) {
            document.getElementById('last-button').textContent = state.last_button;
            // Trigger IR signal visualization
            if (state.last_button && state.last_button !== '-') {
                triggerIRSignal(state.last_button);
                
                // Start IR visualization (protocol, code, timeline, waveform)
                if (typeof startIRVisualization === 'function') {
                    const buttonCode = getButtonCodeFromName(state.last_button);
                    if (buttonCode !== null) {
                        startIRVisualization(buttonCode, state.last_button);
                    }
                }
            }
        }
    }
    
    // Show notification
    if (state.notification) {
        showNotification(state.notification);
    }
    
    // Update 3D TV screen (always update, especially on power change)
    updateTVScreen(state);
}

function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        console.log('[Volume Stabilizer] Server connection established - volume stabilization active');
        // Loading already hidden when scene was ready; ensure it stays hidden
        var loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
        // Force next frame to be sent so /api/frame has data quickly when TV is on
        lastFrameSent = 0;
        // Initialize IR visualization
        if (typeof initIRVisualization === 'function') {
            initIRVisualization();
        }
        // Request initial state when connected
        socket.emit('request_state');
        
        // Verify volume stabilizer is connected
        if (volumeStabilizer.enabled) {
            console.log('[Volume Stabilizer] Volume stabilizer enabled and connected to server');
            console.log(`[Volume Stabilizer] Max volume: ${volumeStabilizer.maxVolume}%, Target: ${volumeStabilizer.targetVolume}%`);
        }
    });
    
    socket.on('disconnect', () => {
        console.warn('[Volume Stabilizer] Server disconnected - volume stabilization paused');
    });
    
    socket.on('tv_state_update', (state) => {
        updateTVState(state);
        if (state && state.room_state && typeof updateRoomState === 'function') updateRoomState(state.room_state);
    });

    socket.on('graphics_preset', (preset) => {
        if (preset && typeof preset === 'object') {
            window.GRAPHICS_PRESET = preset;
            if (document.getElementById('graphics-tier')) {
                var label = preset._tier || 'MEDIUM';
                if (preset._gpu_name) label += ' (' + (preset._gpu_name.length > 20 ? preset._gpu_name.substring(0, 17) + '…' : preset._gpu_name) + ')';
                document.getElementById('graphics-tier').textContent = label;
            }
        }
    });

    socket.on('connected', (data) => {
        console.log('Server:', data.message);
    });
    
    // Handle volume updates from stabilizer
    socket.on('volume_stabilized', (data) => {
        if (data.volume !== undefined) {
            tvState.volume = data.volume;
            console.log(`[Volume Stabilizer] Volume updated to ${data.volume}%`);
        }
    });
    
    // Async event handler for hardware interrupts from assembly/C
    socket.on('hardware_interrupt', async (interruptData) => {
        await handleHardwareInterrupt(interruptData);
    });
    
    // Button press event from interrupt handler
    socket.on('button_press_interrupt', async (buttonData) => {
        await handleButtonPressInterrupt(buttonData);
    });
}

// Async event handler for hardware interrupts (bridges assembly -> C -> JavaScript)
// This is ONLY called for actual hardware interrupts, not UI button clicks
async function handleHardwareInterrupt(interruptData) {
    try {
        console.log('[Interrupt Handler] Hardware interrupt received:', interruptData);
        
        // Process interrupt asynchronously
        if (interruptData.type === 'gpio' && interruptData.button_code) {
            // Forward to button press interrupt handler
            await handleButtonPressInterrupt({
                button_code: interruptData.button_code,
                button_name: interruptData.button_name,
                timestamp: interruptData.timestamp
            });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error processing interrupt:', error);
    }
}

// Async event handler for button press interrupts (from hardware, not UI clicks)
async function handleButtonPressInterrupt(buttonData) {
    try {
        console.log('[Interrupt Handler] Hardware button press interrupt:', buttonData);
        
        const buttonCode = buttonData.button_code;
        const buttonName = buttonData.button_name || getButtonNameFromCode(buttonCode);
        
        // Send button press to server (which will handle all button logic)
        // The server will update state and broadcast to all clients
        if (socket && socket.connected) {
            socket.emit('button_press', { button_code: buttonCode });
        }
        
        // Visual feedback
        if (buttonName) {
            triggerIRSignal(buttonName);
        }
        
        // Note: Channel changes and other button logic are handled by the server
        // in handle_button_press(), which then broadcasts tv_state_update
    } catch (error) {
        console.error('[Interrupt Handler] Error handling button press:', error);
    }
}

// Async channel change handler
async function handleChannelChange(direction) {
    try {
        const oldChannel = tvState.channel;
        let newChannel = oldChannel;
        
        if (direction > 0) {
            newChannel = (oldChannel % 999) + 1;
        } else {
            newChannel = ((oldChannel - 2) % 999) + 1;
        }
        
        console.log(`[Interrupt Handler] Channel change: ${oldChannel} -> ${newChannel}`);
        
        // Update state
        tvState.channel = newChannel;
        
        // Trigger channel animation
        startChannelAnimation(oldChannel, newChannel);
        showChannelOverlay(newChannel);
        
        // Send update to server
        if (socket && socket.connected) {
            socket.emit('update_channel', { channel: newChannel });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error changing channel:', error);
    }
}

// Async channel number input handler
async function handleChannelNumberInput(digit) {
    try {
        if (!tvState.channel_input) {
            tvState.channel_input = '';
        }
        
        tvState.channel_input += digit.toString();
        
        // If we have 3 digits or user presses OK, change channel
        if (tvState.channel_input.length >= 3) {
            const newChannel = parseInt(tvState.channel_input);
            if (newChannel >= 1 && newChannel <= 999) {
                await handleChannelChangeTo(newChannel);
            }
            tvState.channel_input = '';
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error handling channel number input:', error);
    }
}

// Async channel change to specific number
async function handleChannelChangeTo(channel) {
    try {
        const oldChannel = tvState.channel;
        const newChannel = Math.max(1, Math.min(999, channel));
        
        console.log(`[Interrupt Handler] Channel change to: ${oldChannel} -> ${newChannel}`);
        
        tvState.channel = newChannel;
        
        startChannelAnimation(oldChannel, newChannel);
        showChannelOverlay(newChannel);
        
        if (socket && socket.connected) {
            socket.emit('update_channel', { channel: newChannel });
        }
    } catch (error) {
        console.error('[Interrupt Handler] Error changing to channel:', error);
    }
}
