cmake_minimum_required(VERSION 3.30)
project(Engine)

set(CMAKE_CXX_STANDARD 20)

add_executable(Engine main.cpp
        main.cpp
        CVData.cpp
        CVData.h
        CVInterpreter.cpp
        CVInterpreter.h
        CVSectionExtractor.cpp
        CVSectionExtractor.h
        ExperienceInterpreter.cpp
        ExperienceInterpreter.h
        EducationInterpreter.cpp
        EducationInterpreter.h
        SkillsInterpreter.cpp
        SkillsInterpreter.h
        PersonalInfoInterpreter.cpp
        PersonalInfoInterpreter.h
)
