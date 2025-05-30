#ifndef ENGINE_CLI_H
#define ENGINE_CLI_H

#include <string>

#ifdef _WIN32
    #include <windows.h>
    #include <tlhelp32.h>
#else
    #include <sys/types.h>
    #include <signal.h>
    #include <unistd.h>
    #include <sys/wait.h>
#endif

class EngineCLI {
public:
    EngineCLI();

    void executeCommand(int argc, char* argv[]);

private:
    std::string ENGINE_EXE;
    std::string PID_FILE;

    void start();
    void stop();
    void status();
    bool isRunning();
#ifdef _WIN32
    DWORD getPID();
#else
    pid_t getPID();
#endif
    void showHelp();
};

#endif // ENGINE_CLI_H