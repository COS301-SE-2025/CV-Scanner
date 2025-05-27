#include "CVSectionExtractor.h"

#include "CVInterpreter.h"
#include "EducationInterpreter.h"
#include "ExperienceInterpreter.h"
#include "PersonalInfoInterpreter.h"
#include "SkillsInterpreter.h"

void CVSectionExtractor::Extractor (std::string str,CVData* data){

    CVInterpreter* Sinterpreter = new SkillsInterpreter();
    CVInterpreter* Pinterpreter = new PersonalInfoInterpreter();
    CVInterpreter* Einterpreter = new ExperienceInterpreter();
    CVInterpreter* EDinterpreter = new EducationInterpreter();

    Sinterpreter->interpret(str,data);
    Pinterpreter->interpret(str,data);
    Einterpreter->interpret(str,data);
    EDinterpreter->interpret(str,data);
}
