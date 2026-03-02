# Features Documentation

Complete guide to all features of the Virtual TV Simulator.

## Overview

The Virtual TV Simulator provides a game-like virtual TV interface for testing the Phillips Universal Remote Control. It features both a web-based 3D/VR simulator and a desktop 2D simulator.

## Core Features

- **Visual TV Display**: See a realistic TV screen that responds to remote commands
- **Real-time Status**: Monitor TV state (power, volume, channel, etc.)
- **Button Feedback**: Visual feedback when buttons are pressed
- **Multiple Apps**: Simulate streaming services (YouTube, Netflix, etc.)
- **Menu System**: Navigate through TV menus and settings
- **Keyboard Testing**: Test buttons directly with keyboard shortcuts (no remote program needed!)
- **Automated Tests**: Run `poetry run pytest` (see README_TESTS.md)

## Web-Based 3D/VR Simulator

### 3D TV Model
- Realistic TV with frame, screen, and stand
- Dynamic screen content based on TV state
- Smooth power on/off animations
- Emissive screen glow when powered on

### Immersive Room
- Virtual room environment
- Floor, walls, and ceiling
- Ambient lighting and shadows
- Subtle particle effects for atmosphere

### VR-like Controls

**Mouse:**
- **Click & Drag**: Rotate camera around TV (orbit control)
- **Scroll Wheel**: Zoom in/out
- **Right-click**: Pan camera (if implemented)

**Keyboard:**
- **Space**: Reset camera to default position
- **1**: Front view
- **2**: Side view
- **3**: Top view
- **4**: Remote close-up

### Real-time Status Panel
- Power status
- Volume level
- Current channel
- Active app
- Mute status
- Game mode
- Last button pressed

### Notifications
- Visual notifications for button presses
- Appears at bottom of screen
- Auto-dismisses after 2 seconds

## Desktop 2D Simulator

### Pygame Interface
- 2D TV display with realistic appearance
- Status panel on the right side
- Volume bar visualization
- Channel number display
- App switching visualization

## Keyboard Shortcuts

You can test the simulator directly using keyboard shortcuts without needing the remote control program!

### Basic Controls
- **P** - Power (Turn TV on/off)
- **U** - Volume Up
- **D** - Volume Down
- **M** - Mute
- **↑** (Up Arrow) - Channel Up
- **↓** (Down Arrow) - Channel Down

### Navigation
- **H** - Home
- **N** - Menu
- **B** - Back
- **I** - Info

### Channels
- **1-9** - Channel numbers

### Streaming Apps
- **Y** - YouTube
- **T** - Netflix
- **A** - Amazon Prime

### Advanced
- **G** - Game Mode
- **ESC** - Exit simulator

## 3D UI Features

### Channel Overlay
- **Animated entrance**: Slides down from top with scale animation
- **3D box effect**: Gradient background with depth
- **Glowing border**: Blue glow effect around overlay
- **Shadow effects**: Drop shadow for 3D appearance
- **Auto-hide**: Fades out after 3 seconds
- **Triggers**: Appears when channel changes

### HDMI Switching Animation
- **3-phase animation** (1.5 seconds total):
  1. **Fade out old input** (0-30%)
  2. **HDMI logo animation** (30-60%) - Scales in with bounce
  3. **Fade in new input** (60-100%)
- **HDMI logo display**: Large "HDMI" text with input number
- **Smooth transitions**: Ease-out curves for natural motion
- **Input cycling**: HDMI 1 → HDMI 2 → HDMI 3 → HDMI 4 → TV → Component → AV → (loop)

**Controls:**
- Press **Input** button (0x25) or **Source** button (0x26) to cycle inputs

## Animation Features

### Power On/Off Animation (2 seconds)

**Power ON Sequence (5 Phases):**
1. **Phase 1 (0-5%)**: Initial Power Surge - Brief random flash, screen flickers to 40% brightness
2. **Phase 2 (5-15%)**: CRT Warm-up Flicker - Multiple rapid flickers, brightness: 10-40%
3. **Phase 3 (15-35%)**: Scan Line Effect - Animated scan line sweeps down screen, brightness: 30-50%
4. **Phase 4 (35-60%)**: Color Stabilization - Smooth color temperature shift, brightness: 50-80%
5. **Phase 5 (60-100%)**: Final Fade to Full Brightness - Smooth ease-out curve, brightness: 80-100%

**Power OFF Sequence (3 Phases):**
1. **Phase 1 (0-20%)**: Quick Dim - Rapid brightness drop: 100% → 70%
2. **Phase 2 (20-50%)**: Gradual Fade - Smooth brightness reduction: 70% → 0%
3. **Phase 3 (50-100%)**: Final Fade to Black - Complete fade to black

### Channel Change Animation (0.8 seconds)
- **Slide Transition**: Old channel slides out to the left, new channel slides in from the right
- **Ease-out curve** for smooth motion
- **Opacity fade** during transition
- **Synchronized movement** of both channels

### App Switching Animation (1-2.5 seconds)

**4-Phase Animation System:**
1. **Phase 1 (0-20%)**: Slide Out - Old app slides out to the left with zoom-out effect
2. **Phase 2 (20-50%)**: Loading Screen - Particle system, loading bar, gradient background
3. **Phase 3 (50-75%)**: Logo Animation - Logo scales in with bounce, 360° rotation
4. **Phase 4 (75-100%)**: Content Fade In - Logo fades out while final content fades in

**Cross-Fade Transition:**
- Old app fades out (0-50% of animation)
- New app fades in (50-100% of animation)
- Background color smoothly interpolates between app colors
- Text cross-fades between app names

