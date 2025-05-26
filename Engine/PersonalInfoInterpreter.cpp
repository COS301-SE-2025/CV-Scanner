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
        data->setEmail(email_match.str());  // Using setter
    }

    // Extract LinkedIn URL
    regex linkedin_regex(R"((https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?\b)");
    smatch linkedin_match;
    if (regex_search(str, linkedin_match, linkedin_regex)) {
        data->setLinkedIn(linkedin_match.str());  // Using setter
    }

    // Extract GitHub URL
    regex github_regex(R"((https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/?\b)");
    smatch github_match;
    if (regex_search(str, github_match, github_regex)) {
        data->setGitHub(github_match.str());  // Using setter
    }

    vector<string> lines = splitLines(str);

    // Extract name and surname
    regex name_regex(R"(^[A-Z][a-zA-Z'-]+(\s+[A-Z][a-zA-Z'-]+)*$)");
    for (const auto& line : lines) {
        string trimmedLine = trim(line);
        if (trimmedLine.empty()) continue;

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
                    // Build name and surname locally first
                    string name = parts[0];
                    string surname;
                    for (size_t i = 1; i < parts.size(); ++i) {
                        if (!surname.empty()) surname += " ";
                        surname += parts[i];
                    }
                    data->setName(name);    // Using setter
                    data->setSurname(surname);  // Using setter
                    goto name_found;
                }
            }
        }
    }
    name_found:

    // Extract about section
    vector<string> about_headers = {"about", "summary", "profile", "objective", "personal statement"};
    vector<string> section_headers = {"experience", "education", "skills", "projects", "work", "employment"};
    bool in_about_section = false;
    string about_content;

    for (const auto& line : lines) {
        string trimmed_line = trim(line);
        string lower_line = trimmed_line;
        transform(lower_line.begin(), lower_line.end(), lower_line.begin(), ::tolower);

        if (!in_about_section) {
            for (const string& header : about_headers) {
                if (lower_line.find(header) == 0) {
                    in_about_section = true;
                    break;
                }
            }
        } else {
            if (trimmed_line.empty()) {
                in_about_section = false;
                continue;
            }

            bool is_new_section = false;
            for (const string& sec_header : section_headers) {
                if (lower_line.find(sec_header) == 0) {
                    is_new_section = true;
                    break;
                }
            }

            if (is_new_section) {
                in_about_section = false;
            } else {
                about_content += trimmed_line + "\n";
            }
        }
    }

    if (!about_content.empty() && about_content.back() == '\n') {
        about_content.pop_back();
    }
    data->setAbout(about_content);  // Using setter
}