#ifndef ENGINE_ENGINE_H
#define ENGINE_ENGINE_H

#include <string>
#include <winsock2.h>
#include <ws2tcpip.h>

class Engine {
public:
    static Engine& getInstance(int port = 8080);
    void start();

    Engine(const Engine&) = delete;
    void operator=(const Engine&) = delete;

private:
    Engine(int port);
    void runServer();
    void cleanup();

    int port;
    SOCKET server_fd = INVALID_SOCKET;
    WSADATA wsaData;
};

#endif // ENGINE_ENGINE_H