//
// Created by smart on 5/24/2025.
//

#ifndef ENGINE_CVDATA_H
#define ENGINE_CVDATA_H
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include "CVSectionExtractor.h"

class CVData {
    std::map<std::string,int> experience;
    std::string education;
    std::vector<std::string> skills;
    std::string name;
    std::string surname;
    std::string about;
    std::string email;
    std::string linkedin;
    std::string github;

public:
    CVData() = default;
    CVData( std::string str);
    std::map<std::string,int> getXP();
    std::string getEdu();
    std::vector<std::string> getSkills();
    std::string getName();
    std::string getSurname();
    std::string getAbout ();
    std::string getEmail();
    std::string getLinkedIn();
    std::string getGitHub();
    void addExperience(const std::string& place, int months);


};


#endif //ENGINE_CVDATA_H