**Service-Specific Colors:**
- YouTube: `#FF0000` (Bright Red)
- Netflix: `#E50914` (Netflix Red)
- Amazon Prime: `#00A8E1` (Prime Blue)
- HBO Max: `#800080` (Purple)

### Volume Change Animation (0.5 seconds)
- **Wave Effect**: Volume bar pulsing wave animation
- **Bar Width**: Slight expansion/contraction
- **Sinusoidal wave** pattern
- **Smooth interpolation** between old and new volume

### IR Signal Animation (0.4 seconds)

**Multi-Layer Beam System:**
1. **Core Beam**: Red cone geometry, 80% opacity, pulsing animation
2. **Glow Layer**: Outer glow cone, 30% opacity, expands during animation
3. **Particle Trail**: 50 particles along beam path, red to orange color gradient

**Animation Sequence:**
- Beam pulses with sine wave
- Particles fade and move
- Glow expands outward
- All elements synchronize

## Screen Effects

### Scan Lines (CRT Effect)
- **Regular Scan Lines**: Horizontal lines every 3px
- **Animated Offset**: Moves continuously
- **Opacity**: 12% of brightness
- **Power-On Scan Line**: Bright sweep during power on
- **Glow Trail**: Follows scan line

### Pixel Shimmer
- **30 Sparkle Points**: Seeded positions
- **Animated Alpha**: Sinusoidal fade in/out
- **Glow Effect**: Radial gradients
- **Subtle Sparkle**: Adds realism

### Vignette Effect
- **Radial Gradient**: Darker edges
- **Opacity**: 30% of brightness
- **Creates Depth**: Screen appears curved
- **Cinematic Look**: Professional appearance

### Screen Reflection
- **Top Gradient**: White reflection
- **Opacity**: 10% of brightness
- **Simulates Glass**: Realistic reflection
- **Adds Polish**: Premium feel

## IR Signal Visualization

The IR Signal Visualization System provides a complete technical breakdown of IR signal transmission.

### Features

1. **Transmission Timeline**: Shows the complete sequence of events when a button is pressed
   - Header Mark/Space: Initial synchronization pulses
   - Data Bits: Each bit with its mark and space timing
   - Total Duration: Complete transmission time
   - Event-by-event breakdown: Detailed timing for each phase

2. **Timing Graph**: Visual representation of the IR signal timing
   - Mark periods (red): High signal periods
   - Space periods (cyan): Low signal periods
   - Horizontal axis: Time progression
   - Vertical axis: Signal level (high/low)
   - Grid lines: Time reference markers

3. **Carrier Waveform Simulation**: Shows the actual 38kHz carrier waveform
   - Modulated signal: Carrier frequency visualization
   - First mark period: Detailed view of carrier during transmission
   - Sine wave pattern: Actual waveform shape
   - Frequency display: 38kHz carrier frequency

4. **Protocol Details**: Displays protocol type, IR code, frequency, and duration

### Supported Protocols

- **NEC Protocol**: Used for Power, Volume, Home, YouTube, Netflix
- **RC5 Protocol**: Used for Channel Up/Down
- **RC6 Protocol**: Used for Streaming services
- **Sony SIRC Protocol**: Alternative protocol support
- **Phillips Protocol**: Used for Input/Source switching

### Usage

The visualization **automatically appears** when:
- Any button is pressed on the 3D remote
- Button is pressed via C program
- Button is pressed via WebSocket

The panel appears in the **top-right corner** and auto-hides after 5 seconds.

## Button Press Animations

### Visual Feedback
- **Button Highlight**: Green glow
- **Press Animation**: Button moves inward
- **Fade Out**: Smooth intensity reduction
- **Duration**: 200ms
- **Smooth Interpolation**: Ease curves

### Remote Control
- **Floating Animation**: Subtle up/down movement
- **Rotation**: Slight rotation variation
- **Continuous Motion**: Always animated

## Ambient Effects

### TV Glow (When Powered On)
- **Breathing Effect**: Subtle intensity pulse
- **Color Temperature**: Slight warm/cool shift
- **Point Light**: Animated intensity
- **Bezel Pulse**: Frame glows rhythmically

### Particle System
- **100 Particles**: Floating in air
- **Continuous Movement**: Upward drift
- **Respawn**: Particles recycle
- **Ambient Atmosphere**: Adds life to scene

## Animation Timing & Curves

### Easing Functions
- **Power On**: Ease-out cubic (smooth finish)
- **Power Off**: Ease-in quadratic (smooth start)
- **Channel Change**: Ease-out cubic
- **App Switch**: Linear cross-fade
- **Volume**: Sinusoidal wave

### Durations
- **Power**: 2000ms (2 seconds)
- **Channel**: 800ms
- **App**: 1000-2500ms (1-2.5 seconds)
- **Volume**: 500ms
- **IR Signal**: 400ms

## Performance

- **60 FPS**: Smooth animations at 60 frames per second
- **GPU Accelerated**: Three.js handles 3D rendering
- **Optimized**: All animations use efficient calculations
- **Memory Management**: Textures disposed properly
- **No Lag**: Animations don't block UI

## Comparison: Web vs Desktop

| Feature | Web (3D) | Desktop (Pygame) |
|---------|----------|------------------|
| 3D Graphics | ✅ Yes | ❌ 2D only |
| VR-like Experience | ✅ Yes | ❌ No |
| Browser Access | ✅ Yes | ❌ No |
| Cross-platform | ✅ Yes | ✅ Yes |
| Performance | ⚠️ Depends on browser | ✅ Native |
| Installation | ✅ None needed | ⚠️ Python + pygame |

Choose the web version for the immersive 3D/VR experience!

