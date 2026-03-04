// IR Signal Visualization System
// Shows: Button Press → Protocol → Code → Transmission Timeline
// Includes: Timing Graphs and Carrier Waveform Simulation

let irVisualization = {
    active: false,
    buttonCode: null,
    buttonName: null,
    protocol: 'NEC',
    irCode: null,
    frequency: 38000, // 38kHz carrier
    startTime: 0,
    timeline: [],
    waveformData: [],
    canvas: null,
    ctx: null,
    timingCanvas: null,
    timingCtx: null,
    waveformCanvas: null,
    waveformCtx: null
};

// IR Protocol definitions
const IR_PROTOCOLS = {
    'NEC': {
        name: 'NEC',
        headerMark: 9000,    // 9ms
        headerSpace: 4500,   // 4.5ms
        bitMark: 560,        // 560μs
        zeroSpace: 560,      // 560μs
        oneSpace: 1690,      // 1.69ms
        repeatSpace: 2250,  // 2.25ms
        bits: 32
    },
    'RC5': {
        name: 'RC5',
        headerMark: 889,    // 889μs
        headerSpace: 889,    // 889μs
        bitMark: 889,        // 889μs
        zeroSpace: 889,      // 889μs
        oneSpace: 889,       // 889μs (Manchester encoding)
        bits: 14
    },
    'RC6': {
        name: 'RC6',
        headerMark: 2666,   // 2.666ms
        headerSpace: 889,   // 889μs
        bitMark: 444,       // 444μs
        zeroSpace: 444,     // 444μs
        oneSpace: 1333,     // 1.333ms
        bits: 20
    },
    'Sony': {
        name: 'Sony SIRC',
        headerMark: 2400,   // 2.4ms
        headerSpace: 600,   // 600μs
        bitMark: 600,       // 600μs
        zeroSpace: 600,     // 600μs
        oneSpace: 1200,      // 1.2ms
        bits: 12
    },
    'Phillips': {
        name: 'Phillips',
        headerMark: 9000,   // 9ms
        headerSpace: 4500,  // 4.5ms
        bitMark: 560,       // 560μs
        zeroSpace: 560,     // 560μs
        oneSpace: 1690,     // 1.69ms
        bits: 32
    }
};

// Button to protocol mapping
const BUTTON_PROTOCOLS = {
    0x10: 'NEC',      // Power
    0x11: 'NEC',      // Volume Up
    0x12: 'NEC',      // Volume Down
    0x14: 'RC5',      // Channel Up
    0x15: 'RC5',      // Channel Down
    0x20: 'NEC',      // Home
    0x01: 'RC6',      // YouTube
    0x02: 'RC6',      // Netflix
    0x03: 'RC6',      // Amazon Prime
    0x04: 'RC6',      // HBO Max
    0x25: 'Phillips', // Input
    0x26: 'Phillips'  // Source
};

// Button to IR code mapping (simplified)
const BUTTON_IR_CODES = {
    0x10: 0x00000001,  // Power
    0x11: 0x00000002,  // Volume Up
    0x12: 0x00000003,  // Volume Down
    0x14: 0x00000005,  // Channel Up
    0x15: 0x00000006,  // Channel Down
    0x20: 0x00000010,  // Home
    0x01: 0x12345678,  // YouTube
    0x02: 0x12345679,  // Netflix
    0x03: 0x1234567A,  // Amazon Prime
    0x04: 0x1234567B,  // HBO Max
    0x25: 0x00000020,  // Input
    0x26: 0x00000020  // Source
};

