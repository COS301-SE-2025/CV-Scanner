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

void PersonalInfoInterpreter::interpret(string str, CVData* data) {
    // Extract email
    regex email_regex(R"(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)");
    smatch email_match;
    if (regex_search(str, email_match, email_regex)) {
        data->email = email_match.str();
    }

    // Extract LinkedIn URL
    regex linkedin_regex(R"((https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?\b)");
    smatch linkedin_match;
    if (regex_search(str, linkedin_match, linkedin_regex)) {
        data->linkedin = linkedin_match.str();
    }

    // Extract GitHub URL
    regex github_regex(R"((https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/?\b)");
    smatch github_match;
    if (regex_search(str, github_match, github_regex)) {
        data->github = github_match.str();
    }

    vector<string> lines = splitLines(str);

    // Extract name and surname
    regex name_regex(R"(^[A-Z][a-zA-Z'-]+(\s+[A-Z][a-zA-Z'-]+)*$)");
    for (const auto& line : lines) {
        string trimmedLine = trim(line);
        if (trimmedLine.empty()) continue;

        // Check segments split by common delimiters
        vector<string> segments;
        size_t start_pos = 0;
        while (start_pos < trimmedLine.size()) {
            size_t delim_pos = trimmedLine.find_first_of("|,-", start_pos);
            if (delim_pos == string::npos) {
                segments.push_back(trimmedLine.substr(start_pos));
                break;
            }
            segments.push_back(trimmedLine.substr(start_pos, delim_pos - start_pos));
            start_pos = delim_pos + 1;
        }

        for (const string& segment : segments) {
            string seg_trimmed = trim(segment);
            if (seg_trimmed.empty()) continue;

            if (regex_match(seg_trimmed, name_regex)) {
                istringstream iss(seg_trimmed);
                vector<string> parts;
                string part;
                while (iss >> part) {
                    parts.push_back(part);
                }
                if (!parts.empty()) {
                    data->name = parts[0];
                    data->surname = "";
                    for (size_t i = 1; i < parts.size(); ++i) {
                        if (!data->surname.empty()) data->surname += " ";
                        data->surname += parts[i];
                    }
                    goto name_found;
                }
            }
        }
    }