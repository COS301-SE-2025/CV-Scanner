#include "ExperienceInterpreter.h"
#include <regex>
#include <sstream>
#include <map>
#include <cctype>
#include <algorithm>

// Parse month abbreviation or number to int
int parseMonth(const std::string& str) {
    static std::map<std::string, int> months = {
        {"jan", 1}, {"january", 1},
        {"feb", 2}, {"february", 2},
        {"mar", 3}, {"march", 3},
        {"apr", 4}, {"april", 4},
        {"may", 5},
        {"jun", 6}, {"june", 6},
        {"jul", 7}, {"july", 7},
        {"aug", 8}, {"august", 8},
        {"sep", 9}, {"sept", 9}, {"september", 9},
        {"oct", 10}, {"october", 10},
        {"nov", 11}, {"november", 11},
        {"dec", 12}, {"december", 12}
    };

    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    if (months.count(lower)) return months[lower];
    try { return std::stoi(lower); } catch (...) { return -1; }
}

// Calculate months between two dates
int getMonthsBetween(int startMonth, int startYear, int endMonth, int endYear) {
    return (endYear - startYear) * 12 + (endMonth - startMonth);
}

// Try to extract experience from a line
void ExperienceInterpreter::interpret(std::string str, CVData* data) {
    std::stringstream ss(str);
    std::string line;

    std::regex dateRegex(R"((\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})[ /.-]?(\d{4})\b)\s*(?:-|to)?\s*(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})?[ /.-]?(\d{4}|present|Present)?)?)");

    while (std::getline(ss, line)) {
        std::smatch match;
        if (std::regex_search(line, match, dateRegex)) {
            std::string startMonthStr = match[1];
            std::string startYearStr = match[2];
            std::string endMonthStr = match[3].str().empty() ? startMonthStr : match[3];
            std::string endYearStr = match[4].str().empty() ? startYearStr : match[4];

            int startMonth = parseMonth(startMonthStr);
            int startYear = std::stoi(startYearStr);
            int endMonth = (endYearStr == "Present" || endYearStr == "present") ? 5 : parseMonth(endMonthStr);
            int endYear = (endYearStr == "Present" || endYearStr == "present") ? 2025 : std::stoi(endYearStr);

            int durationMonths = getMonthsBetween(startMonth, startYear, endMonth, endYear);

            // Try to extract the company/position line by stripping the date
            std::string cleanedLine = std::regex_replace(line, dateRegex, "");
            cleanedLine.erase(std::remove_if(cleanedLine.begin(), cleanedLine.end(), [](unsigned char c) {
                return std::ispunct(c) && c != '@';
            }), cleanedLine.end());

            std::string place = cleanedLine;
            place.erase(std::remove_if(place.begin(), place.end(), ::isdigit), place.end());
            std::string::size_type atPos = place.find('@');
            if (atPos != std::string::npos) {
                place = place.substr(atPos + 1);
            }

            // Trim
            place.erase(0, place.find_first_not_of(" \t"));
            place.erase(place.find_last_not_of(" \t") + 1);

            if (!place.empty()) {
                data->addExperience(place, durationMonths);
            }
        }
    }
}
