#include "ExperienceInterpreter.h"
#include <regex>
#include <sstream>
#include <map>
#include <cctype>
#include <algorithm>
#include <ctime>
#include <iostream>

namespace {
    // Helper function to parse month name to number
    int parseMonth(const std::string& monthStr) {
        static const std::map<std::string, int> monthMap = {
            {"jan", 1}, {"january", 1},
            {"feb", 2}, {"february", 2},
            {"mar", 3}, {"march", 3},
            {"apr", 4}, {"april", 4},
            {"may", 5},
            {"jun", 6}, {"june", 6},
            {"jul", 7}, {"july", 7},
            {"aug", 8}, {"august", 8},
            {"sep", 9}, {"september", 9},
            {"oct", 10}, {"october", 10},
            {"nov", 11}, {"november", 11},
            {"dec", 12}, {"december", 12}
        };

        std::string lowerMonth = monthStr;
        std::transform(lowerMonth.begin(), lowerMonth.end(), lowerMonth.begin(), ::tolower);

        auto it = monthMap.find(lowerMonth);
        return (it != monthMap.end()) ? it->second : -1;
    }

    // Helper function to get current date
    std::pair<int, int> getCurrentDate() {
        std::time_t now = std::time(nullptr);
        std::tm* localTime = std::localtime(&now);
        return {localTime->tm_mon + 1, localTime->tm_year + 1900}; // tm_mon is 0-based
    }

    // Helper function to calculate duration in months
    int calculateDuration(int startMonth, int startYear, int endMonth, int endYear) {
        if (startYear > endYear || (startYear == endYear && startMonth > endMonth)) {
            return 0; // Invalid date range
        }
        return (endYear - startYear) * 12 + (endMonth - startMonth);
    }

    // Helper function to clean position/company names
    std::string cleanPositionName(const std::string& name) {
        std::string cleaned = name;

        // Remove leading/trailing whitespace
        cleaned.erase(0, cleaned.find_first_not_of(" \t\n\r"));
        cleaned.erase(cleaned.find_last_not_of(" \t\n\r") + 1);

        // Remove common prefixes and suffixes
        std::vector<std::string> prefixesToRemove = {"at ", "with ", "for ", "in ", "- ", "– ", "• "};
        std::vector<std::string> suffixesToRemove = {" -", " –", " •"};

        for (const auto& prefix : prefixesToRemove) {
            if (cleaned.find(prefix) == 0) {
                cleaned = cleaned.substr(prefix.length());
            }
        }

        for (const auto& suffix : suffixesToRemove) {
            size_t pos = cleaned.rfind(suffix);
            if (pos != std::string::npos && pos == cleaned.length() - suffix.length()) {
                cleaned = cleaned.substr(0, pos);
            }
        }

        // Remove leading/trailing whitespace again
        cleaned.erase(0, cleaned.find_first_not_of(" \t\n\r"));
        cleaned.erase(cleaned.find_last_not_of(" \t\n\r") + 1);

        return cleaned;
    }

    // Helper function to parse date strings - handles "Present" and "Current"
    std::pair<int, int> parseDate(const std::string& dateStr) {
        // Check for present/current first
        std::string lowerDate = dateStr;
        std::transform(lowerDate.begin(), lowerDate.end(), lowerDate.begin(), ::tolower);
        if (lowerDate.find("present") != std::string::npos || lowerDate.find("current") != std::string::npos) {
            auto [currentMonth, currentYear] = getCurrentDate();
            return {currentMonth, currentYear};
        }

        std::regex monthYearRegex(R"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4}))", std::regex::icase);
        std::regex slashRegex(R"((\d{1,2})/(\d{4}))");
        std::regex yearRegex(R"(\d{4})");
        std::smatch match;

        if (std::regex_search(dateStr, match, monthYearRegex)) {
            std::string monthStr = match[0].str();
            std::string yearStr = match[1].str();

            // Extract month name from the full match
            std::regex monthExtract(R"((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)", std::regex::icase);
            std::smatch monthMatch;
            if (std::regex_search(monthStr, monthMatch, monthExtract)) {
                int month = parseMonth(monthMatch[1].str());
                if (month != -1) {
                    return {month, std::stoi(yearStr)};
                }
            }
        }
        else if (std::regex_search(dateStr, match, slashRegex)) {
            return {std::stoi(match[1].str()), std::stoi(match[2].str())};
        }
        else if (std::regex_search(dateStr, match, yearRegex)) {
            return {1, std::stoi(match[0].str())}; // Default to January if only year specified
        }
        return {-1, -1};
    }

    // Helper function to split lines
    std::vector<std::string> splitLines(const std::string& str) {
        std::vector<std::string> lines;
        size_t pos = 0;
        while (pos < str.size()) {
            size_t end = str.find('\n', pos);
            if (end == std::string::npos) {
                lines.push_back(str.substr(pos));
                break;
            }
            lines.push_back(str.substr(pos, end - pos));
            pos = end + 1;
        }
        return lines;
    }

