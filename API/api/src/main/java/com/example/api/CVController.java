package com.example.api;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.tika.Tika;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/cv")
public class CVController {

    @PostMapping("/uploadcv")
    public ResponseEntity<Map<String, Object>> extractTechnologies(@RequestParam("file") MultipartFile file) {
        try {
            // Extract text from the uploaded file
            Tika tika = new Tika();
            String text = tika.parseToString(file.getInputStream());


            List<String> technologies = Arrays.asList(
                
                "Java", "Python", "JavaScript", "TypeScript", "C#", "C++", "C", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby", "Scala", "Dart",
                
                "React", "Angular", "Vue.js", "Next.js", "Express", "Spring", "Spring Boot", "Django", "Flask", "ASP.NET", "Laravel", "Symfony", "Svelte", "Nuxt.js",
                
                "Android", "iOS", "Flutter", "React Native", "SwiftUI", "Xamarin",
                
                "MySQL", "PostgreSQL", "MongoDB", "SQLite", "Redis", "Oracle", "MariaDB", "Firebase", "Elasticsearch", "Cassandra", "DynamoDB", "SQL Server",
               
                "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "CircleCI", "Travis CI", "GitLab CI",
                
                "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy", "Keras", "OpenCV", "NLTK", "Hugging Face", "Spark", "Hadoop",
                
                "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Slack", "Figma", "Postman", "VS Code", "IntelliJ", "Eclipse", "NetBeans",
                
                "HTML", "CSS", "Sass", "Less", "Bootstrap", "Tailwind", "GraphQL", "REST", "SOAP", "WebSocket", "Microservices", "Serverless", "CI/CD", "Agile", "Scrum"
            );

            List<String> found = new ArrayList<>();
            for (String tech : technologies) {
                if (text.toLowerCase().contains(tech.toLowerCase())) {
                    found.add(tech);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("technologies", found);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("error", "Failed to process file: " + e.getMessage()));
        }
    }
}