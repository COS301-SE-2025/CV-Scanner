#include "CVData.h"

CVData::CVData(std::string str){
this = CVSectionExtractor().Extractor(str,this);
};
std::map<std::string,int> CVData::getXP(){

};
std::string CVData::getEdu(){

};
std::vector<std::string> CVData::getSkills(){

};
std::string CVData::getName(){

};
std::string CVData::getSurname(){

};
std::string CVData::getAbout (){

};
std::string CVData::getEmail(){

};
std::string CVData::getLinkedIn(){

};
std::string CVData::getGitHub(){

};
void CVData::addExperience(const std::string& place, int months) {
    experience[place] = months;
}

