#!/usr/bin/env python3
"""
Main entry point for Virtual TV Simulator
Run this to start the virtual TV interface
"""

import sys
import queue
import threading
from virtual_tv import VirtualTV
from ipc_server import ipc_listener

def main():
    """Main entry point for Poetry script"""
    print("=" * 60)
    print("  Phillips Universal Remote - Virtual TV Simulator")
    print("=" * 60)
    print()
    print("Starting virtual TV...")
    print("The TV will respond to commands from the remote control program.")
    print("Press ESC in the TV window to exit.")
    print()
    
    # Check for pygame
    try:
        import pygame
    except ImportError:
        print("ERROR: pygame is not installed!")
        print("Please install it with: poetry install (or pip install pygame)")
        sys.exit(1)
        
    # Check for Windows-specific imports
    if sys.platform == 'win32':
        try:
            import win32pipe
            import win32file
        except ImportError:
            print("ERROR: pywin32 is not installed!")
            print("Please install it with: poetry install (or pip install pywin32)")
            sys.exit(1)
    
    # Create command queue for IPC
    command_queue = queue.Queue()
    stop_event = threading.Event()
    
    # Start IPC listener thread
    ipc_thread = threading.Thread(target=ipc_listener, 
                                 args=(command_queue, stop_event),
                                 daemon=True)
    ipc_thread.start()
    
    # Create and run TV
    tv = VirtualTV()
    try:
        tv.run(command_queue)
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        stop_event.set()
        print("Virtual TV simulator closed.")

if __name__ == "__main__":
    main()

