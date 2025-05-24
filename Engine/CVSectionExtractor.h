#ifndef ENGINE_CVSECTIONEXTRACTOR_H
#define ENGINE_CVSECTIONEXTRACTOR_H
#include <iostream>
#include <string>
#include <vector>
#include <map>

class CVSectionExtractor {
std::string cv;

public:
    CVSectionExtractor(std::string cv);
    std::map<std::string,int> getXP();
    std::string getEdu();
    std::vector<std::string> getSkills();
    std::string getName();
    std::string getSurname();
    std::string getAbout ();
    std::string getEmail();
    std::string getLinkedIn();
    std::string getGitHub();
};

#endif //ENGINE_CVSECTIONEXTRACTOR_H
