#ifndef ENGINE_H
#define ENGINE_H

#include <winsock2.h>
#include <ws2tcpip.h>
#include <string>

#pragma comment(lib, "Ws2_32.lib")

class Engine {
private:
    static Engine* instance;
    int port;
    SOCKET server_fd = INVALID_SOCKET;
    WSADATA wsaData;

    Engine(int port);
    void runServer();
    void cleanup();

    // New methods for HTTP handling
    void handleClient(SOCKET client_socket);
    std::string extractHttpBody(const std::string& request);
    int extractContentLength(const std::string& request);
    std::string processCVText(const std::string& cvText);

public:
    static Engine& getInstance(int port = 8080);
    void start();

    // Delete copy constructor and assignment operator
    Engine(const Engine&) = delete;
    Engine& operator=(const Engine&) = delete;

    ~Engine() {
        cleanup();
    }
};

#endif // ENGINE_H