//
// Created by smart on 5/24/2025.
//

#ifndef ENGINE_EDUCATIONINTERPRETER_H
#define ENGINE_EDUCATIONINTERPRETER_H

#include "CVInterpreter.h"

class EducationInterpreter: public CVInterpreter {
    void interpret(std::string str,CVData* data) override;
};


#endif //ENGINE_EDUCATIONINTERPRETER_H
