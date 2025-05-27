#include "EducationInterpreter.h"
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

void EducationInterpreter::interpret(string str, CVData* data) {
    vector<string> edu_headers = {"education", "academic background", "degrees",
                                "qualifications", "academic qualifications"};
    vector<string> section_headers = {"technical skills", "professional experience", "experience", "skills", "projects",
                                    "work history", "certifications", "publications"};

    vector<string> lines = splitLines(str);
    bool in_edu_section = false;
    vector<string> edu_entries;
    string current_degree;
    string current_institution;
    string current_date;

    for (const auto& line : lines) {
        string trimmed_line = trim(line);
        if (trimmed_line.empty()) continue;

        // Check section transitions
        if (in_edu_section) {
            if (isSectionHeader(trimmed_line, section_headers)) {
                // Save current entry if we have one
                if (!current_degree.empty() && !current_institution.empty()) {
                    string entry = current_degree + " | " + current_institution;
                    if (!current_date.empty()) {
                        entry += " | " + current_date;
                    }
                    edu_entries.push_back(entry);
                }
                in_edu_section = false;
                break;
            }

            // Process education lines
            try {
                // Check if this looks like a degree line
                regex degree_regex(R"((Master|Bachelor|PhD|Ph\.D|M\.S|B\.S|MBA|B\.A|M\.A).+)", regex_constants::icase);
                if (regex_search(trimmed_line, degree_regex)) {
                    // Save previous entry if we have one
                    if (!current_degree.empty() && !current_institution.empty()) {
                        string entry = current_degree + " | " + current_institution;
                        if (!current_date.empty()) {
                            entry += " | " + current_date;
                        }
                        edu_entries.push_back(entry);
                    }

                    current_degree = trimmed_line;
                    current_institution.clear();
                    current_date.clear();
                }
                // Check if this looks like an institution line
                else if (trimmed_line.find("University") != string::npos ||
                         trimmed_line.find("College") != string::npos ||
                         trimmed_line.find("Institute") != string::npos ||
                         trimmed_line.find("School") != string::npos) {
                    current_institution = trimmed_line;
                }
                // Check if this looks like a graduation date
                else if (trimmed_line.find("Graduated:") != string::npos ||
                         trimmed_line.find("May") != string::npos ||
                         trimmed_line.find("June") != string::npos ||
                         regex_search(trimmed_line, regex(R"(\d{4})"))) {
                    current_date = trimmed_line;
                }
            }
            catch (const regex_error& e) {
                cerr << "Education Regex error: " << e.what() << endl;
            }
        } else {
            if (isSectionHeader(trimmed_line, edu_headers)) {
                in_edu_section = true;
                current_degree.clear();
                current_institution.clear();
                current_date.clear();
            }
        }
    }

    // Save final entry if we have one
    if (!current_degree.empty() && !current_institution.empty()) {
        string entry = current_degree + " | " + current_institution;
        if (!current_date.empty()) {
            entry += " | " + current_date;
        }
        edu_entries.push_back(entry);
    }

    // Set the most recent education (assuming they're in order)
    if (!edu_entries.empty()) {
        data->setEdu(edu_entries[0]); // Take the first one (most recent)
    }
}
