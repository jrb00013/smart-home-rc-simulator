# Button Code Reference

Every button the C remote and the simulator understand. The single source of truth is
[`include/remote_buttons.h`](../include/remote_buttons.h); display names come from
`get_button_name()` in `src/remote_control.c` and are mirrored for the simulator in
[`test_simulator/button_codes.py`](../test_simulator/button_codes.py).

Codes are one byte. JSON APIs accept the decimal value (`{"button_code": 16}`); the C API
and JavaScript accept hex (`0x10`).

## What each surface does with a code

| Surface | Behaviour |
|---------|-----------|
| C remote (`remote_press_button`) | Encodes and "transmits" the IR code (simulated unless you port the hardware layer). With `SIMULATOR=1` it also forwards the code to the simulator. |
| Web server (`POST /api/button`, WebSocket `button_press`) | Updates TV state for Power, Volume, Mute, Channel, Home, Menu, Back, Input/Source, Info, Settings, YouTube/Netflix/Prime/HBO Max, Live TV, Game Mode, the number pad, and room/house codes `0xE0`–`0xF3`. Any other code is accepted and recorded as `last_button`. |
| 3D web client | Animates the remote and screen; some room codes above `0xF3` (thermostat, AC, blinds, …) are visual only. |

## Codes

### Streaming Service Buttons

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x01` | 1 | `BUTTON_YOUTUBE` |
| `0x02` | 2 | `BUTTON_NETFLIX` |
| `0x03` | 3 | `BUTTON_AMAZON_PRIME` |
| `0x04` | 4 | `BUTTON_HBO_MAX` |
| `0x05` | 5 | `BUTTON_DISNEY_PLUS` |
| `0x06` | 6 | `BUTTON_APPLE_TV` |
| `0x07` | 7 | `BUTTON_HULU` |
| `0x08` | 8 | `BUTTON_PEACOCK` |

### Basic Control Buttons

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x10` | 16 | `BUTTON_POWER` |
| `0x11` | 17 | `BUTTON_VOLUME_UP` |
| `0x12` | 18 | `BUTTON_VOLUME_DOWN` |
| `0x13` | 19 | `BUTTON_MUTE` |
| `0x14` | 20 | `BUTTON_CHANNEL_UP` |
| `0x15` | 21 | `BUTTON_CHANNEL_DOWN` |

### Navigation Buttons

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x20` | 32 | `BUTTON_HOME` |
| `0x21` | 33 | `BUTTON_MENU` |
| `0x22` | 34 | `BUTTON_BACK` |
| `0x23` | 35 | `BUTTON_EXIT` |
| `0x24` | 36 | `BUTTON_OPTIONS` |
| `0x25` | 37 | `BUTTON_INPUT` |
| `0x26` | 38 | `BUTTON_SOURCE` |

### Directional Pad

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x30` | 48 | `BUTTON_UP` |
| `0x31` | 49 | `BUTTON_DOWN` |
| `0x32` | 50 | `BUTTON_LEFT` |
| `0x33` | 51 | `BUTTON_RIGHT` |
| `0x34` | 52 | `BUTTON_OK` |
| `0x35` | 53 | `BUTTON_ENTER` |

### Playback Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x40` | 64 | `BUTTON_PLAY` |
| `0x41` | 65 | `BUTTON_PAUSE` |
| `0x42` | 66 | `BUTTON_STOP` |
| `0x43` | 67 | `BUTTON_FAST_FORWARD` |
| `0x44` | 68 | `BUTTON_REWIND` |
| `0x45` | 69 | `BUTTON_RECORD` |

### Number Pad

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x50` | 80 | `BUTTON_0` |
| `0x51` | 81 | `BUTTON_1` |
| `0x52` | 82 | `BUTTON_2` |
| `0x53` | 83 | `BUTTON_3` |
| `0x54` | 84 | `BUTTON_4` |
| `0x55` | 85 | `BUTTON_5` |
| `0x56` | 86 | `BUTTON_6` |
| `0x57` | 87 | `BUTTON_7` |
| `0x58` | 88 | `BUTTON_8` |
| `0x59` | 89 | `BUTTON_9` |
| `0x5A` | 90 | `BUTTON_DASH` |

### Color Buttons

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x60` | 96 | `BUTTON_RED` |
| `0x61` | 97 | `BUTTON_GREEN` |
| `0x62` | 98 | `BUTTON_YELLOW` |
| `0x63` | 99 | `BUTTON_BLUE` |

### Advanced TV Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x70` | 112 | `BUTTON_INFO` |
| `0x71` | 113 | `BUTTON_GUIDE` |
| `0x72` | 114 | `BUTTON_SETTINGS` |
| `0x73` | 115 | `BUTTON_CC` |
| `0x74` | 116 | `BUTTON_SUBTITLES` |
| `0x75` | 117 | `BUTTON_SAP` |
| `0x76` | 118 | `BUTTON_AUDIO` |
| `0x77` | 119 | `BUTTON_SLEEP` |
| `0x78` | 120 | `BUTTON_PICTURE_MODE` |
| `0x79` | 121 | `BUTTON_ASPECT` |
| `0x7A` | 122 | `BUTTON_ZOOM` |
| `0x7B` | 123 | `BUTTON_P_SIZE` |

### Recording & PVR Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x7C` | 124 | `BUTTON_RECORD_LIST` |
| `0x7D` | 125 | `BUTTON_SCHEDULE` |
| `0x7E` | 126 | `BUTTON_SLEEP_TIMER` |
| `0x7F` | 127 | `BUTTON_TIMER_MENU` |

