#ifndef ENGINE_PERSONALINFOINTERPRETER_H
#define ENGINE_PERSONALINFOINTERPRETER_H

#include "CVInterpreter.h"

class PersonalInfoInterpreter: public CVInterpreter {
    void interperet(CVData data) override;
};

#endif //ENGINE_PERSONALINFOINTERPRETER_H
