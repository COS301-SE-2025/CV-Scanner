//
// Created by smart on 5/24/2025.
//

#ifndef ENGINE_SKILLSINTERPRETER_H
#define ENGINE_SKILLSINTERPRETER_H

#include "CVInterpreter.h"

class SkillsInterpreter: public CVInterpreter{
    void interpret(std::string str,CVData* data) override;
};


#endif //ENGINE_SKILLSINTERPRETER_H
