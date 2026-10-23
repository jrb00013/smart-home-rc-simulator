# Simulator Features

What the web (3D) and desktop (2D) simulators do. Setup is in
[GETTING_STARTED.md](../docs/GETTING_STARTED.md); the button list is in
[BUTTONS.md](../docs/BUTTONS.md); the API is in [API.md](API.md).

## Web 3D simulator

### 3D TV Model
- Realistic TV with frame, screen, and stand
- Dynamic screen content based on TV state
- Smooth power on/off animations
- Emissive screen glow when powered on

### House and room

The scene is a full house with an exterior and neighbourhood: living room, kitchen, dining area,
fireplace, stairs to an upstairs mezzanine with bedroom and bathroom, garage, deck with grill,
backyard and street. The living room is the most detailed part:

- **Shell:** Floor (futuristic dark slate with tech grid), walls (slate blue-gray), ceiling (cool white), baseboards, window (frame, sill, glass, curtains), wall outlet, floor vent.
- **Furniture:** Sofa (base, back, cushion, arms), throw pillows and blanket; coffee table with mug, book, remote prop, candle, bowl; side table (left) with lamp, coaster, book, smart speaker, diffuser; floor lamp (right); accent armchair with side table and small plant; media console with set-top box, speakers, books, game controller, smart hub; magazine basket; floating shelf (left wall) with books and vase.
- **Decor:** Area rug (striped); three wall art pieces; wall clock; thermostat/smart panel; potted plants (sofa corner, window sill x2, accent table, back corner tall plant).
- **Lighting:** Ceiling fixture (bulb + shade), left table lamp, right floor lamp; window fill light; TV glow (reacts to app/channel).
- **Smart devices:** Room lights dim when the TV is on (movie mode). The ambient LED strip behind the console follows the current app colour. Smart plugs, the hub, smart speaker, thermostat screen, lamp bulbs and the candle react to TV state.
- **Room and house buttons:** codes `0xE0`–`0xE7` set scenes (Movie, Relax, Off) and lights; `0xE8`–`0xF3` toggle individual house devices (plugs, kitchen light, fridge, oven, bedroom/bathroom/upstairs/entry lights, hood light). The server tracks these in `room_state` (part of `tv_state`). Codes `0xF4`–`0xFF` (thermostat, AC, heating, garage, lock, security, blinds, fan, living/dining lights) are drawn on the remote; the server only records them as `last_button`.
- Ambient lighting and shadows; particle effects whose count depends on the graphics preset.

### Programmed channel lineup (Live TV)
Channels **1–99** are explicitly programmed with distinct shows and visuals; **100–999** use a generic fallback. Examples:
- **1–5**: News, Weather, Business
- **6–20**: Creative shows (Big Red Dog, Pabst, Lifeguard, Toaster, Clouds, Paint, Rubber Duck, etc.)
- **21–30**: Sports (Football, Basketball, Baseball, Soccer, Tennis, Hockey, Golf, MMA, Racing, Olympic)
- **31–40**: Movies (Action, Sci-Fi, Comedy, Horror, Romance, Western, Documentary, Thriller, Indie, Classic)
- **41–50**: Kids/Family (Cartoon Network, Disney, Nickelodeon, PBS Kids, Animal Planet, Discovery Kids, etc.)
- **51–60**: Music (MTV, VH1, Classic Rock, Jazz, Country, Hip Hop, Latin, EDM, Acoustic, Pop)
- **61–70**: Drama (Crime, Soap, Legal, Medical, Political, Period, Anthology, etc.)
- **71–80**: News/Docs (World News, Local, Politics, Tech, Sports News, Weather, Science, History, Travel)
- **81–99**: Variety (Reality, Game Show, Talk, Food, Home, DIY, True Crime, Comedy, C-SPAN, Public Access, Test Pattern)
- **Channel 0 – Reality Breach**: Fourth-wall channel with glitch art, chromatic aberration, VHS-style wobble, and messages like “YOU ARE BEING WATCHED” and “THE SIMULATOR IS THE MESSAGE.” Enter **000** on the number pad to tune in.

### Room reacts to the TV
- **TV light**: The room's ambient glow tints with the current channel or app colour (e.g. red for Netflix, green for sports).
- **Channel 0 effects**: On Reality Breach, the screen gets a post-process pass: RGB chromatic shift, horizontal slice glitch, and scan chaos so the TV feels like it’s breaking the fourth wall.

### Real-time Status Panel
- Power status
- Volume level
- Current channel
- Active app (or “Live TV” when on a channel)
- Mute status
- Game mode
- Last button pressed

### Notifications
- Visual notifications for button presses
- Appears at bottom of screen
- Auto-dismisses after 2 seconds

## Keyboard and mouse

### Web simulator

| Input | Action |
|-------|--------|
| Drag | Orbit the camera around the TV |
| Scroll | Zoom |
| `Space` | Reset camera |
| `1` / `2` / `3` | Front / side / top view |
| `4` | First-person view with arm and remote |
| `P` | Power |
| `U` / `D` | Volume up / down |
| `F1`–`F8` | Room: Movie, Relax, Off, Lights dim, Lights full, Plug 1, Speaker, Ambient strip (`0xE0`–`0xE7`) |
| `Shift`+`F1`–`F8` | House: Plug 2, Plug 3, Kitchen light, Fridge, Oven, Bedroom lamp, Bathroom light, Upstairs hall (`0xE8`–`0xEF`) |
| `Ctrl`+`F1`–`F4` | House: Entry light, Upstairs bedroom, Upstairs bathroom, Hood light (`0xF0`–`0xF3`) |
| Click a remote button | Press it |
| **Walk around** button | First-person walk: `W` `A` `S` `D` move, mouse looks, `Esc` exits (in walk mode `D` moves instead of lowering volume) |

Other buttons (Mute, Home, channels, apps, …) are pressed by clicking the 3D remote. Known
quirk: `Shift`+`F1`–`F8` also fires the unshifted `F`-key action.

### Desktop simulator

| Key | Button | Key | Button |
|-----|--------|-----|--------|
| `P` | Power | `H` | Home |
| `U` / `D` | Volume up / down | `N` | Menu |
| `M` | Mute | `B` | Back |
| `↑` / `↓` | Channel up / down | `I` | Info |
| `1`–`5` | Channel 1–5 | `G` | Game mode |
| `Y` | YouTube | `T` | Netflix |
| `A` | Amazon Prime | `Esc` | Quit |

The desktop window shows a 2D TV, a status panel on the right, a volume bar and app/channel
display.

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

The panel shows NEC, RC5, RC6, Sony SIRC or Phillips timing depending on the button.

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
- **Particle count from the graphics preset** (0 on the `SIM_SAFE` tier): Floating in air
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

Rendering uses Three.js (WebGL). Quality is scaled by the GPU-based graphics preset, described in
[README.md](README.md#graphics-preset).

## Web vs desktop

| | Web (3D) | Desktop (Pygame) |
|-|----------|------------------|
| Graphics | 3D house, animations | 2D TV and status panel |
| Runs in | Browser (served by `web_server.py`) | Native window (`main.py`) |
| Install | Python server deps (`requirements.txt`) | Python + pygame |
| REST/WebSocket API | Yes | No |
| C remote transport | HTTP (`WEB=1`) or IPC | IPC |
