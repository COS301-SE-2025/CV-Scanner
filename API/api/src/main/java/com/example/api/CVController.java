package com.example.api;

import java.io.IOException;
import java.io.InputStream;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/cv")
@CrossOrigin(origins = "*") // Enable CORS for frontend access
public class CVController {
    
    // New: DB + JSON helpers
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public CVController(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }
    
    // Configure this in application.properties
    @Value("${cv.engine.url:http://localhost:8080/process-cv}")
    private String cvEngineUrl;
    
    private final RestTemplate restTemplate = new RestTemplate();
    private final List<String> SUPPORTED_CONTENT_TYPES = Arrays.asList(
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    @PostMapping("/uploadcv")
    public ResponseEntity<?> uploadAndProcessCV(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(createErrorResponse("File is empty"));
        }
        
        String contentType = file.getContentType();
        if (!SUPPORTED_CONTENT_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().body(
                createErrorResponse("File must be a PDF or DOCX document. Received: " + contentType)
            );
        }
        
        try {
            // Extract text based on file type
            String extractedText = extractTextFromFile(file);
            
            if (extractedText.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(createErrorResponse("No text found in document"));
            }
            
            System.out.println("Extracted text length: " + extractedText.length());
            System.out.println("First 200 chars: " + extractedText.substring(0, Math.min(200, extractedText.length())));
            
            // Send text to CV processing engine
            ResponseEntity<String> engineResponse = sendToCvEngine(extractedText);
            
            // Return the response from the engine
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(engineResponse.getBody());
                    
        } catch (IOException e) {
            System.err.println("Document processing error: " + e.getMessage());
            return ResponseEntity.status(500).body(createErrorResponse("Failed to read document: " + e.getMessage()));
        } catch (ResourceAccessException e) {
            System.err.println("Engine connection error: " + e.getMessage());
            return ResponseEntity.status(503).body(createErrorResponse("CV processing engine is not available"));
        } catch (Exception e) {
            System.err.println("Unexpected error: " + e.getMessage());
            return ResponseEntity.status(500).body(createErrorResponse("An unexpected error occurred: " + e.getMessage()));
        }
    }
    
    private String extractTextFromFile(MultipartFile file) throws IOException {
        String contentType = file.getContentType();
        String filename = file.getOriginalFilename();
        
        if ("application/pdf".equals(contentType)) {
            return extractTextFromPdf(file);
        } else if ("application/vnd.openxmlformats-officedocument.wordprocessingml.document".equals(contentType) ||
                   (filename != null && filename.toLowerCase().endsWith(".docx"))) {
            return extractTextFromDocx(file);
        } else {
            throw new IllegalArgumentException("Unsupported file type: " + contentType);
        }
    }
    
