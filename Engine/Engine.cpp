#include "Engine.h"
#include "CVData.h"
#include <iostream>
#include <system_error>
#include <string>
#include <sstream>
#include <thread>
#include <vector>

Engine& Engine::getInstance(int port) {
    static Engine instance(port);
    return instance;
}

Engine::Engine(int port) : port(port) {
    if (WSAStartup(MAKEWORD(2, 2), &wsaData) != 0) {
        std::cerr << "WSAStartup failed: " << WSAGetLastError() << std::endl;
        exit(EXIT_FAILURE);
    }
}

void Engine::cleanup() {
    if (server_fd != INVALID_SOCKET) {
        closesocket(server_fd);
    }
    WSACleanup();
}

void Engine::start() {
    runServer();
}

std::string Engine::extractHttpBody(const std::string& request) {
    // Find the double CRLF that separates headers from body
    size_t headerEnd = request.find("\r\n\r\n");
    if (headerEnd != std::string::npos) {
        return request.substr(headerEnd + 4); // Skip the "\r\n\r\n"
    }
    return "";
}

int Engine::extractContentLength(const std::string& request) {
    size_t pos = request.find("Content-Length:");
    if (pos != std::string::npos) {
        size_t start = pos + 15; // Length of "Content-Length:"
        size_t end = request.find("\r\n", start);
        if (end != std::string::npos) {
            std::string lengthStr = request.substr(start, end - start);
            // Remove any whitespace
            lengthStr.erase(0, lengthStr.find_first_not_of(" \t"));
            lengthStr.erase(lengthStr.find_last_not_of(" \t") + 1);
            return std::stoi(lengthStr);
        }
    }
    return 0;
}

std::string Engine::processCVText(const std::string& cvText) {
    try {
        std::cout << "Processing CV text of length: " << cvText.length() << std::endl;

        // Create CVData object with the received text
        CVData* cvData = new CVData(cvText);

        // Create JSON response with extracted data
        std::ostringstream json;
        json << "{\n";
        json << "  \"status\": \"success\",\n";
        json << "  \"data\": {\n";
        json << "    \"name\": \"" << cvData->getName() << "\",\n";
        json << "    \"surname\": \"" << cvData->getSurname() << "\",\n";
        json << "    \"email\": \"" << cvData->getEmail() << "\",\n";
        json << "    \"linkedin\": \"" << cvData->getLinkedIn() << "\",\n";
        json << "    \"github\": \"" << cvData->getGitHub() << "\",\n";
        json << "    \"about\": \"" << cvData->getAbout() << "\",\n";
        json << "    \"education\": \"" << cvData->getEdu() << "\",\n";

        // Add skills array
        json << "    \"skills\": [";
        auto skills = cvData->getSkills();
        for (size_t i = 0; i < skills.size(); ++i) {
            json << "\"" << skills[i] << "\"";
            if (i < skills.size() - 1) json << ", ";
        }
        json << "],\n";

        // Add experience object
        json << "    \"experience\": {\n";
        auto experience = cvData->getXP();
        auto it = experience.begin();
        for (auto& exp : experience) {
            json << "      \"" << exp.first << "\": " << exp.second;
            if (++it != experience.end()) json << ",";
            json << "\n";
            --it;
            ++it;
        }
        json << "    }\n";
        json << "  }\n";
        json << "}";

        // Clean up
        delete cvData;

        return json.str();
    }
    catch (const std::exception& e) {
        std::cerr << "Error processing CV: " << e.what() << std::endl;
        return "{\"status\": \"error\", \"message\": \"Failed to process CV data\"}";
    }
}