// Initialize IR visualization
function initIRVisualization() {
    // Create visualization panel
    const panel = document.createElement('div');
    panel.id = 'ir-visualization-panel';
    panel.style.cssText = `
        position: fixed;
        top: 350px;
        left: 20px;
        width: 400px;
        max-height: calc(100vh - 370px);
        overflow-y: auto;
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid rgba(100, 150, 255, 0.8);
        border-radius: 10px;
        padding: 15px;
        color: white;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;
    
    panel.innerHTML = `
        <div style="border-bottom: 1px solid rgba(100, 150, 255, 0.5); padding-bottom: 10px; margin-bottom: 10px;">
            <h3 style="margin: 0; color: #6496ff;">IR Signal Transmission</h3>
        </div>
        <div id="ir-timeline" style="margin-bottom: 15px;">
            <div style="color: #888; margin-bottom: 5px;">Timeline:</div>
            <div id="ir-timeline-content" style="font-size: 11px; line-height: 1.6;"></div>
        </div>
        <div id="ir-timing-graph" style="margin-bottom: 15px;">
            <div style="color: #888; margin-bottom: 5px;">Timing Graph:</div>
            <canvas id="ir-timing-canvas" width="360" height="120" style="width: 100%; border: 1px solid rgba(100, 150, 255, 0.3); background: rgba(0, 0, 0, 0.3);"></canvas>
        </div>
        <div id="ir-waveform">
            <div style="color: #888; margin-bottom: 5px;">Carrier Waveform (38kHz):</div>
            <canvas id="ir-waveform-canvas" width="360" height="100" style="width: 100%; border: 1px solid rgba(100, 150, 255, 0.3); background: rgba(0, 0, 0, 0.3);"></canvas>
        </div>
        <div id="ir-details" style="margin-top: 15px; padding-top: 10px; border-top: 1px solid rgba(100, 150, 255, 0.5);">
            <div style="font-size: 10px; color: #aaa;">
                <div>Protocol: <span id="ir-protocol">-</span></div>
                <div>Code: <span id="ir-code">-</span></div>
                <div>Frequency: <span id="ir-frequency">-</span> Hz</div>
                <div>Duration: <span id="ir-duration">-</span> ms</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(panel);
    
    // Get canvas contexts
    irVisualization.timingCanvas = document.getElementById('ir-timing-canvas');
    irVisualization.timingCtx = irVisualization.timingCanvas.getContext('2d');
    irVisualization.waveformCanvas = document.getElementById('ir-waveform-canvas');
    irVisualization.waveformCtx = irVisualization.waveformCanvas.getContext('2d');
}

// Start IR visualization for a button press
function startIRVisualization(buttonCode, buttonName) {
    irVisualization.active = true;
    irVisualization.buttonCode = buttonCode;
    irVisualization.buttonName = buttonName;
    irVisualization.startTime = Date.now();
    
    // Determine protocol
    irVisualization.protocol = BUTTON_PROTOCOLS[buttonCode] || 'NEC';
    irVisualization.irCode = BUTTON_IR_CODES[buttonCode] || 0x00000000;
    irVisualization.frequency = 38000; // 38kHz
    
    // Show panel
    const panel = document.getElementById('ir-visualization-panel');
    if (panel) {
        panel.style.display = 'block';
    }
    
    // Generate timeline
    generateIRTimeline();
    
    // Draw timing graph
    drawTimingGraph();
    
    // Draw carrier waveform
    drawCarrierWaveform();
    
    // Update details
    updateIRDetails();
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (irVisualization.active) {
            stopIRVisualization();
        }
    }, 5000);
}