### Smart TV Features

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x80` | 128 | `BUTTON_VOICE` |
| `0x81` | 129 | `BUTTON_MIC` |
| `0x82` | 130 | `BUTTON_LIVE_TV` |
| `0x83` | 131 | `BUTTON_STREAM` |

### System & Diagnostic

| Hex | Dec | Constant |
|-----|-----|----------|
| `0x90` | 144 | `BUTTON_DISPLAY` |
| `0x91` | 145 | `BUTTON_STATUS` |
| `0x92` | 146 | `BUTTON_HELP` |
| `0x93` | 147 | `BUTTON_E_MANUAL` |

### Gaming Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0xA0` | 160 | `BUTTON_GAME_MODE` |
| `0xA1` | 161 | `BUTTON_GAME1` |
| `0xA2` | 162 | `BUTTON_GAME2` |
| `0xA3` | 163 | `BUTTON_GAME3` |
| `0xA4` | 164 | `BUTTON_GAME_GUIDE` |

### Picture Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0xB0` | 176 | `BUTTON_MOTION` |
| `0xB1` | 177 | `BUTTON_BACKLIGHT` |
| `0xB2` | 178 | `BUTTON_BRIGHTNESS` |

### Audio Controls

| Hex | Dec | Constant |
|-----|-----|----------|
| `0xC0` | 192 | `BUTTON_SOUND_MODE` |
| `0xC1` | 193 | `BUTTON_SYNC` |
| `0xC2` | 194 | `BUTTON_SOUND_OUTPUT` |

### Input & Connectivity

| Hex | Dec | Constant |
|-----|-----|----------|
| `0xD0` | 208 | `BUTTON_MULTI_VIEW` |
| `0xD1` | 209 | `BUTTON_PIP` |
| `0xD2` | 210 | `BUTTON_SCREEN_MIRROR` |
| `0xD3` | 211 | `BUTTON_CAST` |
| `0xD4` | 212 | `BUTTON_SCREEN_SHARE` |
| `0xD5` | 213 | `BUTTON_HDR_MODE` |
| `0xD6` | 214 | `BUTTON_HDR_GAME` |
| `0xD7` | 215 | `BUTTON_HDR_FILM` |

### Room / Smart Home Automation

| Hex | Dec | Constant |
|-----|-----|----------|
| `0xE0` | 224 | `BUTTON_ROOM_SCENE_MOVIE` |
| `0xE1` | 225 | `BUTTON_ROOM_SCENE_RELAX` |
| `0xE2` | 226 | `BUTTON_ROOM_SCENE_OFF` |
| `0xE3` | 227 | `BUTTON_ROOM_LIGHTS_DIM` |
| `0xE4` | 228 | `BUTTON_ROOM_LIGHTS_FULL` |
| `0xE5` | 229 | `BUTTON_ROOM_SMART_PLUG1` |
| `0xE6` | 230 | `BUTTON_ROOM_SMART_SPEAKER` |
| `0xE7` | 231 | `BUTTON_ROOM_AMBIENT_STRIP` |
| `0xE8` | 232 | `BUTTON_ROOM_SMART_PLUG2` |
| `0xE9` | 233 | `BUTTON_ROOM_SMART_PLUG3` |
| `0xEA` | 234 | `BUTTON_ROOM_KITCHEN_LIGHT` |
| `0xEB` | 235 | `BUTTON_ROOM_FRIDGE` |
| `0xEC` | 236 | `BUTTON_ROOM_OVEN` |
| `0xED` | 237 | `BUTTON_ROOM_BEDROOM_LAMP` |
| `0xEE` | 238 | `BUTTON_ROOM_BATHROOM_LIGHT` |
| `0xEF` | 239 | `BUTTON_ROOM_UPSTAIRS_HALL` |
| `0xF0` | 240 | `BUTTON_ROOM_ENTRY_LIGHT` |
| `0xF1` | 241 | `BUTTON_ROOM_UPSTAIRS_BEDROOM` |
| `0xF2` | 242 | `BUTTON_ROOM_UPSTAIRS_BATHROOM` |
| `0xF3` | 243 | `BUTTON_ROOM_HOOD_LIGHT` |
| `0xF4` | 244 | `BUTTON_ROOM_THERMOSTAT_UP` |
| `0xF5` | 245 | `BUTTON_ROOM_THERMOSTAT_DOWN` |
| `0xF6` | 246 | `BUTTON_ROOM_AC_ON` |
| `0xF7` | 247 | `BUTTON_ROOM_HEATING_ON` |
| `0xF8` | 248 | `BUTTON_ROOM_GARAGE_DOOR` |
| `0xF9` | 249 | `BUTTON_ROOM_DOOR_LOCK` |
| `0xFA` | 250 | `BUTTON_ROOM_SECURITY_ARM` |
| `0xFB` | 251 | `BUTTON_ROOM_BLINDS_OPEN` |
| `0xFC` | 252 | `BUTTON_ROOM_BLINDS_CLOSE` |
| `0xFD` | 253 | `BUTTON_ROOM_CEILING_FAN` |
| `0xFE` | 254 | `BUTTON_ROOM_LIVING_ROOM_LIGHT` |
| `0xFF` | 255 | `BUTTON_ROOM_DINING_ROOM_LIGHT` |

## Adding a button

1. Add a `#define BUTTON_…` to `include/remote_buttons.h`.
2. Add its IR code to `include/ir_codes.h` and the mapping in `src/ir_codes.c`.
3. Add the display name in `get_button_name()` in `src/remote_control.c`.
4. Mirror it in `test_simulator/button_codes.py` and, if the simulator should react, in
   `handle_button_press()` in `test_simulator/web_server.py`.
5. Update this table.
