#ifndef ENGINE_H
#define ENGINE_H

#include <string>

#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #define SOCKET int
    #define INVALID_SOCKET -1
    #define WSADATA int
#endif

class Engine {
private:
    int port;
    SOCKET server_fd = INVALID_SOCKET;
#ifdef _WIN32
    WSADATA wsaData;
#endif

    Engine(int port);
    void runServer();

public:
    static Engine& getInstance(int port = 8080);
    void cleanup();
    void start();
    void handleClient(SOCKET client_socket);
    std::string extractHttpBody(const std::string& request);
    int extractContentLength(const std::string& request);
    std::string processCVText(const std::string& cvText);
};

#endif