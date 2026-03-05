"""
Button codes for the TV simulator - must match include/remote_buttons.h and
src/remote_control.c get_button_name() exactly.

This file is the single source of truth for the Python/JS simulator.
Do not add or change codes here without updating remote_buttons.h and get_button_name().
"""

# Code -> display name (matches C get_button_name())
# Generated from include/remote_buttons.h and src/remote_control.c
BUTTON_CODES = {
    # Streaming (remote_buttons.h)
    0x01: "YouTube",
    0x02: "Netflix",
    0x03: "Amazon Prime",
    0x04: "HBO Max",
    # Basic
    0x10: "Power",
    0x11: "Volume Up",
    0x12: "Volume Down",
    0x13: "Mute",
    0x14: "Channel Up",
    0x15: "Channel Down",
    # Navigation
    0x20: "Home",
    0x21: "Menu",
    0x22: "Back",
    0x23: "Exit",
    0x24: "Options",
    0x25: "Input",
    0x26: "Source",
    # D-pad
    0x30: "Up",
    0x31: "Down",
    0x32: "Left",
    0x33: "Right",
    0x34: "OK",
    0x35: "Enter",
    # Playback
    0x40: "Play",
    0x41: "Pause",
    0x42: "Stop",
    0x43: "Fast Forward",
    0x44: "Rewind",
    0x45: "Record",
    # Number pad
    0x50: "0",
    0x51: "1",
    0x52: "2",
    0x53: "3",
    0x54: "4",
    0x55: "5",
    0x56: "6",
    0x57: "7",
    0x58: "8",
    0x59: "9",
    0x5A: "Dash (-)",
    # Color
    0x60: "Red",
    0x61: "Green",
    0x62: "Yellow",
    0x63: "Blue",
    # Advanced TV
    0x70: "Info",
    0x71: "Guide",
    0x72: "Settings",
    0x73: "Closed Captions",
    0x74: "Subtitles",
    0x75: "SAP",
    0x76: "Audio",
    0x77: "Sleep",
    0x78: "Picture Mode",
    0x79: "Aspect",
    0x7A: "Zoom",
    0x7B: "Picture Size",
    # Smart TV
    0x80: "Voice",
    0x81: "Microphone",
    0x82: "Live TV",
    0x83: "Stream",
    # System
    0x90: "Display",
    0x91: "Status",
    0x92: "Help",
    0x93: "E-Manual",
    # Gaming
    0xA0: "Game Mode",
    # Picture
    0xB0: "Motion",
    0xB1: "Backlight",
    0xB2: "Brightness",
    # Audio
    0xC0: "Sound Mode",
    0xC1: "Sync",
    0xC2: "Sound Output",
    # Connectivity
    0xD0: "Multi View",
    0xD1: "Picture in Picture",
    0xD2: "Screen Mirror",
    # Room / Smart Home Automation (remote controls TV + room)
    0xE0: "Room: Movie",
    0xE1: "Room: Relax",
    0xE2: "Room: Off",
    0xE3: "Room: Lights Dim",
    0xE4: "Room: Lights Full",
    0xE5: "Room: Plug 1",
    0xE6: "Room: Speaker",
    0xE7: "Room: Ambient",
    0xE8: "Room: Plug 2",
    0xE9: "Room: Plug 3",
    0xEA: "Room: Kitchen Light",
    0xEB: "Room: Fridge",
    0xEC: "Room: Oven",
    0xED: "Room: Bedroom Lamp",
    0xEE: "Room: Bathroom Light",
    0xEF: "Room: Upstairs Hall",
    0xF0: "Room: Entry Light",
    0xF1: "Room: Upstairs Bedroom",
    0xF2: "Room: Upstairs Bathroom",
    0xF3: "Room: Hood Light",
    0xF4: "Room: Thermostat Up",
    0xF5: "Room: Thermostat Down",
    0xF6: "Room: AC On",
    0xF7: "Room: Heating On",
    0xF8: "Room: Garage Door",
    0xF9: "Room: Door Lock",
    0xFA: "Room: Security Arm",
    0xFB: "Room: Blinds Open",
    0xFC: "Room: Blinds Close",
    0xFD: "Room: Ceiling Fan",
    0xFE: "Room: Living Room Light",
    0xFF: "Room: Dining Room Light",
}


def get_button_name(code):
    """Return display name for a button code; matches C get_button_name()."""
    return BUTTON_CODES.get(code, f"Unknown (0x{code:02X})")
