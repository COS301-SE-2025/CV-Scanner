#ifndef ENGINE_CVSECTIONEXTRACTOR_H
#define ENGINE_CVSECTIONEXTRACTOR_H
#include <iostream>
#include <string>
#include <vector>
#include <map>
#include "CVData.h"

class CVSectionExtractor {
public:
    CVData* Extractor(std::string str,CVData* data);
};

#endif //ENGINE_CVSECTIONEXTRACTOR_H
