#include "SkillsInterpreter.h"
#include <regex>
#include <vector>

void SkillsInterpreter::interpret(const std::string& str, CVData* data) {
    std::vector<std::string> skillList = {
        "Python", "Java", "C++", "C#", "JavaScript", "TypeScript",
        "React", "Angular", "SQL", "HTML", "CSS", "Node.js", "Docker",
        "Kubernetes", "AWS", "Azure", "Git", "Linux", "R", "Go", "Rust"
    };

    for (const std::string& skill : skillList) {
        std::regex pattern("\\b" + skill + "\\b", std::regex_constants::icase);
        if (std::regex_search(str, pattern)) {
            data->addSkill(skill);  // assumes a method exists in CVData
        }
    }
}
