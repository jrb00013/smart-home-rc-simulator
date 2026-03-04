#!/usr/bin/env python3
"""
Virtual TV Simulator for Phillips Universal Remote Control
A game-like interface that simulates a TV responding to IR commands
"""

import pygame
import sys
import os
import json
import time
import threading
from pathlib import Path

# Initialize Pygame
pygame.init()

# Constants
WINDOW_WIDTH = 1200
WINDOW_HEIGHT = 800
TV_SCREEN_WIDTH = 900
TV_SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GRAY = (128, 128, 128)
DARK_GRAY = (64, 64, 64)
LIGHT_GRAY = (192, 192, 192)
BLUE = (0, 100, 200)
RED = (200, 0, 0)
GREEN = (0, 200, 0)
YELLOW = (255, 255, 0)
ORANGE = (255, 165, 0)

# Button codes from C (single source: button_codes.py = include/remote_buttons.h + get_button_name)
from button_codes import BUTTON_CODES

class VirtualTV:
    def __init__(self):
        self.screen = pygame.display.set_mode((WINDOW_WIDTH, WINDOW_HEIGHT))
        pygame.display.set_caption("Virtual TV Simulator - Phillips Universal Remote")
        self.clock = pygame.time.Clock()
        self.font_large = pygame.font.Font(None, 72)
        self.font_medium = pygame.font.Font(None, 48)
        self.font_small = pygame.font.Font(None, 32)
        self.font_tiny = pygame.font.Font(None, 24)
        
        # TV State
        self.powered_on = False
        self.volume = 50
        self.channel = 1
        self.muted = False
        self.current_app = "Home"
        self.input_source = "HDMI 1"
        self.picture_mode = "Standard"
        self.sound_mode = "Standard"
        self.game_mode = False
        self.brightness = 50
        self.backlight = 50
        
        # UI State
        self.last_button_press = None
        self.button_press_time = 0
        self.notification_text = ""
        self.notification_time = 0
        self.show_menu = False
        self.show_info = False
        self.show_settings = False
        
        # Animation
        self.screen_alpha = 0
        self.power_animating = False
        
        # Channel number entry
        self.channel_input = ""
        self.channel_input_time = 0
        
    def handle_button(self, button_code):
        """Handle a button press from the remote"""
        button_name = BUTTON_CODES.get(button_code, f"Unknown (0x{button_code:02X})")
        self.last_button_press = button_name
        self.button_press_time = time.time()
        self.notification_text = f"Button: {button_name}"
        self.notification_time = time.time()
        
        print(f"[TV] Received button: {button_name} (0x{button_code:02X})")
        
        # Handle button actions
        if button_code == 0x10:  # Power
            self.powered_on = not self.powered_on
            self.power_animating = True
            if self.powered_on:
                self.screen_alpha = 0
            else:
                self.screen_alpha = 255
            self.notification_text = f"Power: {'ON' if self.powered_on else 'OFF'}"
            
        elif button_code == 0x11:  # Volume Up
            if self.powered_on:
                self.volume = min(100, self.volume + 1)
                self.notification_text = f"Volume: {self.volume}%"
                
        elif button_code == 0x12:  # Volume Down
            if self.powered_on:
                self.volume = max(0, self.volume - 1)
                self.notification_text = f"Volume: {self.volume}%"
                
        elif button_code == 0x13:  # Mute
            if self.powered_on:
                self.muted = not self.muted
                self.notification_text = f"Mute: {'ON' if self.muted else 'OFF'}"
                
        elif button_code == 0x14:  # Channel Up
            if self.powered_on:
                self.channel = (self.channel % 999) + 1
                self.notification_text = f"Channel: {self.channel}"
                
        elif button_code == 0x15:  # Channel Down
            if self.powered_on:
                self.channel = ((self.channel - 2) % 999) + 1
                self.notification_text = f"Channel: {self.channel}"
                
        elif button_code == 0x20:  # Home
            if self.powered_on:
                self.current_app = "Home"
                self.show_menu = False
                self.show_settings = False
                self.show_info = False
                
        elif button_code == 0x21:  # Menu
            if self.powered_on:
                self.show_menu = not self.show_menu
                self.show_settings = False
                self.show_info = False
                
        elif button_code == 0x22:  # Back
            if self.powered_on:
                self.show_menu = False
                self.show_settings = False
                self.show_info = False
                
        elif button_code == 0x23:  # Exit
            if self.powered_on:
                self.show_menu = False
                self.show_settings = False
                self.show_info = False
                
        elif button_code == 0x70:  # Info
            if self.powered_on:
                self.show_info = not self.show_info
                
        elif button_code == 0x72:  # Settings
            if self.powered_on:
                self.show_settings = not self.show_settings
                self.show_menu = False
                
        elif button_code == 0x01:  # YouTube
            if self.powered_on:
                self.current_app = "YouTube"
                self.notification_text = "Opening YouTube..."
                
        elif button_code == 0x02:  # Netflix
            if self.powered_on:
                self.current_app = "Netflix"
                self.notification_text = "Opening Netflix..."
                
        elif button_code == 0x03:  # Amazon Prime
            if self.powered_on:
                self.current_app = "Amazon Prime"
                self.notification_text = "Opening Amazon Prime..."
                
        elif button_code == 0x04:  # HBO Max
            if self.powered_on:
                self.current_app = "HBO Max"
                self.notification_text = "Opening HBO Max..."
                
        elif button_code == 0x40:  # Play
            if self.powered_on:
                self.notification_text = "Play"
                
        elif button_code == 0x41:  # Pause
            if self.powered_on:
                self.notification_text = "Pause"
                
        elif button_code == 0x42:  # Stop
            if self.powered_on:
                self.notification_text = "Stop"
                
        elif button_code == 0xA0:  # Game Mode
            if self.powered_on:
                self.game_mode = not self.game_mode
                self.notification_text = f"Game Mode: {'ON' if self.game_mode else 'OFF'}"
                
        elif button_code >= 0x50 and button_code <= 0x59:  # Number pad
            if self.powered_on:
                digit = button_code - 0x50
                self.channel_input += str(digit)
                self.channel_input_time = time.time()
                if len(self.channel_input) >= 3:
                    try:
                        self.channel = int(self.channel_input)
                        self.channel_input = ""
                        self.notification_text = f"Channel: {self.channel}"
                    except:
                        self.channel_input = ""
                        
    def draw_tv_frame(self):
        """Draw the TV frame"""
        # TV bezel
        tv_x = (WINDOW_WIDTH - TV_SCREEN_WIDTH) // 2 - 20
        tv_y = (WINDOW_HEIGHT - TV_SCREEN_HEIGHT) // 2 - 20
        
        # Outer bezel
        pygame.draw.rect(self.screen, DARK_GRAY, 
                        (tv_x - 10, tv_y - 10, TV_SCREEN_WIDTH + 40, TV_SCREEN_HEIGHT + 40))
        # Inner bezel
        pygame.draw.rect(self.screen, BLACK, 
                        (tv_x, tv_y, TV_SCREEN_WIDTH + 20, TV_SCREEN_HEIGHT + 20))
        # Screen area
        screen_rect = pygame.Rect(tv_x + 10, tv_y + 10, TV_SCREEN_WIDTH, TV_SCREEN_HEIGHT)
        
        return screen_rect
        
    def draw_screen_content(self, screen_rect):
        """Draw the TV screen content"""
        if not self.powered_on:
            # Black screen when off
            pygame.draw.rect(self.screen, BLACK, screen_rect)
            # Power indicator
            text = self.font_medium.render("TV OFF", True, DARK_GRAY)
            text_rect = text.get_rect(center=screen_rect.center)
            self.screen.blit(text, text_rect)
            return
            
        # Screen background (simulating content)
        if self.current_app == "Home":
            # Home screen with gradient
            for y in range(screen_rect.height):
                color_val = int(20 + (y / screen_rect.height) * 30)
                pygame.draw.line(self.screen, (color_val, color_val, color_val + 10),
                               (screen_rect.left, screen_rect.top + y),
                               (screen_rect.right, screen_rect.top + y))
        elif self.current_app in ["YouTube", "Netflix", "Amazon Prime", "HBO Max"]:
            # Streaming app background
            app_colors = {
                "YouTube": (255, 0, 0),
                "Netflix": (229, 9, 20),
                "Amazon Prime": (0, 168, 225),
                "HBO Max": (128, 0, 128)
            }
            color = app_colors.get(self.current_app, BLUE)
            pygame.draw.rect(self.screen, color, screen_rect)
        else:
            # Default TV content
            pygame.draw.rect(self.screen, (30, 30, 50), screen_rect)
            
        # App logo/text
        if self.current_app != "Home":
            text = self.font_large.render(self.current_app, True, WHITE)
            text_rect = text.get_rect(center=(screen_rect.centerx, screen_rect.centery - 100))
            self.screen.blit(text, text_rect)
            
        # Channel number overlay
        if self.channel_input:
            channel_text = self.font_medium.render(self.channel_input, True, WHITE)
            channel_rect = channel_text.get_rect(center=(screen_rect.centerx, screen_rect.top + 50))
            self.screen.blit(channel_text, channel_rect)
        else:
            channel_text = self.font_medium.render(f"CH {self.channel}", True, WHITE)
            channel_rect = channel_text.get_rect(center=(screen_rect.centerx, screen_rect.top + 50))
            self.screen.blit(channel_text, channel_rect)
            
        # Volume bar (if recently changed)
        if time.time() - self.button_press_time < 2.0 and self.last_button_press in ["Volume Up", "Volume Down", "Mute"]:
            bar_width = int((self.volume / 100) * 200)
            bar_rect = pygame.Rect(screen_rect.right - 220, screen_rect.bottom - 60, 200, 20)
            pygame.draw.rect(self.screen, DARK_GRAY, bar_rect)
            if not self.muted:
                pygame.draw.rect(self.screen, GREEN, 
                               (bar_rect.left, bar_rect.top, bar_width, bar_rect.height))
            else:
                pygame.draw.rect(self.screen, RED, bar_rect)
            vol_text = self.font_small.render(f"{self.volume}%", True, WHITE)
            self.screen.blit(vol_text, (bar_rect.left, bar_rect.top - 30))
            
        # Menu overlay
        if self.show_menu:
            menu_rect = pygame.Rect(screen_rect.left + 50, screen_rect.top + 50, 300, 400)
            pygame.draw.rect(self.screen, (40, 40, 40, 240), menu_rect)
            pygame.draw.rect(self.screen, WHITE, menu_rect, 2)
            menu_title = self.font_medium.render("Menu", True, WHITE)
            self.screen.blit(menu_title, (menu_rect.left + 10, menu_rect.top + 10))
            
        # Info overlay
        if self.show_info:
            info_rect = pygame.Rect(screen_rect.left + 50, screen_rect.top + 50, 400, 300)
            pygame.draw.rect(self.screen, (40, 40, 40, 240), info_rect)
            pygame.draw.rect(self.screen, WHITE, info_rect, 2)
            info_lines = [
                f"Channel: {self.channel}",
                f"Volume: {self.volume}%",
                f"Input: {self.input_source}",
                f"Picture Mode: {self.picture_mode}",
                f"Sound Mode: {self.sound_mode}",
                f"Game Mode: {'ON' if self.game_mode else 'OFF'}",
                f"Brightness: {self.brightness}%",
            ]
            y_offset = 50
            for line in info_lines:
                text = self.font_small.render(line, True, WHITE)
                self.screen.blit(text, (info_rect.left + 10, info_rect.top + y_offset))
                y_offset += 35
                
        # Settings overlay
        if self.show_settings:
            settings_rect = pygame.Rect(screen_rect.left + 100, screen_rect.top + 100, 500, 400)
            pygame.draw.rect(self.screen, (40, 40, 40, 240), settings_rect)
            pygame.draw.rect(self.screen, WHITE, settings_rect, 2)
            settings_title = self.font_medium.render("Settings", True, WHITE)
            self.screen.blit(settings_title, (settings_rect.left + 10, settings_rect.top + 10))
            
    def draw_status_panel(self):
        """Draw status panel on the right side"""
        panel_x = WINDOW_WIDTH - 250
        panel_y = 20
        panel_width = 230
        panel_height = WINDOW_HEIGHT - 40
        
        # Panel background
        pygame.draw.rect(self.screen, (30, 30, 30), 
                        (panel_x, panel_y, panel_width, panel_height))
        pygame.draw.rect(self.screen, WHITE, 
                        (panel_x, panel_y, panel_width, panel_height), 2)
        
        # Title
        title = self.font_medium.render("TV Status", True, WHITE)
        self.screen.blit(title, (panel_x + 10, panel_y + 10))
        
        # Status info
        y_pos = panel_y + 70
        status_items = [
            ("Power", "ON" if self.powered_on else "OFF", 
             GREEN if self.powered_on else RED),
            ("Volume", f"{self.volume}%", WHITE),
            ("Muted", "Yes" if self.muted else "No", 
             RED if self.muted else GREEN),
            ("Channel", str(self.channel), WHITE),
            ("App", self.current_app, BLUE),
            ("Input", self.input_source, WHITE),
            ("Game Mode", "ON" if self.game_mode else "OFF",
             YELLOW if self.game_mode else GRAY),
            ("Brightness", f"{self.brightness}%", WHITE),
        ]
        
        for label, value, color in status_items:
            label_text = self.font_tiny.render(f"{label}:", True, LIGHT_GRAY)
            value_text = self.font_tiny.render(str(value), True, color)
            self.screen.blit(label_text, (panel_x + 10, y_pos))
            self.screen.blit(value_text, (panel_x + 120, y_pos))
            y_pos += 35
            
        # Last button press
        if self.last_button_press:
            y_pos += 20
            last_label = self.font_tiny.render("Last Button:", True, LIGHT_GRAY)
            self.screen.blit(last_label, (panel_x + 10, y_pos))
            button_text = self.font_tiny.render(self.last_button_press, True, YELLOW)
            self.screen.blit(button_text, (panel_x + 10, y_pos + 25))
            
        # Notification
        if time.time() - self.notification_time < 2.0:
            notif_y = panel_y + panel_height - 80
            notif_text = self.font_small.render(self.notification_text, True, YELLOW)
            notif_rect = notif_text.get_rect(center=(panel_x + panel_width // 2, notif_y))
            self.screen.blit(notif_text, notif_rect)
            
    def update(self):
        """Update animation state"""
        if self.power_animating:
            if self.powered_on:
                self.screen_alpha = min(255, self.screen_alpha + 5)
                if self.screen_alpha >= 255:
                    self.power_animating = False
            else:
                self.screen_alpha = max(0, self.screen_alpha - 5)
                if self.screen_alpha <= 0:
                    self.power_animating = False
                    
        # Clear channel input after timeout
        if self.channel_input and time.time() - self.channel_input_time > 2.0:
            self.channel_input = ""
            
    def run(self, command_queue):
        """Main loop"""
        running = True
        
        # Keyboard shortcuts for testing (maps keys to button codes)
        key_to_button = {
            pygame.K_p: 0x10,  # P = Power
            pygame.K_u: 0x11,  # U = Volume Up
            pygame.K_d: 0x12,  # D = Volume Down
            pygame.K_m: 0x13,  # M = Mute
            pygame.K_UP: 0x14,    # Up arrow = Channel Up
            pygame.K_DOWN: 0x15,  # Down arrow = Channel Down
            pygame.K_h: 0x20,  # H = Home
            pygame.K_n: 0x21,  # N = Menu
            pygame.K_b: 0x22,  # B = Back
            pygame.K_i: 0x70,  # I = Info
            pygame.K_1: 0x51,  # 1 = Channel 1
            pygame.K_2: 0x52,  # 2 = Channel 2
            pygame.K_3: 0x53,  # 3 = Channel 3
            pygame.K_4: 0x54,  # 4 = Channel 4
            pygame.K_5: 0x55,  # 5 = Channel 5
            pygame.K_y: 0x01,  # Y = YouTube
            pygame.K_t: 0x02,  # T = Netflix (Netflix)
            pygame.K_a: 0x03,  # A = Amazon Prime
            pygame.K_g: 0xA0,  # G = Game Mode
        }
        
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif event.key in key_to_button:
                        # Simulate button press from keyboard
                        button_code = key_to_button[event.key]
                        self.handle_button(button_code)
                        
            # Check for commands from IPC
            try:
                while not command_queue.empty():
                    button_code = command_queue.get_nowait()
                    self.handle_button(button_code)
            except:
                pass
                
            # Update
            self.update()
            
            # Draw
            self.screen.fill((20, 20, 20))
            screen_rect = self.draw_tv_frame()
            self.draw_screen_content(screen_rect)
            self.draw_status_panel()
            
            # Instructions
            inst_lines = [
                "Press ESC to exit | Keyboard shortcuts: P=Power, U/D=Volume, M=Mute, H=Home, N=Menu, I=Info",
                "Arrow keys: Channel Up/Down | 1-5: Channels | Y=YouTube, T=Netflix, A=Prime, G=Game Mode"
            ]
            for i, line in enumerate(inst_lines):
                inst_text = self.font_tiny.render(line, True, LIGHT_GRAY)
                self.screen.blit(inst_text, (10, WINDOW_HEIGHT - 50 + i * 20))
            
            pygame.display.flip()
            self.clock.tick(FPS)
            
        pygame.quit()

