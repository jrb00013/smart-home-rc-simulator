# Testing Guide

Complete guide to testing the Virtual TV Simulator.

## Quick Test

### Step 1: Start the Web Server

```bash
cd test_simulator
poetry install  # If not already done
poetry run web-server
```

You should see:
```
============================================================
  Virtual TV Simulator - Web Server
============================================================

Starting web server...
Access the 3D TV interface at: http://localhost:5000
```

### Step 2: Open in Browser

Open `http://localhost:5000` in your browser.

**What to verify:**
- ✅ 3D scene loads (TV, remote, room)
- ✅ No console errors (press F12 to check)
- ✅ Status panel shows on right side
- ✅ Controls help shows on bottom left
- ✅ Remote control is visible in front of camera

### Step 3: Test 3D Remote Control

**Click buttons on the 3D remote:**
- ✅ Click Power button (red button on top)
- ✅ See IR signal beam travel from remote to TV
- ✅ Button lights up green when clicked
- ✅ TV screen updates (turns on/off)
- ✅ Status panel updates

**Test other buttons:**
- Volume Up/Down buttons
- Channel Up/Down buttons
- Home button
- Number pad (1-9)

### Step 4: Test Camera Controls

- ✅ **Mouse drag**: Rotate camera around TV
- ✅ **Scroll wheel**: Zoom in/out
- ✅ **Press 1**: Front view
- ✅ **Press 2**: Side view
- ✅ **Press 3**: Top view
- ✅ **Press 4**: Remote close-up
- ✅ **Space**: Reset camera

### Step 5: Test C Program Integration

**In a new terminal:**
```bash
cd ..
make clean
make SIMULATOR=1 WEB=1
./bin/remote_control  # or bin\remote_control.exe on Windows
```

**What to verify:**
- ✅ C program connects to web server
- ✅ Press buttons in C program menu
- ✅ See IR signals in 3D scene
- ✅ See button highlights on remote
- ✅ TV state updates in real-time

### Step 6: Run Automated Tests

**Start the web server first** (in one terminal), then in another terminal:
```bash
cd test_simulator
poetry run pytest
```

See **README_TESTS.md** for test categories. With the server running, API and functional tests run; without it, unit and environment tests still pass. Expected:
- ✅ Server connection and REST API
- ✅ WebSocket and state consistency
- ✅ Unit and environment checks (no server needed)

## Streaming Services Testing

### Quick Test

1. **Start Web Server:**
   ```bash
   cd test_simulator
   poetry run web-server
   ```

2. **Open Browser:**
   Open `http://localhost:5000` in your browser

3. **Run Automated Test:**
   In a **new terminal**:
   ```bash
   cd test_simulator
   python test_streaming_auto.py
   ```

   Or use the simple test:
   ```bash
   python test_streaming_simple.py
   ```

### Manual Testing

#### Test Each Streaming Service:

