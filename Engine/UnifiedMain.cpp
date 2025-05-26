#include "Engine.h"
#include "EngineCLI.h"
#include <windows.h>
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <unistd.h>

#include "CVData.h"
#include "EducationInterpreter.h"
#include "ExperienceInterpreter.h"
#include "PersonalInfoInterpreter.h"
#include "SkillsInterpreter.h"

int main(int argc, char* argv[]) {
    // if(argc > 1) {
    //     // CLI Mode
    //     EngineCLI cli;
    //     cli.executeCommand(argc, argv);
    // } else {
    //     // Direct execution mode (for debugging)
    //     Engine& engine = Engine::getInstance(8080);
    //     engine.start();
    // }
    std::ifstream file("../cv1.txt");  // Open the file
    if (!file) {
        std::cerr << "Could not open the file.\n";
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();  // Read the whole file into the buffer

    std::string cv = buffer.str();  // Convert buffer to string

    std::cout << "File content:\n" << cv << std::endl;
    std::cout << "test1"<<std::endl;
    CVData* data = new CVData(cv);
    data->display();

    // CVSectionExtractor extractor;
    // extractor.Extractor(cv,data);

    // SkillsInterpreter* skillsInterpreter = new SkillsInterpreter();
    // skillsInterpreter->interpret(cv,data);
    // EducationInterpreter* educationInterpreter = new EducationInterpreter();
    // ExperienceInterpreter* experienceInterpreter = new ExperienceInterpreter();
    // experienceInterpreter->interpret(cv,data);
    // PersonalInfoInterpreter* personalInfoInterpreter = new PersonalInfoInterpreter();
    // personalInfoInterpreter->interpret(cv,data);

    // data->display();

    // delete skillsInterpreter;
    // delete educationInterpreter;
    // delete experienceInterpreter;
    // delete personalInfoInterpreter;
    //
    // skillsInterpreter = nullptr;
    // educationInterpreter = nullptr;
    // experienceInterpreter = nullptr;
    // personalInfoInterpreter = nullptr;

    return 0;
}
