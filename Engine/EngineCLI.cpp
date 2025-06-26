// EngineCLI.cpp
#include "EngineCLI.h"
#include <iostream>
#include <fstream>
#include <filesystem>

#ifdef _WIN32
#include <tlhelp32.h>
#include <windows.h>
#else
#include <unistd.h>
#include <sys/wait.h>
#include <signal.h>
#include <cstdlib>
#endif

EngineCLI::EngineCLI() {
#ifdef _WIN32
    ENGINE_EXE = "Engine.exe";
#else
    ENGINE_EXE = "./Engine";
#endif
    PID_FILE = "engine.pid";
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
    } else if(command == "restart") {
        restart();
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

    // Check if engine executable exists
    if(!std::filesystem::exists(ENGINE_EXE)) {
        std::cerr << "Engine executable not found: " << ENGINE_EXE << "\n";
        return;
    }

#ifdef _WIN32
    startWindows();
#else
    startUnix();
#endif
}

#ifdef _WIN32
void EngineCLI::startWindows() {
    STARTUPINFO si = {sizeof(STARTUPINFO)};
    PROCESS_INFORMATION pi;

    if(CreateProcess(
            ENGINE_EXE.c_str(),   // Executable name
            NULL,                 // Command line
            NULL,                 // Process security attributes
            NULL,                 // Thread security attributes
            FALSE,                // Inherit handles
            CREATE_NO_WINDOW,     // Creation flags
            NULL,                 // Environment
            NULL,                 // Current directory
            &si,                  // Startup info
            &pi                   // Process info
    )) {
        // Save PID to file
        std::ofstream pidFile(PID_FILE);
        if(pidFile.good()) {
            pidFile << pi.dwProcessId;
            pidFile.close();
            std::cout << "Engine started successfully (PID: " << pi.dwProcessId << ")\n";
        } else {
            std::cerr << "Engine started but failed to save PID file\n";
        }

        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
    } else {
        std::cerr << "Failed to start engine. Error: " << GetLastError() << "\n";
    }
}
#else
void EngineCLI::startUnix() {
    pid_t pid = fork();

    if(pid == -1) {
        std::cerr << "Failed to fork process\n";
        return;
    } else if(pid == 0) {
        // Child process - execute the engine
        execl(ENGINE_EXE.c_str(), ENGINE_EXE.c_str(), (char*)NULL);
        std::cerr << "Failed to execute engine\n";
        exit(1);
    } else {
        // Parent process - save PID
        std::ofstream pidFile(PID_FILE);
        if(pidFile.good()) {
            pidFile << pid;
            pidFile.close();
            std::cout << "Engine started successfully (PID: " << pid << ")\n";
        } else {
            std::cerr << "Engine started but failed to save PID file\n";
        }
    }
}
#endif

void EngineCLI::stop() {
    if(!isRunning()) {
        std::cout << "Engine is not running\n";
        return;
    }

#ifdef _WIN32
    stopWindows();
#else
    stopUnix();
#endif
}

#ifdef _WIN32
void EngineCLI::stopWindows() {
    DWORD pid = getPID();
    HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);

    if(hProcess != NULL) {
        if(TerminateProcess(hProcess, 0)) {
            CloseHandle(hProcess);
            std::remove(PID_FILE.c_str());
            std::cout << "Engine stopped successfully\n";
        } else {
            std::cerr << "Failed to terminate process. Error: " << GetLastError() << "\n";
            CloseHandle(hProcess);
        }
    } else {
        std::cerr << "Failed to open process for termination. Error: " << GetLastError() << "\n";
        // Clean up stale PID file
        std::remove(PID_FILE.c_str());
    }
}
#else
void EngineCLI::stopUnix() {
    pid_t pid = getPID();

    if(kill(pid, SIGTERM) == 0) {
        // Wait a bit for graceful shutdown
        sleep(2);

        // Check if process is still running
        if(kill(pid, 0) == 0) {
            // Force kill if still running
            kill(pid, SIGKILL);
            std::cout << "Engine forcefully stopped\n";
        } else {
            std::cout << "Engine stopped successfully\n";
        }
        std::remove(PID_FILE.c_str());
    } else {
        std::cerr << "Failed to stop engine (process may not exist)\n";
        // Clean up stale PID file
        std::remove(PID_FILE.c_str());
    }
}
#endif

void EngineCLI::restart() {
    std::cout << "Restarting engine...\n";
    stop();
    // Give the process time to fully terminate
#ifdef _WIN32
    Sleep(1000);
#else
    sleep(1);
#endif
    start();
}

void EngineCLI::status() {
    if(isRunning()) {
        std::cout << "Engine is running (PID: " << getPID() << ")\n";
    } else {
        std::cout << "Engine is not running\n";
        // Clean up stale PID file if it exists
        if(std::filesystem::exists(PID_FILE)) {
            std::remove(PID_FILE.c_str());
        }
    }
}

bool EngineCLI::isRunning() {
    auto pid = getPID();
    if(pid == 0) return false;

#ifdef _WIN32
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, static_cast<DWORD>(pid));
    if(hProcess == NULL) return false;

    DWORD exitCode;
    GetExitCodeProcess(hProcess, &exitCode);
    CloseHandle(hProcess);
    return (exitCode == STILL_ACTIVE);
#else
    // Send signal 0 to check if process exists
    return (kill(static_cast<pid_t>(pid), 0) == 0);
#endif
}

long EngineCLI::getPID() {
    std::ifstream pidFile(PID_FILE);
    if(!pidFile.good()) return 0;

    long pid;
    pidFile >> pid;
    pidFile.close();

    return pid;
}

void EngineCLI::showHelp() {
    std::cout << "Engine Control CLI\n"
              << "Usage:\n"
              << "  engine-cli start    - Start the engine\n"
              << "  engine-cli stop     - Stop the engine\n"
              << "  engine-cli restart  - Restart the engine\n"
              << "  engine-cli status   - Show engine status\n";
}