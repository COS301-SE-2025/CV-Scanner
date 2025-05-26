//
// Created by smart on 5/24/2025.
//

#ifndef ENGINE_EXPERIENCEINTERPRETER_H
#define ENGINE_EXPERIENCEINTERPRETER_H

#include "CVInterpreter.h"

class ExperienceInterpreter: public CVInterpreter {
public:
    void interpret(std::string str, CVData* data) override;
};


#endif //ENGINE_EXPERIENCEINTERPRETER_H
