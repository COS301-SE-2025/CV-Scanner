cmake_minimum_required(VERSION 3.25)
project(Engine)

set(CMAKE_CXX_STANDARD 20)

add_executable(Engine
        Engine.cpp
        Engine.h
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
        EngineCLI.cpp
        EngineCLI.h
        UnifiedMain.cpp
)
if(WIN32)
    target_link_libraries(Engine PRIVATE ws2_32)
endif()
