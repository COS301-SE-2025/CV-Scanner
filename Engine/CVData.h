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
    std::map<std::string,int> getXP() const;
    std::string getEdu() const;
    std::vector<std::string> getSkills() const;
    std::string getName() const;
    std::string getSurname() const;
    std::string getAbout () const;
    std::string getEmail() const;
    std::string getLinkedIn() const;
    std::string getGitHub() const;
    void addExperience(const std::string& place, int months);
    void setEdu(const std::string& edu);
    void addSkill(const std::string& skill);
    void setName(const std::string& name);
    void setSurname(const std::string& surname);
    void setAbout(const std::string& about);
    void setEmail(const std::string& email);
    void setLinkedIn(const std::string& linkedIn);
    void setGitHub(const std::string& gitHub);

};


#endif //ENGINE_CVDATA_H
