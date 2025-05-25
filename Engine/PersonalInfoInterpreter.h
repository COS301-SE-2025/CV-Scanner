#ifndef ENGINE_PERSONALINFOINTERPRETER_H
#define ENGINE_PERSONALINFOINTERPRETER_H

#include "CVInterpreter.h"

class PersonalInfoInterpreter: public CVInterpreter {
    void interpret(std::string str,CVData* data) override;
};

#endif //ENGINE_PERSONALINFOINTERPRETER_H
