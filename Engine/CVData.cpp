#include "CVData.h"

#include <regex>

#include "CVSectionExtractor.h"  // Assume this header exists for extraction
#include "EducationInterpreter.h"
#include "ExperienceInterpreter.h"
#include "PersonalInfoInterpreter.h"
#include "SkillsInterpreter.h"

CVData::CVData(std::string str) {

     this->education = "";
     this->name= "";
     this->surname= "";
     this->about= "";
     this->email= "";
     this->linkedin= "";
     this->github= "";

    CVSectionExtractor extractor;
    extractor.Extractor(str,this);
}

// Getters
std::map<std::string, int> CVData::getXP() const {
    return experience;
}

std::string CVData::getEdu() const {
    return education;
}

std::vector<std::string> CVData::getSkills() const {
    return skills;
}

std::string CVData::getName() const {
    return name;
}

std::string CVData::getSurname() const {
    return surname;
}

std::string CVData::getAbout() const {
    return about;
}

std::string CVData::getEmail() const {
    return email;
}

std::string CVData::getLinkedIn() const {
    return this->linkedin;
}

std::string CVData::getGitHub() const {
    return this->github;
}

// Setters
void CVData::addExperience(const std::string& place, int months) {
    experience[place] = months;
}

void CVData::setEdu(const std::string& edu) {
    this->education = edu;
}

void CVData::addSkill(const std::string& skill) {
    skills.push_back(skill);
}

void CVData::setName(const std::string& name) {
    this->name = name;
}

void CVData::setSurname(const std::string& surname) {
    this->surname = surname;
}

void CVData::setAbout(const std::string& about) {
    this->about = about;
}

void CVData::setEmail(const std::string& email) {
    this->email = email;
}

void CVData::setLinkedIn(const std::string& linkedIn) {
    this->linkedin = linkedIn;
}

void CVData::setGitHub(const std::string& gitHub) {
    this->github = gitHub;
}

void CVData::display()
{
    std::cout << "Name: " << name << std::endl
    << "Surname: " << surname << std::endl
    << "Email: " << email << std::endl
    << "LinkedIn: " << linkedin << std::endl
    << "GitHub: " << github << std::endl
    << "About: " << about << std::endl
    << "Education: " << education << std::endl
    << "Skills: " << std::endl;
    for (auto skill : skills) {
        std::cout << skill << std::endl;
    }
    std::cout << "Experience: " << std::endl;
    for (auto exp : experience) {
        std::cout << exp.first << ": " << exp.second <<" months"<< std::endl;
    }
}
