#include "PersonalInfoInterpreter.h"
#include <regex>
#include <sstream>
#include <algorithm>
#include <cctype>
#include <vector>

using namespace std;
namespace {

    string trim(const string& s) {
        auto start = s.begin();
        while (start != s.end() && isspace(*start)) {
            start++;
        }
        auto end = s.end();
        while (end != start && isspace(*(end - 1))) {
            end--;
        }
        return string(start, end);
    }
        vector<string> splitLines(const string& str) {
        vector<string> lines;
        size_t pos = 0;
        while (pos < str.size()) {
            size_t end = str.find('\n', pos);
            if (end == string::npos) {
                lines.push_back(str.substr(pos));
                break;
            }
            lines.push_back(str.substr(pos, end - pos));
            pos = end + 1;
        }
        return lines;
    }
}

void PersonalInfoInterpreter::interpret(std::string str,CVData* data) {

}