    private String extractTextFromPdf(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            
            // Configure the stripper for better text extraction
            pdfStripper.setSortByPosition(true);
            pdfStripper.setLineSeparator("\n");
            
            return pdfStripper.getText(document);
        }
    }
    
    private String extractTextFromDocx(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is)) {
            
            StringBuilder sb = new StringBuilder();
            
            // Extract text from paragraphs
            for (XWPFParagraph paragraph : doc.getParagraphs()) {
                String paragraphText = paragraph.getText();
                if (paragraphText != null && !paragraphText.trim().isEmpty()) {
                    sb.append(paragraphText).append("\n");
                }
            }
            
            // Extract text from tables
            for (XWPFTable table : doc.getTables()) {
                for (XWPFTableRow row : table.getRows()) {
                    for (XWPFTableCell cell : row.getTableCells()) {
                        String cellText = cell.getText();
                        if (cellText != null && !cellText.trim().isEmpty()) {
                            sb.append(cellText).append("\t");
                        }
                    }
                    sb.append("\n");
                }
            }
            
            return sb.toString();
        }
    }
    
    private ResponseEntity<String> sendToCvEngine(String cvText) {
        // Set up headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_PLAIN);
        headers.set("User-Agent", "CV-Document-Processor/1.0");
        
        // Create the request entity
        HttpEntity<String> requestEntity = new HttpEntity<>(cvText, headers);
        
        // Send POST request to the engine
        System.out.println("Sending request to CV engine: " + cvEngineUrl);
        
        ResponseEntity<String> response = restTemplate.exchange(
                cvEngineUrl,
                HttpMethod.POST,
                requestEntity,
                String.class
        );
        
        System.out.println("Engine response status: " + response.getStatusCode());
        return response;
    }
    
    private String createErrorResponse(String message) {
        return String.format("{\"status\": \"error\", \"message\": \"%s\"}", message.replace("\"", "\\\""));
    }
    
    // Health check endpoint to verify engine connectivity
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        try {
            // Simple connectivity test
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.TEXT_PLAIN);
            
            HttpEntity<String> requestEntity = new HttpEntity<>("test", headers);
            
            ResponseEntity<String> response = restTemplate.exchange(
                    cvEngineUrl,
                    HttpMethod.POST,
                    requestEntity,
                    String.class
            );
            
            return ResponseEntity.ok().body("{\"status\": \"healthy\", \"engine\": \"connected\"}");
        } catch (Exception e) {
            return ResponseEntity.status(503).body(createErrorResponse("Engine not available: " + e.getMessage()));
        }
    }
    
    // ---------- New endpoint: save candidate + AI result ----------
    @PostMapping("/save")
    public ResponseEntity<?> save(@RequestBody CvSaveRequest body) {
        try {
            if (body == null || body.candidate == null || CVController.isBlank(body.candidate.email)) {
                return ResponseEntity.badRequest().body(createErrorResponse("Missing candidate/email"));
            }

            long candidateId = upsertCandidate(body.candidate);
            Instant when = parseInstantOrNow(body.receivedAt);

            String aiResult;
            String raw;
            String norm;
            try {
                aiResult = body.aiResult != null ? json.writeValueAsString(body.aiResult) : "{}";
                raw      = body.raw != null ? json.writeValueAsString(body.raw) : null;
                norm     = body.normalized != null ? json.writeValueAsString(body.normalized) : null;
            } catch (Exception ex) {
                return ResponseEntity.badRequest().body(createErrorResponse("Invalid JSON payload"));
            }

            jdbc.update(
                "INSERT INTO dbo.CvScans (CandidateId, FileUrl, AiResult, Raw, Normalized, ReceivedAt) VALUES (?,?,?,?,?,?)",
                candidateId,
                body.fileUrl,
                aiResult,
                raw,
                norm,
                Timestamp.from(when)
            );

            return ResponseEntity.ok().build();
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to save CV: " + ex.getMessage()));
        }
    }

    private static Instant parseInstantOrNow(String s) {
        if (s == null || s.isBlank()) return Instant.now();
        try { return Instant.parse(s); } catch (Exception ignored) { return Instant.now(); }
    }

    private long upsertCandidate(Candidate c) {
        Long id = null;
        try {
            id = jdbc.queryForObject(
                "SELECT Id FROM dbo.Candidates WHERE LOWER(Email) = LOWER(?)",
                Long.class,
                c.email
            );
        } catch (Exception ignored) {}

        if (id != null) {
            jdbc.update(
                "UPDATE dbo.Candidates SET FirstName = ?, LastName = ? WHERE Id = ?",
                nvl(c.firstName), nvl(c.lastName), id
            );
            return id;
        }

        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                "INSERT INTO dbo.Candidates (FirstName, LastName, Email) VALUES (?,?,?)",
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setString(1, nvl(c.firstName));
            ps.setString(2, nvl(c.lastName));
            ps.setString(3, c.email);
            return ps;
        }, kh);

        Number key = kh.getKey();
        if (key == null) throw new RuntimeException("Failed to obtain candidate ID");
        return key.longValue();
    }

    private static String nvl(String s) {
        return s != null ? s : "";
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    @GetMapping("/candidates")
    public ResponseEntity<?> listCandidates(
            @RequestParam(value = "q", required = false) String q) {
        try {
            String sql = """
                WITH latest AS (
                  SELECT cs.CandidateId, cs.FileUrl, cs.AiResult, cs.Normalized, cs.ReceivedAt
                  FROM dbo.CvScans cs
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CvScans
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cs.CandidateId AND m.MaxReceivedAt = cs.ReceivedAt
                )
                SELECT c.Id, c.FirstName, c.LastName, c.Email, l.FileUrl, l.AiResult, l.Normalized, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id
                ORDER BY c.Id DESC
            """;

            List<CandidateSummary> items = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String fileUrl = rs.getString("FileUrl");
                java.sql.Timestamp ts = rs.getTimestamp("ReceivedAt");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");

                List<String> skills = extractSkills(normalized, aiResult);
                String project = fileUrl != null ? lastSegment(fileUrl) : "CV";
                String receivedAt = ts != null ? ts.toInstant().toString() : null;

                return new CandidateSummary(id, first, last, email, project, skills, receivedAt, "N/A");
            });

            if (q != null && !q.isBlank()) {
                final String needle = q.toLowerCase();
                items = items.stream().filter(c ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.project != null && c.project.toLowerCase().contains(needle)) ||
                        c.skills.stream().anyMatch(s -> s.toLowerCase().contains(needle))
                ).toList();
            }

            return ResponseEntity.ok(items);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to fetch candidates: " + ex.getMessage()));
        }
    }

    private List<String> extractSkills(String normalizedJson, String aiResultJson) {
        try {
            if (normalizedJson != null && !normalizedJson.isBlank()) {
                Map<String, Object> norm = json.readValue(normalizedJson, Map.class);
                List<String> s = coerceToStringList(norm.get("skills"));
                if (!s.isEmpty()) return s;
            }
            if (aiResultJson != null && !aiResultJson.isBlank()) {
                Map<String, Object> root = json.readValue(aiResultJson, Map.class);
                Object applied = root.get("applied");
                if (applied instanceof Map<?,?> a) {
                    List<String> s = coerceToStringList(((Map<?,?>) a).get("Skills"));
                    if (!s.isEmpty()) return s;
                }
            }
        } catch (Exception ignored) {}
        return Collections.emptyList();
    }

    private List<String> coerceToStringList(Object v) {
        List<String> out = new ArrayList<>();
        if (v == null) return out;
        if (v instanceof List<?> list) {
            for (Object o : list) if (o != null) out.add(String.valueOf(o));
        } else if (v instanceof String s) {
            for (String line : s.split("\\r?\\n")) {
                String t = line.trim();
                if (!t.isEmpty()) out.add(t);
            }
        } else {
            out.add(String.valueOf(v));
        }
        return out;
    }

    private String lastSegment(String url) {
        try {
            int q = url.indexOf('?');
            String u = q >= 0 ? url.substring(0, q) : url;
            int slash = Math.max(u.lastIndexOf('/'), u.lastIndexOf('\\'));
            return slash >= 0 ? u.substring(slash + 1) : u;
        } catch (Exception e) {
            return url;
        }
    }

    public static class CandidateSummary {
        public long id;
        public String firstName;
        public String lastName;
        public String email;
        public String project;
        public List<String> skills;
        public String receivedAt; // ISO-8601
        public String match;      // placeholder

        public CandidateSummary(long id, String firstName, String lastName, String email,
                                String project, List<String> skills, String receivedAt, String match) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.project = project;
            this.skills = skills;
            this.receivedAt = receivedAt;
            this.match = match;
        }
    }

    // ---------- Add these DTOs inside CVController ----------
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Candidate {
        public String firstName;
        public String lastName;
        public String email;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CvSaveRequest {
        public Candidate candidate;
        public String fileUrl;
        public Map<String, Object> normalized;
        public Map<String, Object> aiResult;
        public Map<String, Object> raw;
        public String receivedAt; // ISO-8601 string
    }
}