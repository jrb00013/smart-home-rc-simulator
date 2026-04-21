function updateRoomDevicesFromTVState() {
    const tvOn = tvState && tvState.powered_on;
    const rs = (tvState && tvState.room_state) || {};
    const time = Date.now() * 0.001;

    // Living room lights: driven by room_state (lights_main, lights_lamp_*) 0–100, fallback by TV
    const mainPct = (rs.lights_main != null) ? rs.lights_main : (tvOn ? 15 : 100);
    const lampLPct = (rs.lights_lamp_left != null) ? rs.lights_lamp_left : (tvOn ? 10 : 100);
    const lampRPct = (rs.lights_lamp_right != null) ? rs.lights_lamp_right : (tvOn ? 10 : 100);
    const mainMult = mainPct / 100;
    const lampLMult = lampLPct / 100;
    const lampRMult = lampRPct / 100;
    if (roomLights.ceiling) roomLights.ceiling.intensity = 0.32 * mainMult;
    if (roomLights.lamp_left) roomLights.lamp_left.intensity = 0.45 * lampLMult;
    if (roomLights.lamp_right) roomLights.lamp_right.intensity = 0.4 * lampRMult;

    // Lamp shades emissive (glow when on)
    if (roomDeviceRefs.lamp_left_shade && roomDeviceRefs.lamp_left_shade.material) {
        roomDeviceRefs.lamp_left_shade.material.emissiveIntensity = lampLMult * (tvOn ? 0.06 : 0.18);
    }
    if (roomDeviceRefs.lamp_right_shade && roomDeviceRefs.lamp_right_shade.material) {
        roomDeviceRefs.lamp_right_shade.material.emissiveIntensity = lampRMult * (tvOn ? 0.05 : 0.15);
    }

    // Smart bulbs (living room) – follow main/lamp level
    const bulbInt = (mainMult + lampLMult + lampRMult) / 3 * 0.3;
    if (roomDeviceRefs.smart_bulb && roomDeviceRefs.smart_bulb.material) {
        roomDeviceRefs.smart_bulb.material.emissiveIntensity = bulbInt;
    }
    if (roomDeviceRefs.side_lamp_bulb && roomDeviceRefs.side_lamp_bulb.material) {
        roomDeviceRefs.side_lamp_bulb.material.emissiveIntensity = lampLMult * (tvOn ? 0.06 : 0.25);
    }
    if (roomDeviceRefs.ceiling_bulb && roomDeviceRefs.ceiling_bulb.material) {
        roomDeviceRefs.ceiling_bulb.material.emissiveIntensity = mainMult * 0.2;
    }

    // Ambient strip: on/off from room_state; color from app when TV on
    const ambientOn = rs.ambient_strip !== false;
    if (roomDeviceRefs.ambient_strip && roomDeviceRefs.ambient_strip.material) {
        const mat = roomDeviceRefs.ambient_strip.material;
        if (ambientOn && tvOn && tvState.current_app) {
            const c = getAppColor(tvState.current_app);
            mat.emissive.setRGB(c.r / 255, c.g / 255, c.b / 255);
            // Pulse effect based on mode
            const pulseMode = rs.ambient_pulse || 'breathe';
            if (pulseMode === 'breathe') {
                mat.emissiveIntensity = 0.25 + Math.sin(time * 0.8) * 0.05;
            } else if (pulseMode === 'party') {
                mat.emissiveIntensity = 0.4 + Math.sin(time * 4) * 0.2;
            } else if (pulseMode === 'solid') {
                mat.emissiveIntensity = 0.35;
            } else if (pulseMode === 'wave') {
                mat.emissiveIntensity = 0.2 + Math.sin(time * 2 + tvState.volume * 0.1) * 0.15;
            } else {
                mat.emissiveIntensity = 0.25;
            }
        } else if (ambientOn && tvOn && tvState.channel !== undefined) {
            // Channel-based colors (from tvShows)
            const tvShow = getTVShow(tvState.channel);
            if (tvShow && tvShow.color) {
                mat.emissive.setRGB(tvShow.color.r / 255, tvShow.color.g / 255, tvShow.color.b / 255);
            } else {
                mat.emissive.setHex(0x4060a0);
            }
            mat.emissiveIntensity = 0.15;
        } else if (ambientOn && tvOn) {
            // Default cyan for live TV
            mat.emissive.setHex(0x4060a0);
            mat.emissiveIntensity = 0.15;
        } else {
            mat.emissiveIntensity = ambientOn ? 0.08 : 0;
        }
    }

    // Power strip LED: on when TV on
    if (roomDeviceRefs.power_strip_led && roomDeviceRefs.power_strip_led.material) {
        roomDeviceRefs.power_strip_led.material.emissiveIntensity = tvOn ? 0.6 : 0.1;
    }

    // Smart plugs 2 & 3: from room_state
    const plug2On = rs.smart_plug_2 !== false;
    const plug3On = rs.smart_plug_3 !== false;
    if (roomDeviceRefs.smart_plug_2 && roomDeviceRefs.smart_plug_2.material) {
        roomDeviceRefs.smart_plug_2.material.emissiveIntensity = plug2On ? 0.7 : 0;
    }
    if (roomDeviceRefs.smart_plug_3 && roomDeviceRefs.smart_plug_3.material) {
        roomDeviceRefs.smart_plug_3.material.emissiveIntensity = plug3On ? 0.7 : 0;
    }

    // Smart speaker: from room_state, pulse when on
    const speakerOn = rs.smart_speaker !== false;
    if (roomDeviceRefs.smart_speaker && roomDeviceRefs.smart_speaker.material) {
        roomDeviceRefs.smart_speaker.material.emissiveIntensity = speakerOn && tvOn ? (0.2 + Math.sin(time * 2) * 0.08) : (speakerOn ? 0.1 : 0);
    }

    // Smart hub: status when TV on
    if (roomDeviceRefs.smart_hub && roomDeviceRefs.smart_hub.material) {
        roomDeviceRefs.smart_hub.material.emissiveIntensity = tvOn ? (0.5 + Math.sin(time * 1.5) * 0.2) : 0;
    }

    // Thermostat screen
    if (roomDeviceRefs.thermostat && roomDeviceRefs.thermostat.material) {
        roomDeviceRefs.thermostat.material.emissiveIntensity = tvOn ? 0.4 : 0.2;
    }

    // Candle: dim when TV on
    if (roomDeviceRefs.candle && roomDeviceRefs.candle.material) {
        roomDeviceRefs.candle.material.emissiveIntensity = tvOn ? 0.15 : 0.4;
    }

    // --- Whole house: each instrument from room_state ---
    const on = (v) => (v !== false && v !== 0);
    const intensity = (v, max) => (on(v) ? (max || 0.4) : 0);
    if (roomLights.kitchen) roomLights.kitchen.intensity = intensity(rs.kitchen_light, 0.5);
    if (roomDeviceRefs.fridge_led && roomDeviceRefs.fridge_led.material) {
        roomDeviceRefs.fridge_led.material.emissiveIntensity = on(rs.fridge_on) ? 0.6 : 0;
    }
    if (roomDeviceRefs.oven_led && roomDeviceRefs.oven_led.material) {
        roomDeviceRefs.oven_led.material.emissiveIntensity = on(rs.oven_on) ? 0.8 : 0;
    }
    if (roomDeviceRefs.bedroom_lamp && roomDeviceRefs.bedroom_lamp.material) {
        roomDeviceRefs.bedroom_lamp.material.emissiveIntensity = on(rs.bedroom_lamp) ? 0.2 : 0.02;
    }
    if (roomLights.bedroom) roomLights.bedroom.intensity = intensity(rs.bedroom_lamp, 0.35);
    if (roomDeviceRefs.bathroom_light && roomDeviceRefs.bathroom_light.material) {
        roomDeviceRefs.bathroom_light.material.emissiveIntensity = on(rs.bathroom_light) ? 0.5 : 0;
    }
    if (roomLights.bathroom) roomLights.bathroom.intensity = intensity(rs.bathroom_light, 0.4);
    if (roomDeviceRefs.upstairs_hall_light && roomDeviceRefs.upstairs_hall_light.material) {
        roomDeviceRefs.upstairs_hall_light.material.emissiveIntensity = on(rs.upstairs_hall) ? 0.45 : 0;
    }
    if (roomLights.upstairs_hall) roomLights.upstairs_hall.intensity = intensity(rs.upstairs_hall, 0.5);
    if (roomDeviceRefs.entry_light && roomDeviceRefs.entry_light.material) {
        roomDeviceRefs.entry_light.material.emissiveIntensity = on(rs.entry_light) ? 0.5 : 0;
    }
    if (roomLights.entry) roomLights.entry.intensity = intensity(rs.entry_light, 0.45);
    if (roomDeviceRefs.upstairs_bedroom_lamp && roomDeviceRefs.upstairs_bedroom_lamp.material) {
        roomDeviceRefs.upstairs_bedroom_lamp.material.emissiveIntensity = on(rs.upstairs_bedroom_lamp) ? 0.18 : 0;
    }
    if (roomLights.upstairs_bedroom) roomLights.upstairs_bedroom.intensity = intensity(rs.upstairs_bedroom_lamp, 0.4);
    if (roomDeviceRefs.upstairs_bathroom_light && roomDeviceRefs.upstairs_bathroom_light.material) {
        roomDeviceRefs.upstairs_bathroom_light.material.emissiveIntensity = on(rs.upstairs_bathroom_light) ? 0.5 : 0;
    }
    if (roomLights.upstairs_bathroom) roomLights.upstairs_bathroom.intensity = intensity(rs.upstairs_bathroom_light, 0.4);
    if (roomDeviceRefs.hood_light && roomDeviceRefs.hood_light.material) {
        roomDeviceRefs.hood_light.material.emissiveIntensity = on(rs.hood_light) ? 0.4 : 0;
    }

    // --- Smart automated home: new devices from room_state ---
    // Motorized blinds: tilt 0 = open, 0.4 = half, 0.8 = closed (rotation around X)
    const blindsTilt = (rs.blinds_tilt != null) ? Math.min(1, Math.max(0, rs.blinds_tilt)) : 0.3;
    if (roomDeviceRefs.blinds && roomDeviceRefs.blinds.rotation) {
        roomDeviceRefs.blinds.rotation.x = -blindsTilt * 0.6;
    }
    // Central smart panel: always-on dashboard glow; brighter when "active"
    if (roomDeviceRefs.smart_panel && roomDeviceRefs.smart_panel.material) {
        const panelOn = rs.smart_panel !== false;
        roomDeviceRefs.smart_panel.material.emissiveIntensity = panelOn ? (0.35 + (tvOn ? 0.08 : 0)) : 0.05;
    }
    // Motion sensor: blink when motion, dim when idle
    if (roomDeviceRefs.motion_sensor && roomDeviceRefs.motion_sensor.material) {
        const motion = on(rs.motion_detected);
        roomDeviceRefs.motion_sensor.material.emissiveIntensity = motion ? (0.5 + Math.sin(time * 8) * 0.2) : 0.15;
    }
    // Smoke/CO detector: green = OK, red would be alarm (we only show OK state)
    if (roomDeviceRefs.smoke_detector && roomDeviceRefs.smoke_detector.material) {
        const ok = rs.smoke_ok !== false;
        roomDeviceRefs.smoke_detector.material.emissiveIntensity = ok ? 0.4 : 0;
    }
    // Under-cabinet strip: dedicated key or follow kitchen light
    const underCabOn = (rs.under_cabinet != null) ? on(rs.under_cabinet) : on(rs.kitchen_light);
    if (roomDeviceRefs.under_cabinet_strip && roomDeviceRefs.under_cabinet_strip.material) {
        roomDeviceRefs.under_cabinet_strip.material.emissiveIntensity = underCabOn ? 0.5 : 0;
    }
    // Smart door lock: green when locked (secure)
    if (roomDeviceRefs.door_lock && roomDeviceRefs.door_lock.material) {
        const locked = rs.door_locked !== false;
        roomDeviceRefs.door_lock.material.emissiveIntensity = locked ? 0.6 : 0.2;
    }
    // Video doorbell: on when powered / ready
    if (roomDeviceRefs.doorbell && roomDeviceRefs.doorbell.material) {
        const doorbellOn = rs.doorbell !== false;
        roomDeviceRefs.doorbell.material.emissiveIntensity = doorbellOn ? (0.3 + Math.sin(time * 1.2) * 0.05) : 0.05;
    }
}

// Animation loop with smooth camera movement
