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

void startengine(int argc, char* argv[])
{
    if(argc > 1) {
        // CLI Mode
        EngineCLI cli;
        cli.executeCommand(argc, argv);
    } else {
        // Direct execution mode (for debugging)
        Engine& engine = Engine::getInstance(8080);
        engine.start();
    }
}

int main(int argc, char* argv[]) {

    //startengine(argc,  argv);

    std::ifstream file("../cv1.txt");
    if (!file) {
        std::cerr << "Could not open the file.\n";
        return 1;
    }

    std::stringstream buffer;
    buffer << file.rdbuf();

    std::string cv = buffer.str();

    std::cout << "File content:\n" << cv << std::endl;
    std::cout << "test1"<<std::endl;
    CVData* data = new CVData(cv);
    data->display();

    CVSectionExtractor extractor;
    extractor.Extractor(cv,data);

    SkillsInterpreter* skillsInterpreter = new SkillsInterpreter();
    skillsInterpreter->interpret(cv,data);
    EducationInterpreter* educationInterpreter = new EducationInterpreter();
    ExperienceInterpreter* experienceInterpreter = new ExperienceInterpreter();
    experienceInterpreter->interpret(cv,data);
    PersonalInfoInterpreter* personalInfoInterpreter = new PersonalInfoInterpreter();
    personalInfoInterpreter->interpret(cv,data);

    data->display();

    CVData* newdata = new CVData();

    newdata->addExperience( "Telkom", 60);
    newdata->addExperience( "amazon", 24);
    newdata->setEdu("BSC IKS");
    newdata->addSkill("C++");
    newdata->addSkill("python");
    newdata->setName("Ronan");
    newdata->setSurname("Smart");
    newdata->setAbout("enjoys coding in C++");
    newdata->setEmail("u23528568@tuks.co.za");
    newdata->setLinkedIn("Randomlink.com");
    newdata->setGitHub("githublink.com");

    std::cout
    <<"edu: "
    <<newdata->getEdu() <<std::endl
    <<"name: "
    <<newdata->getName()<<std::endl
    <<"Surname: "
    <<newdata->getSurname()<<std::endl
    <<"About: "
    <<newdata->getAbout ()<<std::endl
    <<"Email: "
    <<newdata->getEmail()<<std::endl
    <<"LinkedIn: "
    <<newdata->getLinkedIn()<<std::endl
    <<"GitHub: "
    <<newdata->getGitHub()<<std::endl;

    newdata->display();

    delete skillsInterpreter;
    delete educationInterpreter;
    delete experienceInterpreter;
    delete personalInfoInterpreter;

    skillsInterpreter = nullptr;
    educationInterpreter = nullptr;
    experienceInterpreter = nullptr;
    personalInfoInterpreter = nullptr;

    delete data;
    delete newdata;

    return 0;
}
