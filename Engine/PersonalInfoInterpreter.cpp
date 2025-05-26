#include "PersonalInfoInterpreter.h"
#include <regex>
#include <sstream>
#include <algorithm>
#include <cctype>
#include <vector>
#include <iostream>

using namespace std;

namespace {
    string trim(const string& s) {
        if (s.empty()) return s;
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
    try {
        // Extract email
        regex email_regex(R"(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)");
        smatch email_match;
        if (regex_search(str, email_match, email_regex)) {
            data->setEmail(email_match.str());
        }

        // Extract LinkedIn URL
        regex linkedin_regex(R"(linkedin\.com\/in\/[a-zA-Z0-9-]+)");
        smatch linkedin_match;
        if (regex_search(str, linkedin_match, linkedin_regex)) {
            data->setLinkedIn(linkedin_match.str());
        }

        // Extract GitHub URL
        regex github_regex(R"(github\.com\/[a-zA-Z0-9-]+)");
        smatch github_match;
        if (regex_search(str, github_match, github_regex)) {
            data->setGitHub(github_match.str());
        }

        vector<string> lines = splitLines(str);
        bool name_found = false;

        // Extract name from the first meaningful line (not title/header)
        for (const auto& line : lines) {
            string trimmed_line = trim(line);
            if (trimmed_line.empty()) continue;

            // Skip common CV headers/titles
            string lower_line = trimmed_line;
            transform(lower_line.begin(), lower_line.end(), lower_line.begin(), ::tolower);

            if (lower_line.find("cv #") == 0 ||
                lower_line.find("resume") != string::npos ||
                lower_line.find("curriculum vitae") != string::npos ||
                lower_line.find("software developer") != string::npos ||
                lower_line.find("engineer") != string::npos ||
                lower_line.find("manager") != string::npos ||
                lower_line.find("analyst") != string::npos) {
                continue;
            }

            // Look for name pattern: two or more capitalized words
            regex name_regex(R"(^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)$)");
            smatch name_match;
            if (regex_match(trimmed_line, name_match, name_regex)) {
                istringstream iss(trimmed_line);
                vector<string> parts;
                string part;
                while (iss >> part) {
                    parts.push_back(part);
                }
                if (parts.size() >= 2) {
                    data->setName(parts[0]);
                    string surname;
                    for (size_t i = 1; i < parts.size(); ++i) {
                        if (!surname.empty()) surname += " ";
                        surname += parts[i];
                    }
                    data->setSurname(surname);
                    name_found = true;
                    break;
                }
            }
        }

        // Extract professional summary/about section
        vector<string> about_headers = {"professional summary", "summary", "about", "profile", "objective"};
        vector<string> section_headers = {"education", "experience", "skills", "projects", "work", "employment"};
        bool in_about_section = false;
        string about_content;

        for (const auto& line : lines) {
            string trimmed_line = trim(line);
            if (trimmed_line.empty()) continue;

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
                    if (!about_content.empty()) about_content += " ";
                    about_content += trimmed_line;
                }
            }
        }

        data->setAbout(about_content);
    }
    catch (const regex_error& e) {
        cerr << "Personal Info Regex error: " << e.what() << endl;
        cerr << "Code: " << e.code() << endl;
    }
}