void Engine::handleClient(SOCKET client_socket) {
    char buffer[8192];
    std::string request;

    // Receive the request
    int bytes_received = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
    if (bytes_received > 0) {
        buffer[bytes_received] = '\0';
        request = std::string(buffer);

        std::cout << "Received request headers:\n" << request.substr(0, request.find("\r\n\r\n")) << std::endl;

        // Check if this is a POST request to /process-cv
        if (request.find("POST /process-cv") == 0) {
            // Extract content length
            int contentLength = extractContentLength(request);
            std::string body = extractHttpBody(request);

            // If we haven't received the full body, keep reading
            while (body.length() < contentLength) {
                int additional_bytes = recv(client_socket, buffer, sizeof(buffer) - 1, 0);
                if (additional_bytes > 0) {
                    buffer[additional_bytes] = '\0';
                    body += std::string(buffer);
                } else {
                    break;
                }
            }

            std::cout << "Received CV text:\n" << body << std::endl;

            // Process the CV text
            std::string jsonResponse = processCVText(body);

            // Send HTTP response
            std::ostringstream response;
            response << "HTTP/1.1 200 OK\r\n";
            response << "Content-Type: application/json\r\n";
            response << "Access-Control-Allow-Origin: *\r\n";
            response << "Access-Control-Allow-Methods: POST, OPTIONS\r\n";
            response << "Access-Control-Allow-Headers: Content-Type\r\n";
            response << "Content-Length: " << jsonResponse.length() << "\r\n";
            response << "Connection: close\r\n";
            response << "\r\n";
            response << jsonResponse;

            std::string responseStr = response.str();
            send(client_socket, responseStr.c_str(), responseStr.length(), 0);

        } else if (request.find("OPTIONS") == 0) {
            // Handle CORS preflight request
            std::string corsResponse =
                "HTTP/1.1 200 OK\r\n"
                "Access-Control-Allow-Origin: *\r\n"
                "Access-Control-Allow-Methods: POST, OPTIONS\r\n"
                "Access-Control-Allow-Headers: Content-Type\r\n"
                "Content-Length: 0\r\n"
                "Connection: close\r\n"
                "\r\n";

            send(client_socket, corsResponse.c_str(), corsResponse.length(), 0);

        } else {
            // Send 404 for other requests
            std::string notFoundResponse =
                "HTTP/1.1 404 Not Found\r\n"
                "Content-Type: text/plain\r\n"
                "Content-Length: 13\r\n"
                "Connection: close\r\n"
                "\r\n"
                "404 Not Found";

            send(client_socket, notFoundResponse.c_str(), notFoundResponse.length(), 0);
        }
    }

    closesocket(client_socket);
}

void Engine::runServer() {
    struct sockaddr_in address;
    int opt = 1;

    // Create socket
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET) {
        std::cerr << "Socket creation failed: " << WSAGetLastError() << std::endl;
        cleanup();
        exit(EXIT_FAILURE);
    }

    // Set socket options
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR,
                   (char*)&opt, sizeof(opt)) == SOCKET_ERROR) {
        std::cerr << "Setsockopt failed: " << WSAGetLastError() << std::endl;
        cleanup();
        exit(EXIT_FAILURE);
    }

    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    // Bind socket
    if (bind(server_fd, (struct sockaddr*)&address,
             sizeof(address)) == SOCKET_ERROR) {
        std::cerr << "Bind failed: " << WSAGetLastError() << std::endl;
        cleanup();
        exit(EXIT_FAILURE);
    }

    // Listen
    if (listen(server_fd, SOMAXCONN) == SOCKET_ERROR) {
        std::cerr << "Listen failed: " << WSAGetLastError() << std::endl;
        cleanup();
        exit(EXIT_FAILURE);
    }

    std::cout << "CV Processing Server running on port " << port << std::endl;
    std::cout << "Send POST requests to: http://localhost:" << port << "/process-cv" << std::endl;

    // Server loop
    while (true) {
        SOCKET new_socket = accept(server_fd, NULL, NULL);
        if (new_socket == INVALID_SOCKET) {
            std::cerr << "Accept failed: " << WSAGetLastError() << std::endl;
            continue;
        }

        // Handle the client in a separate thread for better performance
        std::thread clientThread(&Engine::handleClient, this, new_socket);
        clientThread.detach(); // Let the thread run independently
    }

    cleanup();
}