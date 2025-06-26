# 📄 CV-Scanner

[![Build Status](https://github.com/COS301-SE-2025/CV-Scanner/actions/workflows/build.yml/badge.svg)](https://github.com/COS301-SE-2025/CV-Scanner/actions)
[![Coverage Status](https://coveralls.io/repos/github/COS301-SE-2025/CV-Scanner/badge.svg?branch=main)](https://coveralls.io/github/COS301-SE-2025/CV-Scanner?branch=main)
![Requirements Status](https://img.shields.io/badge/requirements-satisfied-brightgreen)
![GitHub Issues](https://img.shields.io/github/issues/COS301-SE-2025/CV-Scanner)
![Closed Issues](https://img.shields.io/github/issues-closed/COS301-SE-2025/CV-Scanner)
![Uptime Robot](https://img.shields.io/uptimerobot/status/m789456789-abcdefgh)

---

## 🧠 About the Project

**CV-Scanner** is an AI-powered recruitment platform developed by **Quantum Stack** to revolutionize candidate screening. Leveraging state-of-the-art **Natural Language Processing (NLP)** and AI models, the system intelligently extracts:
- Relevant technologies
- Soft skills and personality traits
- Project suitability indicators

It supports both **PDF and Word** CV formats and automatically summarizes candidate profiles into a secure, centralized database. These summaries are accessible via a **role-based admin portal**, ensuring efficient and secure HR workflows.

---

## 🚀 Technologies Used

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)
![Java Spring](https://img.shields.io/badge/Backend-Java_Spring-6DB33F?logo=spring&logoColor=white)
![C++](https://img.shields.io/badge/Engine-C++-00599C?logo=c%2B%2B&logoColor=white)
![Python](https://img.shields.io/badge/AI-Python-3776AB?logo=python&logoColor=white)

#### 🖼️ Frontend: [React](https://reactjs.org/)
We chose **React** for building the user interface due to its component-based architecture, fast rendering through a virtual DOM, and rich ecosystem of libraries. It enabled us to create a modern, responsive, and highly interactive UI efficiently.

#### ☕ Backend API: [Java Spring Boot](https://spring.io/projects/spring-boot)
**Spring Boot** was used for our backend REST API. It provides robust tools for building secure and scalable server-side applications, with excellent support for data access, service layers, and integration with enterprise systems. It also aligned well with our hosting and deployment constraints (e.g., Azure App Services).

#### ⚙️ Engine Component: C++
We implemented the core processing engine in **C++** to leverage its performance benefits and low-level memory control. This was critical for compute-heavy tasks where speed and efficiency were essential.

#### 🧠 AI Service: Python
**Python** was selected for our AI/CV module due to its extensive machine learning and natural language processing libraries (like spaCy, scikit-learn, and OpenCV). It allowed us to rapidly prototype and integrate intelligent functionality into our system.

---
## 👨‍💻 Team: Quantum Stack

### Abdullah Pochee  
Computer Science & Data Science student at the University of Pretoria. Passionate about AI, software engineering, and impactful tech solutions.  
🔗 [LinkedIn](https://www.linkedin.com/in/abdullah-pochee-73a916175/)

### Talhah Karodia  
Final-year Computer Science student with a strong passion for **artificial intelligence**, **cybersecurity**, and **software engineering**. Proficient in both theory and practical development, especially in collaborative and innovative environments.  
🔗 [LinkedIn](https://www.linkedin.com/in/talhah-karodia-752657246/)

### Ronan Smart
Final-year Computer Science student driven by a deep interest in software development and problem solving. Skilled in applying both theoretical knowledge and hands-on experience, especially in dynamic, team-based projects that push the boundaries of innovation.
🔗 [LinkedIn](https://www.linkedin.com/in/ronan-smart-361619353/)

### Marcelo Parsotam
Third Year Information and Knowledge Systems student at the University of Pretoria with a passion for front-end development and UI/UX design. Enthusiastic about learning new frameworks and creating innovative, user-centered designs that enhance digital experiences.
🔗 [LinkedIn](https://www.linkedin.com/in/marcelo-parsotam-5965bb355/)

### Unaisah Hassim
Final-year Computer Science student with a strong interest in front-end development, user experience design, and problem-solving. Skilled in creating responsive, intuitive interfaces and dynamic functionality.
🔗 [LinkedIn](https://www.linkedin.com/in/unaisah-hassim-51ab14354/)

---

## ✅ Functional Requirements

1. The system must be able to process PDF and Word document CVs and extract relevant
technologies.

2. The system must generate a summary of the candidate's profile, including technology preferences
and personality traits.

3. The system must indicate the type of project the candidate would be most effective on (technical,
collaborative, business engagement, high-autonomy, etc.).

4. The system must save and link the extracted data and CV reference to a database that can be
viewed, edited, or optimized via an admin portal.

5. The system must allow admin users to specify skills to ignore and/or include specifically.

6. The system must allow users to upload CVs and provide some information and contact details.

7. The system must allow access roles and role management that would allow some users to only
upload, some to edit, some full access and some users to have full admin access permissions.

---

## 📋 Project Board  
Track our development progress here:  
🔗 [GitHub Project Board](https://github.com/orgs/COS301-SE-2025/projects/110/views/1)

---

## 🔗 Demo Links

- [**Demo1 Video**](https://drive.google.com/file/d/1BtbS0klLEC0HWkYhbL0k7NyrCFnGpLrS/view?usp=sharing)
- [**Demo1 Presentation**](https://docs.google.com/presentation/d/1O4b6erR0Uo78WA-xSwWJO_uA2eCvOgGE/edit?usp=sharing&ouid=117709380918548409880&rtpof=true&sd=true)
- [**Software Requirement Specification Document**](https://drive.google.com/file/d/1AruNcFe2mI8f6CEjC8__o1PSpbJJFRpj/view?usp=sharing)
- [**Demo2 Video**](https://drive.google.com/file/d/1BtbS0klLEC0HWkYhbL0k7NyrCFnGpLrS/view?usp=sharing)
- [**Demo2 Presentation**](https://docs.google.com/presentation/d/1O4b6erR0Uo78WA-xSwWJO_uA2eCvOgGE/edit?usp=sharing&ouid=117709380918548409880&rtpof=true&sd=true)
- [**Software Requirement Specification Document Version 2**](https://drive.google.com/file/d/1R54LThYXge9fBDH2PxvuK5XJubdKwRPj/view?usp=sharing)

---

## Branching Strategies

```mermaid
graph TD;
    Main-->Dev;
    Dev-->UI;
    Dev-->API;
    Dev-->AI;
    Dev-->Engine;
    UI-->UIFeatureBranch;
    Engine-->EngineFeatureBranch;
    API-->APIFeatureBranch;
    AI-->AIFeatureBranch;
```
