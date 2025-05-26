#include "CVData.h"
#include "CVSectionExtractor.h"  // Assume this header exists for extraction

CVData::CVData(std::string str) {
    CVSectionExtractor extractor;
    extractor.Extractor(str, *this);  // The extractor uses public setters to populate data
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