// Stop IR visualization
function stopIRVisualization() {
    irVisualization.active = false;
    const panel = document.getElementById('ir-visualization-panel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// Generate IR transmission timeline
function generateIRTimeline() {
    const protocol = IR_PROTOCOLS[irVisualization.protocol];
    const timeline = [];
    let currentTime = 0;
    
    // Header
    timeline.push({
        event: 'Header Mark',
        time: currentTime,
        duration: protocol.headerMark,
        type: 'mark'
    });
    currentTime += protocol.headerMark;
    
    timeline.push({
        event: 'Header Space',
        time: currentTime,
        duration: protocol.headerSpace,
        type: 'space'
    });
    currentTime += protocol.headerSpace;
    
    // Data bits
    const code = irVisualization.irCode;
    for (let i = protocol.bits - 1; i >= 0; i--) {
        const bit = (code >> i) & 1;
        timeline.push({
            event: `Bit ${protocol.bits - i - 1} (${bit})`,
            time: currentTime,
            duration: protocol.bitMark,
            type: 'mark',
            bit: bit
        });
        currentTime += protocol.bitMark;
        
        const spaceDuration = bit ? protocol.oneSpace : protocol.zeroSpace;
        timeline.push({
            event: `Space (${bit})`,
            time: currentTime,
            duration: spaceDuration,
            type: 'space',
            bit: bit
        });
        currentTime += spaceDuration;
    }
    
    irVisualization.timeline = timeline;
    
    // Update timeline display
    const timelineContent = document.getElementById('ir-timeline-content');
    if (timelineContent) {
        let html = '';
        timeline.forEach((item, index) => {
            if (index < 10) { // Show first 10 events
                const color = item.type === 'mark' ? '#ff6b6b' : '#4ecdc4';
                html += `<div style="color: ${color};">
                    ${item.time.toFixed(2)}ms: ${item.event} (${item.duration}μs)
                </div>`;
            }
        });
        if (timeline.length > 10) {
            html += `<div style="color: #888;">... ${timeline.length - 10} more events</div>`;
        }
        html += `<div style="color: #6496ff; margin-top: 5px;">
            Total: ${currentTime.toFixed(2)}ms
        </div>`;
        timelineContent.innerHTML = html;
    }
    
    // Store total duration
    irVisualization.totalDuration = currentTime;
}

// Draw timing graph
function drawTimingGraph() {
    const canvas = irVisualization.timingCanvas;
    const ctx = irVisualization.timingCtx;
    if (!canvas || !ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = (height / 10) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw timeline
    const timeline = irVisualization.timeline;
    const maxTime = irVisualization.totalDuration || 100;
    const timeScale = width / maxTime;
    
    let x = 0;
    const markY = height * 0.3;
    const spaceY = height * 0.7;
    
    timeline.forEach((item) => {
        const duration = item.duration / 1000; // Convert to ms
        const w = duration * timeScale;
        
        if (item.type === 'mark') {
            // Mark (high signal)
            ctx.fillStyle = '#ff6b6b';
            ctx.fillRect(x, markY, w, height * 0.2);
        } else {
            // Space (low signal)
            ctx.fillStyle = '#4ecdc4';
            ctx.fillRect(x, spaceY, w, height * 0.2);
        }
        
        x += w;
    });
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('Mark (High)', 5, markY - 5);
    ctx.fillText('Space (Low)', 5, spaceY + 15);
}

// Draw carrier waveform simulation
function drawCarrierWaveform() {
    const canvas = irVisualization.waveformCanvas;
    const ctx = irVisualization.waveformCtx;
    if (!canvas || !ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const frequency = irVisualization.frequency; // 38kHz
    const sampleRate = 1000000; // 1MHz sample rate
    const samplesPerPeriod = sampleRate / frequency;
    
    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.2)';
    ctx.lineWidth = 1;
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    // Draw waveform for first mark period
    const timeline = irVisualization.timeline;
    const firstMark = timeline.find(item => item.type === 'mark');
    if (!firstMark) return;
    
    const markDuration = firstMark.duration / 1000; // ms
    const timeScale = width / (markDuration * 0.1); // Show 10% of mark duration
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const samples = Math.min(width, markDuration * 100); // Limit samples
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        const x = (i / samples) * width;
        const y = centerY + Math.sin(2 * Math.PI * frequency * t) * (height * 0.3);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`${frequency / 1000}kHz Carrier`, 5, 15);
    ctx.fillText(`(First ${markDuration.toFixed(2)}ms shown)`, 5, 28);
}

// Update IR details
function updateIRDetails() {
    document.getElementById('ir-protocol').textContent = irVisualization.protocol;
    document.getElementById('ir-code').textContent = '0x' + irVisualization.irCode.toString(16).toUpperCase().padStart(8, '0');
    document.getElementById('ir-frequency').textContent = irVisualization.frequency.toLocaleString();
    document.getElementById('ir-duration').textContent = (irVisualization.totalDuration || 0).toFixed(2);
}

// Export for use in tv-simulator.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initIRVisualization,
        startIRVisualization,
        stopIRVisualization
    };
}


