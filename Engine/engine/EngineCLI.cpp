#include "EngineCLI.h"
#include <iostream>
#include <fstream>

#ifdef _WIN32
    #include <tlhelp32.h>
#else
    #include <sys/types.h>
    #include <signal.h>
    #include <unistd.h>
    #include <sys/wait.h>
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

#ifdef _WIN32
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
#else
    pid_t pid = fork();
    
    if (pid == 0) {
        // Child process
        execl(ENGINE_EXE.c_str(), ENGINE_EXE.c_str(), (char*)NULL);
        // If execl returns, there was an error
        std::cerr << "Failed to start engine\n";
        exit(1);
    } else if (pid > 0) {
        // Parent process
        std::ofstream pidFile(PID_FILE);
        pidFile << pid;
        pidFile.close();
        
        std::cout << "Engine started successfully (PID: " << pid << ")\n";
    } else {
        std::cerr << "Failed to fork process\n";
    }
#endif
}

void EngineCLI::stop() {
    if(!isRunning()) {
        std::cout << "Engine is not running\n";
        return;
    }

#ifdef _WIN32
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
#else
    pid_t pid = getPID();
    if (kill(pid, SIGTERM) == 0) {
        remove(PID_FILE.c_str());
        std::cout << "Engine stopped successfully\n";
    } else {
        std::cerr << "Failed to stop engine\n";
    }
#endif
}

void EngineCLI::status() {
    if(isRunning()) {
        std::cout << "Engine is running (PID: " << getPID() << ")\n";
    } else {
        std::cout << "Engine is not running\n";
    }
}

bool EngineCLI::isRunning() {
#ifdef _WIN32
    DWORD pid = getPID();
    if(pid == 0) return false;

    HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, pid);
    if(hProcess == NULL) return false;

    DWORD exitCode;
    GetExitCodeProcess(hProcess, &exitCode);
    CloseHandle(hProcess);

    return (exitCode == STILL_ACTIVE);
#else
    pid_t pid = getPID();
    if(pid == 0) return false;
    
    // Check if process exists by sending signal 0
    return (kill(pid, 0) == 0);
#endif
}

#ifdef _WIN32
DWORD EngineCLI::getPID() {
    std::ifstream pidFile(PID_FILE);
    if(!pidFile.good()) return 0;

    DWORD pid;
    pidFile >> pid;
    pidFile.close();

    return pid;
}
#else
pid_t EngineCLI::getPID() {
    std::ifstream pidFile(PID_FILE);
    if(!pidFile.good()) return 0;

    pid_t pid;
    pidFile >> pid;
    pidFile.close();

    return pid;
}
#endif

void EngineCLI::showHelp() {
    std::cout << "Engine Control CLI\n"
              << "Usage:\n"
              << "  engine-cli start    - Start the engine\n"
              << "  engine-cli stop     - Stop the engine\n"
              << "  engine-cli status   - Show engine status\n";
}