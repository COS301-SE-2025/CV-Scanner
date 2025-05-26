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

    // Helper function to parse date strings
    std::pair<int, int> parseDate(const std::string& dateStr) {
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

} // namespace

void ExperienceInterpreter::interpret(std::string str, CVData* data) {
    try {
        // Look for experience section first
        // Use [\s\S] instead of . to match any character including newlines
        std::regex experience_section_regex(R"(Professional\s+Experience[\s\S]*?(?=\n[A-Z][^a-z]*\n|\n\n|\Z))", std::regex_constants::icase);
        std::smatch section_match;

        std::string experience_text = str;
        if (std::regex_search(str, section_match, experience_section_regex)) {
            experience_text = section_match[0].str();
        }

        // Pattern to match: Job Title | Company | Year - Year
        std::regex job_pattern(
            R"(([^|\n]+)\s*\|\s*([^|\n]+)\s*\|\s*(\d{4})\s*[-–]\s*(\d{4}|Present|Current))",
            std::regex_constants::icase
        );

        std::sregex_iterator it(experience_text.begin(), experience_text.end(), job_pattern);
        std::sregex_iterator end_it;

        while(it != end_it) {
            std::smatch match = *it;
            if (match.size() >= 5) {
                std::string jobTitle = match[1].str();
                std::string company = match[2].str();
                std::string startYear = match[3].str();
                std::string endYear = match[4].str();

                // Clean up the extracted strings
                jobTitle = cleanPositionName(jobTitle);
                company = cleanPositionName(company);

                // Calculate duration
                auto [currentMonth, currentYear] = getCurrentDate();
                int startYearInt = std::stoi(startYear);
                int endYearInt = currentYear;

                if (endYear != "Present" && endYear != "Current") {
                    endYearInt = std::stoi(endYear);
                }

                int duration = (endYearInt - startYearInt) * 12; // Convert to months

                if (duration > 0 && !company.empty()) {
                    data->addExperience(company + " (" + jobTitle + ")", duration);
                    std::cout << "Found experience: " << jobTitle << " at " << company
                              << " (" << startYear << " - " << endYear << ", " << duration << " months)" << std::endl;
                }
            }
            ++it;
        }

        // Fallback: try simpler year-only pattern
        if (it == end_it) {
            std::regex simple_year_pattern(R"((\d{4})\s*[-–]\s*(\d{4}|Present|Current))", std::regex_constants::icase);
            std::sregex_iterator simple_it(experience_text.begin(), experience_text.end(), simple_year_pattern);

            while(simple_it != end_it) {
                std::smatch match = *simple_it;
                if (match.size() >= 3) {
                    std::string startYear = match[1].str();
                    std::string endYear = match[2].str();

                    auto [currentMonth, currentYear] = getCurrentDate();
                    int startYearInt = std::stoi(startYear);
                    int endYearInt = currentYear;

                    if (endYear != "Present" && endYear != "Current") {
                        endYearInt = std::stoi(endYear);
                    }

                    int duration = (endYearInt - startYearInt) * 12;

                    if (duration > 0) {
                        // Try to find company name around this date
                        size_t pos = match.position();
                        std::string context = experience_text.substr(std::max(0, (int)pos - 100), 200);

                        data->addExperience("Unknown Company", duration);
                        std::cout << "Found experience: " << startYear << " - " << endYear
                                  << " (" << duration << " months)" << std::endl;
                    }
                }
                ++simple_it;
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