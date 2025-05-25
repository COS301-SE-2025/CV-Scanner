// EngineCLI.cpp
#include "EngineCLI.h"
#include <iostream>
#include <fstream>
#include <tlhelp32.h>

EngineCLI::EngineCLI() {
    ENGINE_EXE = "Engine.exe";
    PID_FILE = "engine.pid";
#ifdef __linux__
    ENGINE_EXE = "./Engine";
#endif
}

void EngineCLI::executeCommand(int argc, char* argv[]) {
    if(argc < 2) {
        showHelp();
        return;
    }

    std::string command = argv[1];

    if(command == "start") {
        start();
    } else if(command == "stop") {
        stop();
    } else if(command == "status") {
        status();
    } else {
        std::cerr << "Unknown command: " << command << "\n";
        showHelp();
    }
}

void EngineCLI::start() {
    if(isRunning()) {
        std::cout << "Engine is already running (PID: " << getPID() << ")\n";
        return;
    }

    STARTUPINFO si = {sizeof(STARTUPINFO)};
    PROCESS_INFORMATION pi;

    if(CreateProcess(
            ENGINE_EXE.c_str(),   // Executable name
            NULL,                 // Command line
            NULL,                 // Process security attributes
            NULL,                 // Thread security attributes
            FALSE,                // Inherit handles
            CREATE_NO_WINDOW,    // Creation flags
            NULL,                // Environment
            NULL,                // Current directory
            &si,                 // Startup info
            &pi                  // Process info
    )) {
        std::ofstream pidFile(PID_FILE);
        pidFile << pi.dwProcessId;
        pidFile.close();

        std::cout << "Engine started successfully (PID: " << pi.dwProcessId << ")\n";
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    } else {
        std::cerr << "Failed to start engine. Error: " << GetLastError() << "\n";
    }
}

void EngineCLI::stop() {
    if(!isRunning()) {
        std::cout << "Engine is not running\n";
        return;
    }

    DWORD pid = getPID();
    HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);

    if(hProcess != NULL) {
        TerminateProcess(hProcess, 0);
        CloseHandle(hProcess);
        remove(PID_FILE.c_str());
        std::cout << "Engine stopped successfully\n";
    } else {
        std::cerr << "Failed to stop engine. Error: " << GetLastError() << "\n";
    }
}

void EngineCLI::status() {
    if(isRunning()) {
        std::cout << "Engine is running (PID: " << getPID() << ")\n";
    } else {
        std::cout << "Engine is not running\n";
    }
}

bool EngineCLI::isRunning() {
    DWORD pid = getPID();
    if(pid == 0) return false;

    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, pid);
    if(hProcess == NULL) return false;

    DWORD exitCode;
    GetExitCodeProcess(hProcess, &exitCode);
    CloseHandle(hProcess);

    return (exitCode == STILL_ACTIVE);
}

DWORD EngineCLI::getPID() {
    std::ifstream pidFile(PID_FILE);
    if(!pidFile.good()) return 0;

    DWORD pid;
    pidFile >> pid;
    pidFile.close();

    return pid;
}

void EngineCLI::showHelp() {
    std::cout << "Engine Control CLI\n"
              << "Usage:\n"
              << "  engine-cli start    - Start the engine\n"
              << "  engine-cli stop     - Stop the engine\n"
              << "  engine-cli status   - Show engine status\n";
}