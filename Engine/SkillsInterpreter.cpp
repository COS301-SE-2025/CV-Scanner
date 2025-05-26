#include "SkillsInterpreter.h"
#include <regex>
#include <vector>
#include <algorithm>
#include <iostream>

using namespace std;

namespace {
    string trim(const string& s) {
        if (s.empty()) return s;
        auto start = s.begin();
        while (start != s.end() && isspace(*start)) start++;
        auto end = s.end();
        do { end--; } while (distance(start, end) > 0 && isspace(*end));
        return string(start, end + 1);
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

    bool isSectionHeader(const string& line, const vector<string>& headers) {
        string lowerLine = line;
        transform(lowerLine.begin(), lowerLine.end(), lowerLine.begin(), ::tolower);
        for (const string& header : headers) {
            if (lowerLine.find(header) == 0) return true;
        }
        return false;
    }
}

void SkillsInterpreter::interpret(string str, CVData* data) {
    vector<string> skill_headers = {"technical skills", "skills", "key skills",
                                   "core competencies", "technologies", "expertise"};
    vector<string> section_headers = {"professional experience", "experience", "education", "projects",
                                     "work history", "employment", "certifications"};

    vector<string> lines = splitLines(str);
    bool in_skills_section = false;
    string skills_block;

    for (const auto& line : lines) {
        string trimmed_line = trim(line);
        if (trimmed_line.empty()) continue;

        // Check section transitions
        if (in_skills_section) {
            if (isSectionHeader(trimmed_line, section_headers)) {
                in_skills_section = false;
                break;
            }
            skills_block += trimmed_line + "\n";
        } else {
            if (isSectionHeader(trimmed_line, skill_headers)) {
                in_skills_section = true;
                skills_block.clear();
            }
        }
    }

    // Process collected skills text
    if (!skills_block.empty()) {
        try {
            // First, handle categorized skills (e.g., "Programming Languages: Python, Java")
            regex category_regex(R"(([^:]+):\s*(.+))");
            vector<string> skill_lines = splitLines(skills_block);

            for (const string& line : skill_lines) {
                string trimmed_line = trim(line);
                if (trimmed_line.empty()) continue;

                smatch category_match;
                if (regex_search(trimmed_line, category_match, category_regex)) {
                    string category = trim(category_match[1].str());
                    string skills_text = trim(category_match[2].str());

                    // Split individual skills within the category
                    regex skill_split_regex(R"(\s*[,;]\s*)");
                    sregex_token_iterator iter(skills_text.begin(), skills_text.end(), skill_split_regex, -1);
                    sregex_token_iterator end;

                    while (iter != end) {
                        string skill = trim(*iter);
                        if (!skill.empty()) {
                            data->addSkill(skill);
                        }
                        ++iter;
                    }
                } else {
                    // Handle bullet points or simple lists
                    string clean_line = regex_replace(trimmed_line, regex(R"(^[•\-*\d]+\.?\s*)"), "");
                    if (!clean_line.empty()) {
                        // Split by common delimiters
                        regex split_regex(R"(\s*[,;|]\s*)");
                        sregex_token_iterator iter(clean_line.begin(), clean_line.end(), split_regex, -1);
                        sregex_token_iterator end;

                        while (iter != end) {
                            string skill = trim(*iter);
                            if (!skill.empty()) {
                                data->addSkill(skill);
                            }
                            ++iter;
                        }
                    }
                }
            }
        }
        catch (const regex_error& e) {
            cerr << "Skills Regex error: " << e.what() << endl;
            cerr << "Code: " << e.code() << endl;
        }
    }
}