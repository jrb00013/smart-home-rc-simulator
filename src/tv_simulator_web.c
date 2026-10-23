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
#include <sys/time.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <unistd.h>
#include <errno.h>
#endif

/* Web server configuration (defaults; overridable via the same env vars the
 * Python server reads: TV_REMOTE_HOST, TV_REMOTE_PORT, TV_REMOTE_API_KEY) */
#define WEB_SERVER_DEFAULT_HOST "localhost"
#define WEB_SERVER_DEFAULT_PORT "5000"
#define WEB_SERVER_PATH "/api/button"

/* Host to connect to: a wildcard bind address is not a valid destination */
static const char* web_host(void) {
    const char* host = getenv("TV_REMOTE_HOST");
    if (!host || !*host || strcmp(host, "0.0.0.0") == 0 || strcmp(host, "::") == 0) {
        return WEB_SERVER_DEFAULT_HOST;
    }
    return host;
}

static const char* web_port(void) {
    const char* port = getenv("TV_REMOTE_PORT");
    return (port && *port) ? port : WEB_SERVER_DEFAULT_PORT;
}

/* Optional API key; rejected if it could inject extra HTTP headers */
static const char* web_api_key(void) {
    const char* key = getenv("TV_REMOTE_API_KEY");
    if (!key || !*key || strpbrk(key, "\r\n")) {
        return NULL;
    }
    return key;
}

#ifndef _WIN32
/* Don't let a closed simulator socket kill the process with SIGPIPE */
#ifndef MSG_NOSIGNAL
#define MSG_NOSIGNAL 0
#endif
#endif

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
    
    const char* host = web_host();
    const char* port = web_port();
    printf("[Simulator] Connecting to web server at http://%s:%s...\n", host, port);
    
    // Resolve host (IPv4 or IPv6) and connect to the first address that works
    struct addrinfo hints;
    struct addrinfo* results = NULL;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    int gai = getaddrinfo(host, port, &hints, &results);
    if (gai != 0 || results == NULL) {
        printf("[Simulator] Failed to resolve %s:%s\n", host, port);
        printf("[Simulator] Make sure the web server is running: python test_simulator/web_server.py\n");
#ifdef _WIN32
        WSACleanup();
#endif
        return -1;
    }
    
    socket_fd = -1;
    for (struct addrinfo* ai = results; ai != NULL; ai = ai->ai_next) {
        socket_fd = (int)socket(ai->ai_family, ai->ai_socktype, ai->ai_protocol);
        if (socket_fd < 0) {
            continue;
        }
        if (connect(socket_fd, ai->ai_addr, (int)ai->ai_addrlen) == 0) {
            break;
        }
#ifdef _WIN32
        closesocket(socket_fd);
#else
        close(socket_fd);
#endif
        socket_fd = -1;
    }
    freeaddrinfo(results);
    
    if (socket_fd < 0) {
        printf("[Simulator] Failed to connect to web server\n");
        printf("[Simulator] Make sure the web server is running: python test_simulator/web_server.py\n");
#ifdef _WIN32
        WSACleanup();
#endif
        return -1;
    }
    
    web_connected = 1;
    printf("[Simulator] Connected to web server (3D TV interface)\n");
    printf("[Simulator] Open http://%s:%s in your browser\n", host, port);
    return 0;
}

static void close_socket(void) {
    if (socket_fd >= 0) {
#ifdef _WIN32
        closesocket(socket_fd);
#else
        close(socket_fd);
#endif
        socket_fd = -1;
    }
    web_connected = 0;
}

/**
 * @brief Send one request on the open connection and return the HTTP status
 *
 * Always closes the connection afterwards. Returns -1 if nothing could be
 * sent or no status line was received.
 */
static int send_request(const char* request, size_t len) {
    size_t off = 0;
    while (off < len) {
#ifdef _WIN32
        int sent = send(socket_fd, request + off, (int)(len - off), 0);
#else
        ssize_t sent = send(socket_fd, request + off, len - off, MSG_NOSIGNAL);
#endif
        if (sent <= 0) {
            close_socket();
            return -1;
        }
        off += (size_t)sent;
    }
    
    /* Wait (bounded) for the status line, e.g. "HTTP/1.1 200 OK" */
#ifdef _WIN32
    DWORD timeout_ms = 2000;
    setsockopt(socket_fd, SOL_SOCKET, SO_RCVTIMEO, (const char*)&timeout_ms, sizeof(timeout_ms));
#else
    struct timeval tv = { 2, 0 };
    setsockopt(socket_fd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv));
#endif
    char response[128];
    size_t got = 0;
    while (got < sizeof(response) - 1 && !memchr(response, '\n', got)) {
        int n = (int)recv(socket_fd, response + got, (int)(sizeof(response) - 1 - got), 0);
        if (n <= 0) {
            break;
        }
        got += (size_t)n;
    }
    response[got] = '\0';
    close_socket();
    
    int status = -1;
    if (sscanf(response, "HTTP/%*s %d", &status) != 1) {
        return -1;
    }
    return status;
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
    char request[1024];
    char json_body[128];
    char auth_header[600] = "";
    const char* api_key = web_api_key();
    
    if (api_key) {
        int n = snprintf(auth_header, sizeof(auth_header), "X-API-Key: %s\r\n", api_key);
        if (n < 0 || (size_t)n >= sizeof(auth_header)) {
            printf("[Simulator] TV_REMOTE_API_KEY is too long\n");
            return -1;
        }
    }
    
    snprintf(json_body, sizeof(json_body), "{\"button_code\":%d}", button_code);
    int req_len = snprintf(request, sizeof(request),
        "POST %s HTTP/1.1\r\n"
        "Host: %s:%s\r\n"
        "Content-Type: application/json\r\n"
        "Content-Length: %zu\r\n"
        "%s"
        "Connection: close\r\n"
        "\r\n"
        "%s",
        WEB_SERVER_PATH, web_host(), web_port(),
        strlen(json_body), auth_header, json_body);
    if (req_len < 0 || (size_t)req_len >= sizeof(request)) {
        printf("[Simulator] Request too large\n");
        return -1;
    }
    
    /* One request per connection: the server closes after each response, so
     * reusing the socket silently dropped every press after the first. A
     * connection opened earlier (e.g. by init) may already be stale, so retry
     * once on a fresh one before giving up. */
    int status = send_request(request, (size_t)req_len);
    if (status < 0) {
        if (tv_simulator_init() != 0) {
            return -1;
        }
        status = send_request(request, (size_t)req_len);
    }
    if (status < 0) {
        printf("[Simulator] Failed to send button 0x%02X to web server\n", button_code);
        return -1;
    }
    if (status == 401) {
        printf("[Simulator] Web server rejected the request (401): set TV_REMOTE_API_KEY\n");
        return -1;
    }
    if (status < 200 || status >= 300) {
        printf("[Simulator] Web server returned HTTP %d for button 0x%02X\n", status, button_code);
        return -1;
    }
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

