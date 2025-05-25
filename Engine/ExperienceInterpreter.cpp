#include "EducationInterpreter.h"
#include <regex>

void EducationInterpreter::interpret(std::string str,CVData* data) {
    std::regex pattern("(BSc|MSc|PhD|Bachelor|Master|Doctor)", std::regex_constants::icase);
    std::smatch match;

    if (std::regex_search(str, match, pattern)) {
        data->setEdu(match.str());  // Call a setter to store education
    }
}
