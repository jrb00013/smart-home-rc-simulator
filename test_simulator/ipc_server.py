#!/usr/bin/env python3
"""
IPC Server for Virtual TV Simulator
Listens for commands from the C program via named pipe (Windows) or socket (Unix)
"""

import sys
import os
import queue
import threading
import time

# Platform-specific IPC
if sys.platform == 'win32':
    # Windows: Use named pipe
    try:
        import win32pipe
        import win32file
        import pywintypes
    except ImportError:
        print("ERROR: pywin32 is required on Windows!")
        print("Install with: pip install pywin32")
        sys.exit(1)
    
    PIPE_NAME = r'\\.\pipe\phillips_remote_tv'
    
    def setup_ipc():
        """Setup Windows named pipe"""
        try:
            # Create named pipe
            pipe = win32pipe.CreateNamedPipe(
                PIPE_NAME,
                win32pipe.PIPE_ACCESS_DUPLEX,
                win32pipe.PIPE_TYPE_MESSAGE | win32pipe.PIPE_READMODE_MESSAGE | win32pipe.PIPE_WAIT,
                1, 65536, 65536, 0, None
            )
            print(f"[IPC] Created named pipe: {PIPE_NAME}")
            return pipe
        except Exception as e:
            print(f"[IPC] Error creating pipe: {e}")
            return None
            
    def accept_connection(pipe):
        """Accept connection on named pipe"""
        try:
            win32pipe.ConnectNamedPipe(pipe, None)
            print("[IPC] Client connected")
            return True
        except pywintypes.error as e:
            if e.args[0] == 535:  # ERROR_PIPE_CONNECTED
                print("[IPC] Client already connected")
                return True
            return False
            
    def read_command(pipe):
        """Read command from pipe"""
        try:
            result, data = win32file.ReadFile(pipe, 64)
            if result == 0:
                return int.from_bytes(data, byteorder='little')
        except:
            pass
        return None
        
    def close_ipc(pipe):
        """Close named pipe"""
        try:
            win32file.CloseHandle(pipe)
        except:
            pass
            
else:
    # Unix: Use Unix domain socket
    import socket
    
    SOCKET_PATH = '/tmp/phillips_remote_tv.sock'
    
    def setup_ipc():
        """Setup Unix domain socket"""
        try:
            # Remove old socket if exists
            if os.path.exists(SOCKET_PATH):
                os.unlink(SOCKET_PATH)
                
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.bind(SOCKET_PATH)
            sock.listen(1)
            print(f"[IPC] Created Unix socket: {SOCKET_PATH}")
            return sock
        except Exception as e:
            print(f"[IPC] Error creating socket: {e}")
            return None
            
    def accept_connection(sock):
        """Accept connection on socket"""
        try:
            conn, addr = sock.accept()
            print("[IPC] Client connected")
            return conn
        except:
            return None
            
    def read_command(conn):
        """Read command from socket"""
        try:
            data = conn.recv(4)
            if len(data) == 4:
                return int.from_bytes(data, byteorder='little')
        except:
            pass
        return None
        
    def close_ipc(sock):
        """Close socket"""
        try:
            sock.close()
            if os.path.exists(SOCKET_PATH):
                os.unlink(SOCKET_PATH)
        except:
            pass

def ipc_listener(command_queue, stop_event):
    """Listen for IPC commands in a separate thread"""
    ipc = setup_ipc()
    if not ipc:
        print("[IPC] Failed to setup IPC, simulator will not receive commands")
        return
        
    connection = None
    
    while not stop_event.is_set():
        try:
            if connection is None:
                if sys.platform == 'win32':
                    # On Windows, accept connection on the pipe
                    if accept_connection(ipc):
                        connection = ipc
                        print("[IPC] Client connected (Windows)")
                else:
                    # On Unix, accept connection and get new socket
                    connection = accept_connection(ipc)
                    if connection:
                        print("[IPC] Client connected (Unix)")
                        
            if connection:
                button_code = read_command(connection)
                if button_code is not None:
                    command_queue.put(button_code)
                    print(f"[IPC] Received button code: 0x{button_code:02X}")
                else:
                    # Connection closed
                    print("[IPC] Client disconnected, waiting for new connection...")
                    if sys.platform == 'win32':
                        # On Windows, disconnect and recreate pipe
                        try:
                            win32file.DisconnectNamedPipe(connection)
                        except:
                            pass
                        close_ipc(connection)
                        connection = None
                        ipc = setup_ipc()
                        if not ipc:
                            print("[IPC] Failed to recreate pipe")
                            break
                    else:
                        # On Unix, close connection and wait for new one
                        try:
                            connection.close()
                        except:
                            pass
                        connection = None
            else:
                time.sleep(0.1)
                
        except Exception as e:
            print(f"[IPC] Error: {e}")
            if connection:
                if sys.platform == 'win32':
                    try:
                        win32file.DisconnectNamedPipe(connection)
                    except:
                        pass
                    close_ipc(connection)
                else:
                    try:
                        connection.close()
                    except:
                        pass
            connection = None
            if sys.platform == 'win32':
                ipc = setup_ipc()
                if not ipc:
                    print("[IPC] Failed to recreate pipe after error")
                    break
            time.sleep(0.1)
            
    # Cleanup
    if connection:
        if sys.platform == 'win32':
            try:
                win32file.DisconnectNamedPipe(connection)
            except:
                pass
            close_ipc(connection)
        else:
            try:
                connection.close()
            except:
                pass
    if ipc and (sys.platform != 'win32' or connection != ipc):
        close_ipc(ipc)

if __name__ == "__main__":
    # This will be imported by the main simulator
    pass

