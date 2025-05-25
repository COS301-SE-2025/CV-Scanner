#include "ExperienceInterpreter.h"
#include <regex>
#include <sstream>
#include <map>
#include <cctype>
#include <algorithm>
#include <ctime>

namespace {

int parseMonth(const std::string& str) {
    static std::map<std::string, int> months = {
        {"jan", 1}, {"january", 1}, {"1", 1}, {"01", 1},
        {"feb", 2}, {"february", 2}, {"2", 2}, {"02", 2},
        {"mar", 3}, {"march", 3}, {"3", 3}, {"03", 3},
        {"apr", 4}, {"april", 4}, {"4", 4}, {"04", 4},
        {"may", 5}, {"5", 5}, {"05", 5},
        {"jun", 6}, {"june", 6}, {"6", 6}, {"06", 6},
        {"jul", 7}, {"july", 7}, {"7", 7}, {"07", 7},
        {"aug", 8}, {"august", 8}, {"8", 8}, {"08", 8},
        {"sep", 9}, {"sept", 9}, {"september", 9}, {"9", 9}, {"09", 9},
        {"oct", 10}, {"october", 10}, {"10", 10},
        {"nov", 11}, {"november", 11}, {"11", 11},
        {"dec", 12}, {"december", 12}, {"12", 12}
    };

    std::string lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    if (months.count(lower)) return months[lower];
    return -1;
}

std::pair<int, int> getCurrentDate() {
    std::time_t t = std::time(nullptr);
    std::tm* now = std::localtime(&t);
    return {now->tm_mon + 1, now->tm_year + 1900};
}

int calculateDuration(int startMonth, int startYear, int endMonth, int endYear) {
    if (startYear > endYear) return 0;
    if (startYear == endYear && startMonth > endMonth) return 0;
    return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

std::string cleanPositionName(std::string str) {
    // Remove common special characters except allowed ones
    str.erase(std::remove_if(str.begin(), str.end(), [](char c) {
        return std::ispunct(c) && c != '@' && c != '&' && c != '+';
    }), str.end());

    // Trim whitespace
    size_t start = str.find_first_not_of(" \t");
    size_t end = str.find_last_not_of(" \t");
    if (start == std::string::npos) return "";

    str = str.substr(start, end - start + 1);

    // Remove leading/trailing dashes
    if (!str.empty() && (str.front() == '-' || str.front() == '–')) str.erase(0, 1);
    if (!str.empty() && (str.back() == '-' || str.back() == '–')) str.pop_back();

    return str;
}

} // namespace

void ExperienceInterpreter::interpret(std::string str, CVData* data) {
    std::regex date_range_regex(
        R"((?:\(?\b()"
        R"((Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})"
        R"([\/\-\.]? ?(?:\d{4}|\d{2})?)()|)"
        R"((\d{4}|\d{2})[\/\-\. ]?"
        R"((Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}))"
        R"()\b\)?)"
        R"(\s*(?:-|–|to|until|–)\s*)"
        R"((?:\(?\b()"
        R"((Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2})"
        R"([\/\-\.]? ?(?:\d{4}|\d{2})?)()|)"
        R"((\d{4}|\d{2})[\/\-\. ]?"
        R"((Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}))"
        R"()\b\)?|Present|present|Current|current))"
    );

    std::sregex_iterator it(str.begin(), str.end(), date_range_regex);
    std::sregex_iterator end_it;

    while(it != end_it) {
        std::smatch match = *it;
        std::string start_month_str, start_year_str;
        std::string end_month_str, end_year_str;

        // Handle different date formats
        if(!match[1].str().empty()) {
            start_month_str = match[2];
            start_year_str = match[3].str().empty() ? match[4] : match[3];
        } else {
            start_month_str = match[6];
            start_year_str = match[5];
        }

        // Parse end date
        if(match[7].str().empty()) {
            end_month_str = match[9].str().empty() ? match[10] : match[9];
            end_year_str = match[8].str().empty() ? match[11] : match[8];
        } else {
            end_month_str = match[7];
            end_year_str = match[7];
        }

        // Handle present dates
        auto [current_month, current_year] = getCurrentDate();
        bool is_present = false;
        if(match[7].str().empty() && (match[12] == "Present" || match[12] == "present" ||
                                     match[12] == "Current" || match[12] == "current")) {
            end_month_str = std::to_string(current_month);
            end_year_str = std::to_string(current_year);
            is_present = true;
        }

        // Parse numerical values
        int start_month = parseMonth(start_month_str);
        int start_year = start_year_str.length() == 2 ? 2000 + std::stoi(start_year_str) : std::stoi(start_year_str);
        int end_month = parseMonth(end_month_str);
        int end_year = end_year_str.length() == 2 ? 2000 + std::stoi(end_year_str) : std::stoi(end_year_str);

        if(start_month == -1 || end_month == -1) {
            ++it;
            continue;
        }

        // Calculate duration
        int duration = calculateDuration(start_month, start_year, end_month, end_year);
        if(duration <= 0) {
            ++it;
            continue;
        }

        // Extract position/company
        size_t pos = match.position() + match.length();
        std::string context = str.substr(0, match.position());
        std::string after = str.substr(pos);

        std::string company;
        if(!after.empty()) {
            size_t end_pos = after.find_first_of("\n•-–");
            company = after.substr(0, end_pos);
        } else if(!context.empty()) {
            size_t start_pos = context.find_last_of("\n•-–");
            company = context.substr(start_pos + 1);
        }

        company = cleanPositionName(company);
        if(!company.empty()) {
            data->addExperience(company, duration);
        }

        ++it;
    }
}