1. **YouTube (Red)**
   - Click YouTube button on 3D remote (or use C program)
   - Screen should turn **RED** (#FF0000)
   - App name shows "YouTube"
   - Smooth color transition animation

2. **Netflix (Dark Red)**
   - Click Netflix button
   - Screen should turn **DARK RED** (#E50914)
   - App name shows "Netflix"
   - Color smoothly transitions from previous app

3. **Amazon Prime (Blue)**
   - Click Amazon Prime button
   - Screen should turn **BLUE** (#00A8E1)
   - App name shows "Amazon Prime"
   - Smooth cross-fade animation

4. **HBO Max (Purple)**
   - Click HBO Max button
   - Screen should turn **PURPLE** (#800080)
   - App name shows "HBO Max"
   - Color interpolation animation

### What to Verify

#### Visual Checks:
- ✅ Screen color changes to service-specific color
- ✅ Smooth color transition (no sudden jumps)
- ✅ App name displays correctly
- ✅ Notification shows "Opening [Service]..."
- ✅ Status panel updates
- ✅ IR signal appears when button pressed
- ✅ Button highlights on remote

#### Animation Checks:
- ✅ Cross-fade between apps (1 second)
- ✅ Color interpolation is smooth
- ✅ Text fades in/out
- ✅ No stuttering or glitches

### Button Codes

- **YouTube**: 0x01
- **Netflix**: 0x02
- **Amazon Prime**: 0x03
- **HBO Max**: 0x04

### Test from Browser Console

Open browser console (F12) and run:

```javascript
// Test YouTube
socket.emit('button_press', {button_code: 0x01});

// Test Netflix
socket.emit('button_press', {button_code: 0x02});

// Test Amazon Prime
socket.emit('button_press', {button_code: 0x03});

// Test HBO Max
socket.emit('button_press', {button_code: 0x04});
```

### Test from C Program

```bash
# Build with simulator support
make clean
make SIMULATOR=1 WEB=1

# Run remote control
./bin/remote_control

# In menu, select option 1: "Demo Streaming Services"
```

### Expected Behavior

1. **Power must be ON** - Services only work when TV is powered on
2. **Color Changes** - Screen background changes to service color
3. **Smooth Transitions** - Colors blend smoothly between services
4. **Notifications** - "Opening [Service]..." appears
5. **State Updates** - Status panel shows current app
6. **Animations** - Cross-fade animation plays (1 second)

### Automated Test Output

When you run `test_streaming_simple.py`, you should see:

```
============================================================
STREAMING SERVICES TEST
============================================================

[OK] Server connected

Testing streaming services:

-> YouTube... [PASS]
-> Netflix... [PASS]
-> Amazon Prime... [PASS]
-> HBO Max... [PASS]

[OK] Test complete! Check the browser to see the animations.
```

## Desktop Simulator Testing

### Start the Simulator

```bash
poetry run desktop-simulator
```

The virtual TV window will open and wait for commands.

### Test with Keyboard Shortcuts

- **P** = Power, **U/D** = Volume, **M** = Mute, **H** = Home, **N** = Menu, etc.
- Press buttons while the simulator is running to see immediate responses
- The status panel on the right shows current TV state
- Notifications appear at the bottom of the status panel
- Volume bar appears when adjusting volume

### Test with Remote Control Program

1. Start the simulator first (run `python main.py`)
2. In another terminal, build and run the remote control program with simulator support:
   ```bash
   make clean
   make SIMULATOR=1
   ./bin/remote_control
   ```

3. In the remote control program, select option 2 (Demo Basic Controls)
4. Press Power - the TV should turn on!
5. Try Volume Up/Down - see the volume bar change
6. Try Channel Up/Down - see the channel number change
7. Try option 1 (Streaming Services) - see apps open on the TV

## Automated Test Suite

Run the full pytest suite (with server running for API/functional tests):

```bash
cd test_simulator
poetry run pytest
```

See **README_TESTS.md** for test categories and options. No remote control program needed.

## Troubleshooting

### Scene doesn't load
- Check browser console (F12) for errors
- Verify Three.js library loads
- Check WebSocket connection

### Buttons don't work
- Check WebSocket connection status
- Verify server is running
- Check browser console for errors

### IR signals don't appear
- Verify button was actually pressed
- Check console for errors
- Try clicking different buttons

### C program can't connect
- Verify web server is running
- Check firewall settings
- Verify build used `WEB=1` flag

### Services don't switch
- Check TV is powered on
- Verify button codes are correct
- Check browser console for errors
- Verify server is receiving button presses

### Colors don't change
- Check app name in status panel
- Verify screen brightness is > 0
- Check browser console for errors
- Try refreshing the page

### Animations don't work
- Check browser supports canvas
- Verify JavaScript is enabled
- Check console for errors
- Try different browser

### Server not running
- Make sure you started: `poetry run web-server`
- Check port 5000 is not in use
- Look for errors in server terminal

## Success Criteria

All features working:
- [x] 3D scene renders correctly
- [x] Remote control is clickable
- [x] IR signals appear on button press
- [x] TV screen updates
- [x] Camera controls work
- [x] C program integration works
- [x] All button codes work
- [x] State updates in real-time
- [x] All 4 streaming services switch correctly
- [x] Colors match expected values
- [x] Smooth animations between services
- [x] Notifications appear
- [x] Status panel updates
- [x] No errors in console

## Test Results

After running all tests, you should see:
- ✅ Server Connection: PASS
- ✅ REST API: PASS
- ✅ WebSocket: PASS
- ✅ State Consistency: PASS
- ✅ All Buttons: PASS
- ✅ Streaming Services: PASS

If all tests pass, the simulator is fully functional! 🎉

