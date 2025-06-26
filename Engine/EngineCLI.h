// EngineCLI.h
#ifndef ENGINE_CLI_H
#define ENGINE_CLI_H

#include <string>

#ifdef _WIN32
#include <windows.h>
#else
#include <sys/types.h>
#endif

class EngineCLI {
private:
    std::string ENGINE_EXE;
    std::string PID_FILE;

    void start();
    void stop();
    void restart();
    void status();
    bool isRunning();
    long getPID();
    void showHelp();

#ifdef _WIN32
    void startWindows();
    void stopWindows();
#else
    void startUnix();
    void stopUnix();
#endif

public:
    EngineCLI();
    void executeCommand(int argc, char* argv[]);
};

#endif // ENGINE_CLI_H