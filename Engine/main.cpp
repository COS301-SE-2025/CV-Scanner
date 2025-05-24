#include <iostream>
#include "Engine.h"

int main() {
    Engine& engine = Engine::getInstance(8080);
    engine.start();
    return 0;
}