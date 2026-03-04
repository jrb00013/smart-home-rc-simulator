#ifdef SIMULATOR
#ifndef TV_SIMULATOR_WEB

#include "../include/tv_simulator.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#ifdef _WIN32
#include <windows.h>
#else
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <errno.h>
#endif

/* IPC Configuration */
#ifdef _WIN32
#define PIPE_NAME "\\\\.\\pipe\\phillips_remote_tv"
#else
#define SOCKET_PATH "/tmp/phillips_remote_tv.sock"
#endif

static int simulator_connected = 0;

#ifdef _WIN32
static HANDLE pipe_handle = INVALID_HANDLE_VALUE;
#else
static int socket_fd = -1;
#endif

/**
 * @brief Initialize connection to TV simulator (Windows)
 */
#ifdef _WIN32
int tv_simulator_init(void) {
    if (simulator_connected) {
        return 0;
    }
    
    printf("[Simulator] Connecting to virtual TV...\n");
    
    /* Try to open existing pipe */
    pipe_handle = CreateFile(
        PIPE_NAME,
        GENERIC_WRITE,
        0,
        NULL,
        OPEN_EXISTING,
        0,
        NULL
    );
    
    if (pipe_handle == INVALID_HANDLE_VALUE) {
        DWORD error = GetLastError();
        if (error == ERROR_PIPE_BUSY) {
            printf("[Simulator] Pipe is busy, simulator may not be running\n");
        } else if (error == ERROR_FILE_NOT_FOUND) {
            printf("[Simulator] Simulator not found. Start it with: python test_simulator/main.py\n");
        } else {
            printf("[Simulator] Failed to connect: error %lu\n", error);
        }
        return -1;
    }
    
    /* Set pipe mode to message mode */
    DWORD mode = PIPE_READMODE_MESSAGE;
    if (!SetNamedPipeHandleState(pipe_handle, &mode, NULL, NULL)) {
        printf("[Simulator] Failed to set pipe mode\n");
        CloseHandle(pipe_handle);
        pipe_handle = INVALID_HANDLE_VALUE;
        return -1;
    }
    
    simulator_connected = 1;
    printf("[Simulator] Connected to virtual TV simulator\n");
    return 0;
}
#else
/**
 * @brief Initialize connection to TV simulator (Unix)
 */
int tv_simulator_init(void) {
    if (simulator_connected) {
        return 0;
    }
    
    printf("[Simulator] Connecting to virtual TV...\n");
    
    socket_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (socket_fd < 0) {
        printf("[Simulator] Failed to create socket: %s\n", strerror(errno));
        return -1;
    }
    
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, SOCKET_PATH, sizeof(addr.sun_path) - 1);
    
    if (connect(socket_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        printf("[Simulator] Failed to connect to simulator: %s\n", strerror(errno));
        printf("[Simulator] Make sure the simulator is running: python test_simulator/main.py\n");
        close(socket_fd);
        socket_fd = -1;
        return -1;
    }
    
    simulator_connected = 1;
    printf("[Simulator] Connected to virtual TV simulator\n");
    return 0;
}
#endif

/**
 * @brief Send button code to TV simulator (Windows)
 */
#ifdef _WIN32
int tv_simulator_send_button(unsigned char button_code) {
    if (!simulator_connected || pipe_handle == INVALID_HANDLE_VALUE) {
        return -1;
    }
    
    DWORD bytes_written;
    if (!WriteFile(pipe_handle, &button_code, sizeof(button_code), &bytes_written, NULL)) {
        DWORD error = GetLastError();
        if (error == ERROR_BROKEN_PIPE) {
            printf("[Simulator] Connection lost, simulator may have closed\n");
            CloseHandle(pipe_handle);
            pipe_handle = INVALID_HANDLE_VALUE;
            simulator_connected = 0;
        }
        return -1;
    }
    
    if (bytes_written != sizeof(button_code)) {
        return -1;
    }
    
    FlushFileBuffers(pipe_handle);
    return 0;
}
#else
/**
 * @brief Send button code to TV simulator (Unix)
 */
int tv_simulator_send_button(unsigned char button_code) {
    if (!simulator_connected || socket_fd < 0) {
        return -1;
    }
    
    ssize_t sent = send(socket_fd, &button_code, sizeof(button_code), 0);
    if (sent < 0) {
        printf("[Simulator] Failed to send: %s\n", strerror(errno));
        close(socket_fd);
        socket_fd = -1;
        simulator_connected = 0;
        return -1;
    }
    
    if (sent != sizeof(button_code)) {
        return -1;
    }
    
    return 0;
}
#endif

/**
 * @brief Close connection to TV simulator
 */
void tv_simulator_cleanup(void) {
    if (!simulator_connected) {
        return;
    }
    
#ifdef _WIN32
    if (pipe_handle != INVALID_HANDLE_VALUE) {
        CloseHandle(pipe_handle);
        pipe_handle = INVALID_HANDLE_VALUE;
    }
#else
    if (socket_fd >= 0) {
        close(socket_fd);
        socket_fd = -1;
    }
#endif
    
    simulator_connected = 0;
    printf("[Simulator] Disconnected from virtual TV\n");
}

#endif /* !TV_SIMULATOR_WEB */
#endif /* SIMULATOR */

