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

            // List of technologies to search for (expand as needed)
            List<String> technologies = Arrays.asList(
                "Java", "Python", "C#", "JavaScript", "Spring", "React", "Angular", "Node.js",
                "SQL", "Azure", "AWS", "Docker", "Kubernetes", "HTML", "CSS", "TypeScript"
            );

            // Find mentioned technologies
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