    // Helper function to trim whitespace
    std::string trim(const std::string& s) {
        if (s.empty()) return s;
        auto start = s.begin();
        while (start != s.end() && std::isspace(*start)) {
            start++;
        }
        auto end = s.end();
        while (end != start && std::isspace(*(end - 1))) {
            end--;
        }
        return std::string(start, end);
    }

} // namespace

void ExperienceInterpreter::interpret(std::string str, CVData* data) {
    try {
        std::vector<std::string> lines = splitLines(str);
        bool in_experience_section = false;

        // Find the Professional Experience section
        for (size_t i = 0; i < lines.size(); ++i) {
            std::string trimmed_line = trim(lines[i]);
            if (trimmed_line.empty()) continue;

            std::string lower_line = trimmed_line;
            std::transform(lower_line.begin(), lower_line.end(), lower_line.begin(), ::tolower);

            // Check if we're entering the experience section
            if (lower_line.find("professional experience") == 0 ||
                lower_line.find("work experience") == 0 ||
                lower_line.find("experience") == 0) {
                in_experience_section = true;
                std::cout << "Found experience section at line: " << trimmed_line << std::endl;
                continue;
            }

            // If we're in experience section, look for job entries
            if (in_experience_section) {
                // Check if we've hit a new section
                if (lower_line.find("education") == 0 ||
                    lower_line.find("skills") == 0 ||
                    lower_line.find("projects") == 0 ||
                    lower_line.find("certifications") == 0) {
                    break; // Exit experience section
                }

                // Look for job pattern: Position | Company | Year - Year/Present
                std::regex job_pattern(
                    R"(([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*(\d{4})\s*[-–]\s*(\d{4}|Present|Current))",
                    std::regex::icase
                );

                std::smatch job_match;
                if (std::regex_search(trimmed_line, job_match, job_pattern)) {
                    std::string jobTitle = trim(job_match[1].str());
                    std::string company = trim(job_match[2].str());
                    std::string startYear = job_match[3].str();
                    std::string endYear = job_match[4].str();

                    std::cout << "Found job entry: " << jobTitle << " at " << company
                              << " (" << startYear << " - " << endYear << ")" << std::endl;

                    // Calculate duration
                    auto [currentMonth, currentYear] = getCurrentDate();
                    int startYearInt = std::stoi(startYear);
                    int endYearInt = currentYear;

                    std::string lowerEndYear = endYear;
                    std::transform(lowerEndYear.begin(), lowerEndYear.end(), lowerEndYear.begin(), ::tolower);

                    if (lowerEndYear != "present" && lowerEndYear != "current") {
                        endYearInt = std::stoi(endYear);
                    }

                    int duration = (endYearInt - startYearInt) * 12; // Convert to months
                    if (duration < 0) duration = 0; // Handle invalid ranges

                    if (duration >= 0 && !company.empty()) {
                        std::string experienceEntry = company + " (" + jobTitle + ")";
                        data->addExperience(experienceEntry, duration);
                        std::cout << "Added experience: " << experienceEntry
                                  << " - " << duration << " months" << std::endl;
                    }
                }
            }
        }

        // Fallback: if no structured experience found, try simpler patterns
        if (data->getXP().empty()) {
            std::cout << "No structured experience found, trying fallback patterns..." << std::endl;

            // Look for any year ranges in the text
            std::regex year_range_pattern(R"((\d{4})\s*[-–]\s*(\d{4}|Present|Current))", std::regex::icase);
            std::sregex_iterator it(str.begin(), str.end(), year_range_pattern);
            std::sregex_iterator end_it;

            while (it != end_it) {
                std::smatch match = *it;
                std::string startYear = match[1].str();
                std::string endYear = match[2].str();

                auto [currentMonth, currentYear] = getCurrentDate();
                int startYearInt = std::stoi(startYear);
                int endYearInt = currentYear;

                std::string lowerEndYear = endYear;
                std::transform(lowerEndYear.begin(), lowerEndYear.end(), lowerEndYear.begin(), ::tolower);

                if (lowerEndYear != "present" && lowerEndYear != "current") {
                    endYearInt = std::stoi(endYear);
                }

                int duration = (endYearInt - startYearInt) * 12;
                if (duration > 0) {
                    data->addExperience("Experience " + startYear + "-" + endYear, duration);
                    std::cout << "Added fallback experience: " << startYear << "-" << endYear
                              << " (" << duration << " months)" << std::endl;
                }
                ++it;
            }
        }
    }
    catch(std::regex_error& e) {
        std::cerr << "Experience Regex Error: " << e.what() << " (Code: " << e.code() << ")\n";
    }
    catch(std::exception& e) {
        std::cerr << "Experience Interpreter Error: " << e.what() << "\n";
    }
}