#ifdef SIMULATOR

#include "../include/tv_simulator.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
#include <windows.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <errno.h>
#endif

/* Web server configuration */
#define WEB_SERVER_HOST "localhost"
#define WEB_SERVER_PORT 5000
#define WEB_SERVER_PATH "/api/button"

static int web_connected = 0;
static int socket_fd = -1;

#ifdef _WIN32
static WSADATA wsaData;
#endif

/**
 * @brief Initialize connection to web server
 */
int tv_simulator_init(void) {
    if (web_connected) {
        return 0;
    }
    
#ifdef _WIN32
    // Initialize Winsock
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        printf("[Simulator] Failed to initialize Winsock\n");
        return -1;
    }
#endif
    
    printf("[Simulator] Connecting to web server at http://%s:%d...\n", 
           WEB_SERVER_HOST, WEB_SERVER_PORT);
    
    // Create socket
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_fd < 0) {
#ifdef _WIN32
        printf("[Simulator] Failed to create socket: %d\n", WSAGetLastError());
        WSACleanup();
#else
        printf("[Simulator] Failed to create socket: %s\n", strerror(errno));
#endif
        return -1;
    }
    
    // Resolve hostname
    struct hostent *server = gethostbyname(WEB_SERVER_HOST);
    if (server == NULL) {
        printf("[Simulator] Failed to resolve hostname: %s\n", WEB_SERVER_HOST);
        printf("[Simulator] Make sure the web server is running: python test_simulator/web_server.py\n");
#ifdef _WIN32
        closesocket(socket_fd);
        WSACleanup();
#else
        close(socket_fd);
#endif
        socket_fd = -1;
        return -1;
    }
    
    // Setup server address
    struct sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    memcpy(&server_addr.sin_addr.s_addr, server->h_addr_list[0], (size_t)server->h_length);
    server_addr.sin_port = htons(WEB_SERVER_PORT);
    
    // Connect to server
    if (connect(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0) {
        printf("[Simulator] Failed to connect to web server\n");
        printf("[Simulator] Make sure the web server is running: python test_simulator/web_server.py\n");
#ifdef _WIN32
        closesocket(socket_fd);
        WSACleanup();
#else
        close(socket_fd);
#endif
        socket_fd = -1;
        return -1;
    }
    
    web_connected = 1;
    printf("[Simulator] Connected to web server (3D TV interface)\n");
    printf("[Simulator] Open http://localhost:%d in your browser\n", WEB_SERVER_PORT);
    return 0;
}

/**
 * @brief Send button code to web server via HTTP POST
 */
int tv_simulator_send_button(unsigned char button_code) {
    // Reconnect if not connected
    if (!web_connected || socket_fd < 0) {
        if (tv_simulator_init() != 0) {
            return -1;
        }
    }
    
    // Create HTTP POST request
    char request[512];
    char json_body[128];
    
    snprintf(json_body, sizeof(json_body), "{\"button_code\":%d}", button_code);
    snprintf(request, sizeof(request),
        "POST %s HTTP/1.1\r\n"
        "Host: %s:%d\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %zu\r\n"
        "Connection: keep-alive\r\n"
        "\r\n"
        "%s",
        WEB_SERVER_PATH, WEB_SERVER_HOST, WEB_SERVER_PORT,
        strlen(json_body), json_body);
    
    // Send request
    int sent = send(socket_fd, request, strlen(request), 0);
    if (sent < 0) {
#ifdef _WIN32
        int error = WSAGetLastError();
        if (error == WSAENOTCONN || error == WSAECONNRESET) {
            printf("[Simulator] Connection lost, reconnecting...\n");
            closesocket(socket_fd);
            socket_fd = -1;
            web_connected = 0;
            tv_simulator_init();  // Try to reconnect
        }
#else
        if (errno == EPIPE || errno == ECONNRESET) {
            printf("[Simulator] Connection lost, reconnecting...\n");
            close(socket_fd);
            socket_fd = -1;
            web_connected = 0;
            tv_simulator_init();  // Try to reconnect
        }
#endif
        return -1;
    }
    
    // Read response (simple, don't wait for full response)
    char response[256];
    recv(socket_fd, response, sizeof(response) - 1, MSG_DONTWAIT);
    
    return 0;
}

/**
 * @brief Close connection to web server
 */
void tv_simulator_cleanup(void) {
    if (!web_connected) {
        return;
    }
    
    if (socket_fd >= 0) {
#ifdef _WIN32
        closesocket(socket_fd);
        WSACleanup();
#else
        close(socket_fd);
#endif
        socket_fd = -1;
    }
    
    web_connected = 0;
    printf("[Simulator] Disconnected from web server\n");
}

#endif /* SIMULATOR */

