// EngineCLI.h
#ifndef ENGINE_CLI_H
#define ENGINE_CLI_H

#include <string>
#include <windows.h>

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
    DWORD getPID();
    void showHelp();
};

#endif // ENGINE_CLI_H