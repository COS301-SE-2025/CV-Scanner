#include "Engine.h"
#include "EngineCLI.h"
#include <windows.h>

int main(int argc, char* argv[]) {
    if(argc > 1) {
        // CLI Mode
        EngineCLI cli;
        cli.executeCommand(argc, argv);
    } else {
        // Direct execution mode (for debugging)
        Engine& engine = Engine::getInstance(8080);
        engine.start();
    }
    return 0;
}