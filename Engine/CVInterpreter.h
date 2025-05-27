//
// Created by smart on 5/24/2025.
//

#ifndef ENGINE_CVINTERPRETER_H
#define ENGINE_CVINTERPRETER_H
#include <iostream>
#include "CVData.h"

class CVInterpreter {
public:
    virtual void interpret(std::string str,CVData* data) =0;
    virtual ~CVInterpreter() = default;
};


#endif //ENGINE_CVINTERPRETER_H
