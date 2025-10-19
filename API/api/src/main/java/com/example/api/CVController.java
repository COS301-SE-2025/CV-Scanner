package com.example.api;

import java.io.IOException;
import java.io.InputStream;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.Base64;
import java.util.Optional;

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
import org.springframework.core.io.ByteArrayResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/cv")
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
    @PostMapping(value = "/save", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> save(@RequestBody CvSaveRequest body) {
        try {
            if (body == null || body.candidate == null || isBlank(body.candidate.email)) {
                return ResponseEntity.badRequest().body(createErrorResponse("Missing candidate/email"));
            }

            System.out.println("=== SAVE DEBUG ===");
            System.out.println("Candidate: " + body.candidate.firstName + " " + body.candidate.lastName);
            System.out.println("Resume present: " + (body.resume != null));

            long candidateId = upsertCandidate(body.candidate);
            Instant when = parseInstantOrNow(body.receivedAt);

            String resumeJson;
            try {
                if (body.resume != null) {
                    if (body.resume instanceof Map) {
                        resumeJson = json.writeValueAsString(body.resume);
                    } else if (body.resume instanceof String) {
                        resumeJson = (String) body.resume;
                    } else {
                        resumeJson = json.writeValueAsString(body.resume);
                    }
                } else {
                    Map<String, Object> minimal = new LinkedHashMap<>();
                    minimal.put("status", "no_resume");
                    minimal.put("receivedAt", when.toString());
                    minimal.put("source", "manual_entry");
                    resumeJson = json.writeValueAsString(minimal);
                }
                System.out.println("ResumeResult JSON length: " + resumeJson.length());
            } catch (Exception e) {
                System.err.println("Failed to serialize resume JSON: " + e.getMessage());
                e.printStackTrace();
                resumeJson = "{}";
            }

            final byte[] pdfBytes;
            if (!isBlank(body.pdfBase64)) {
                try {
                    pdfBytes = Base64.getDecoder().decode(body.pdfBase64.replaceAll("\\s", ""));
                    System.out.println("Decoded PDF bytes: " + pdfBytes.length);
                } catch (IllegalArgumentException ex) {
                    System.err.println("Invalid PDF base64 payload: " + ex.getMessage());
                    return ResponseEntity.badRequest().body(createErrorResponse("Invalid PDF base64 payload"));
                }
            } else {
                pdfBytes = null;
            }

            final String sql = "INSERT INTO dbo.CandidateParsedCv " +
                    "(CandidateId, FileUrl, AiResult, Normalized, ResumeResult, PdfData, ReceivedAt, RawResult) " +
                    "VALUES (?,?,?,?,?,?,?,?)";
            final String resumeJsonFinal = resumeJson;

            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(sql);
                ps.setLong(1, candidateId);
                if (!isBlank(body.fileUrl)) ps.setString(2, body.fileUrl);
                else ps.setNull(2, java.sql.Types.NVARCHAR);

                if (body.aiResult != null) ps.setString(3, toJson(body.aiResult));
                else ps.setNull(3, java.sql.Types.NVARCHAR);

                if (body.normalized != null) ps.setString(4, toJson(body.normalized));
                else ps.setNull(4, java.sql.Types.NVARCHAR);

                ps.setString(5, resumeJsonFinal);

                if (pdfBytes != null && pdfBytes.length > 0) ps.setBytes(6, pdfBytes);
                else ps.setNull(6, java.sql.Types.VARBINARY);

                ps.setTimestamp(7, Timestamp.from(when));

                if (body.raw != null) ps.setString(8, toJson(body.raw));
                else ps.setNull(8, java.sql.Types.NVARCHAR);

                return ps;
            });

            System.out.println("Inserted candidate data into CandidateParsedCv");

            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "candidateId", candidateId,
                "message", "CV data saved successfully",
                "rowsInserted", 1,
                "pdfStored", pdfBytes != null
            ));
        } catch (Exception ex) {
            System.err.println("Save failed: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500).body(createErrorResponse("Failed to save CV: " + ex.getMessage()));
        }
    }
    @PostMapping(value = "/proxy-ai", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> proxyToAi(
            @RequestParam(value = "file", required = true) MultipartFile file,
            @RequestParam(value = "targetUrl", required = true) String targetUrl,
            @RequestParam(value = "top_k", required = false, defaultValue = "3") int topK) {
        
        System.out.println("=== PROXY-AI DEBUG ===");
        System.out.println("File: " + (file != null ? file.getOriginalFilename() : "null"));
        System.out.println("TargetUrl param: " + targetUrl);
        System.out.println("Top_k: " + topK);
        
        try {
            // Validate inputs
            if (file == null || file.isEmpty()) {
                System.err.println("ERROR: No file in request");
                return ResponseEntity.badRequest()
                    .body("{\"status\":\"error\",\"detail\":\"No file uploaded.\"}");
            }

            if (targetUrl == null || targetUrl.trim().isEmpty()) {
                System.err.println("ERROR: No targetUrl specified");
                return ResponseEntity.badRequest()
                    .body("{\"status\":\"error\",\"detail\":\"No target URL specified.\"}");
            }

            // Build full target URL
            String fullUrl;
            if (targetUrl.startsWith("http")) {
                fullUrl = targetUrl;
            } else {
                String baseUrl = "https://cv-scanner-ai-cee2d5g9epb0hcg6.southafricanorth-01.azurewebsites.net";
                fullUrl = baseUrl + (targetUrl.startsWith("/") ? targetUrl : "/" + targetUrl);
            }

            // Add query params for upload_cv
            if (fullUrl.contains("upload_cv") && !fullUrl.contains("top_k=")) {
                fullUrl += (fullUrl.contains("?") ? "&" : "?") + "top_k=" + topK;
            }

            System.out.println("Full target URL: " + fullUrl);

            // Create temp file
            Path tempFile = Files.createTempFile("cv-proxy-", "-" + file.getOriginalFilename());
            file.transferTo(tempFile.toFile());

            try {
                // Build multipart body
                String boundary = "----WebKitFormBoundary" + UUID.randomUUID().toString().replace("-", "");
                
                // Header part
                StringBuilder headerBuilder = new StringBuilder();
                headerBuilder.append("--").append(boundary).append("\r\n");
                headerBuilder.append("Content-Disposition: form-data; name=\"file\"; filename=\"")
                            .append(file.getOriginalFilename()).append("\"\r\n");
                headerBuilder.append("Content-Type: ").append(file.getContentType() != null ? file.getContentType() : "application/octet-stream").append("\r\n\r\n");
                
                byte[] headerBytes = headerBuilder.toString().getBytes(StandardCharsets.UTF_8);
                byte[] fileBytes = Files.readAllBytes(tempFile);
                byte[] footerBytes = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);
                
                // Combine all parts
                byte[] fullBody = new byte[headerBytes.length + fileBytes.length + footerBytes.length];
                System.arraycopy(headerBytes, 0, fullBody, 0, headerBytes.length);
                System.arraycopy(fileBytes, 0, fullBody, headerBytes.length, fileBytes.length);
                System.arraycopy(footerBytes, 0, fullBody, headerBytes.length + fileBytes.length, footerBytes.length);

                System.out.println("Multipart body size: " + fullBody.length + " bytes");

                // Create HTTP request
                HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(java.time.Duration.ofSeconds(30))
                    .build();
                    
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(fullUrl))
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(fullBody))
                    .timeout(java.time.Duration.ofSeconds(120))
                    .build();

                // Execute request
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                
                System.out.println("AI service response status: " + response.statusCode());
                System.out.println("AI service response body (first 200 chars): " + 
                    (response.body() != null && response.body().length() > 200 
                        ? response.body().substring(0, 200) 
                        : response.body()));
                
                return ResponseEntity.status(response.statusCode())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(response.body());
                    
            } finally {
                // Clean up temp file
                try {
                    Files.deleteIfExists(tempFile);
                } catch (Exception e) {
                    System.err.println("Failed to delete temp file: " + e.getMessage());
                }
            }
            
        } catch (Exception e) {
            System.err.println("PROXY ERROR: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body("{\"status\":\"error\",\"detail\":\"Proxy failed: " + e.getMessage().replace("\"", "\\\"") + "\"}");
        }
    }

    // Remove the old ProxyRequest class and related methods - they're not needed anymore
    // Upsert candidate: insert if not exists, else update and return id
    private long upsertCandidate(Candidate candidate) {
        // Try to find candidate by email
        String sqlSelect = "SELECT Id FROM dbo.Candidates WHERE Email = ?";
        List<Long> ids = jdbc.query(sqlSelect, new Object[]{candidate.email}, (rs, rowNum) -> rs.getLong("Id"));
        if (!ids.isEmpty()) {
            // Optionally update candidate info
            jdbc.update(
                "UPDATE dbo.Candidates SET FirstName = ?, LastName = ? WHERE Id = ?",
                candidate.firstName, candidate.lastName, ids.get(0)
            );
            return ids.get(0);
        } else {
            // Insert new candidate
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbc.update(connection -> {
                PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO dbo.Candidates (FirstName, LastName, Email) VALUES (?, ?, ?)",
                    Statement.RETURN_GENERATED_KEYS
                );
                ps.setString(1, candidate.firstName);
                ps.setString(2, candidate.lastName);
                ps.setString(3, candidate.email);
                return ps;
            }, keyHolder);
            Number key = keyHolder.getKey();
            return key != null ? key.longValue() : -1;
        }
    }

    // ----------------- helpers -----------------
    private String toJsonStringIfNeeded(Object o, String defaultIfNull) {
        if (o == null) return defaultIfNull;
        if (o instanceof String) {
            String s = ((String) o).trim();
            // if already a JSON string, return as-is
            if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) return s;
            return s;
        }
        try {
            return json.writeValueAsString(o);
        } catch (Exception e) {
            return defaultIfNull;
        }
    }

    // Simple convenience wrapper used by save(...) to convert objects to JSON strings (or null)
    private String toJson(Object o) {
        return toJsonStringIfNeeded(o, null);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> coerceToMap(Object o) {
        if (o == null) return null;
        if (o instanceof Map) return (Map<String, Object>) o;
        if (o instanceof String) {
            String s = ((String) o).trim();
            if (s.isEmpty()) return null;
            try {
                return json.readValue(s, Map.class);
            } catch (Exception ignored) { }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private java.util.List<String> coerceToList(Object o) {
        if (o == null) return null;
        if (o instanceof java.util.List) return (java.util.List<String>) o;
        if (o instanceof String) {
            String s = (String) o;
            if (s.contains("\n")) return java.util.Arrays.asList(s.split("\\r?\\n"));
            if (s.contains(",")) return java.util.Arrays.asList(s.split("\\s*,\\s*"));
            if (!s.trim().isEmpty()) return java.util.List.of(s.trim());
        }
        return null;
    }

    private String pickString(Map<String,Object> m, String... keys) {
        if (m == null) return null;
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null) return String.valueOf(v);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private Map<String,Object> pickMap(Map<String,Object> m, String... keys) {
        if (m == null) return null;
        for (String k : keys) {
            Object v = m.get(k);
            if (v instanceof Map) return (Map<String,Object>) v;
            if (v instanceof String) {
                try { return json.readValue((String)v, Map.class); } catch (Exception ignored) {}
            }
        }
        return null;
    }

    private java.util.List<String> pickList(Map<String,Object> m, String... keys) {
        if (m == null) return null;
        for (String k : keys) {
            Object v = m.get(k);
            java.util.List<String> list = coerceToList(v);
            if (list != null) return list;
        }
        return null;
    }

    // ---- Helpers (add inside CVController) ----
    private static String nvl(String s) {
        return s == null ? "" : s;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static Instant parseInstantOrNow(String s) {
        if (isBlank(s)) return Instant.now();
        try { return Instant.parse(s); } catch (Exception e) { return Instant.now(); }
    }

    // Return last path segment of a URL or file path (handles /, \ and ?query)
    private static String lastSegment(String url) {
        if (url == null) return null;
        try {
            int q = url.indexOf('?');
            String u = q >= 0 ? url.substring(0, q) : url;
            int slash = Math.max(u.lastIndexOf('/'), u.lastIndexOf('\\'));
            return slash >= 0 ? u.substring(slash + 1) : u;
        } catch (Exception e) {
            return url;
        }
    }

    // Extract skills from normalized JSON or aiResult.applied.Skills
    @SuppressWarnings("unchecked")
    private List<String> extractSkills(String normalizedJson, String aiResultJson) {
        try {
            var mapper = this.json != null ? this.json : new com.fasterxml.jackson.databind.ObjectMapper();

            if (!isBlank(normalizedJson)) {
                Map<String, Object> norm = mapper.readValue(normalizedJson, Map.class);
                List<String> s = coerceToStringList(norm.get("skills"));
                if (!s.isEmpty()) return s;
            }
            if (!isBlank(aiResultJson)) {
                Map<String, Object> root = mapper.readValue(aiResultJson, Map.class);
                Object applied = root.get("applied");
                if (applied instanceof Map<?, ?> a) {
                    List<String> s = coerceToStringList(((Map<?, ?>) a).get("Skills"));
                    if (!s.isEmpty()) return s;
                }
            }
        } catch (Exception ignored) {}
        return java.util.Collections.emptyList();
    }

    private List<String> coerceToStringList(Object v) {
        java.util.List<String> out = new java.util.ArrayList<>();
        if (v == null) return out;
        if (v instanceof java.util.List<?> list) {
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

    public static class RecentRow {
        public long id;
        public String name;
        public String skills; // comma-separated top 3
        public String fit;    // placeholder for now
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
        public Object normalized;
        public Object aiResult;
        public Object raw;
        public String receivedAt;
        public Object resume;
        public String filename;
        public String summary;
        public Map<String, Object> personalInfo;
        public Map<String, Object> sections;
        public java.util.List<String> skills;
        public String status;
        public Object result;
        public String pdfBase64;
        public String pdfFilename;
        public String pdfContentType;
    }

    @GetMapping("/candidates")
    public ResponseEntity<?> listCandidates(@RequestParam(value = "q", required = false) String q) {
        try {
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.FileUrl, cpc.ResumeResult, cpc.AiResult, cpc.Normalized, cpc.ReceivedAt
                  FROM dbo.CandidateParsedCv cpc
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CandidateParsedCv
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cpc.CandidateId AND m.MaxReceivedAt = cpc.ReceivedAt
                )
                SELECT c.Id, c.FirstName, c.LastName, c.Email, l.FileUrl, l.ResumeResult, l.AiResult, l.Normalized, l.ReceivedAt
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
                String resumeJson = rs.getString("ResumeResult");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                // Prefer ResumeResult.skills, fallback to Normalized/AiResult
                List<String> skills = extractSkillsFromResume(resumeJson);
                if (skills.isEmpty()) {
                    skills = extractSkills(normalized, aiResult);
                }

                String project = fileUrl != null ? lastSegment(fileUrl) : "CV";
                String receivedAt = ts != null ? ts.toInstant().toString() : null;

                return new CandidateSummary(id, first, last, email, project, skills, receivedAt, "N/A");
            });

            if (q != null && !q.isBlank()) {
                final String needle = q.toLowerCase();
                items = items.stream().filter((CandidateSummary c) ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.project != null && c.project.toLowerCase().contains(needle)) ||
                        (c.skills != null && c.skills.stream().anyMatch(s -> s.toLowerCase().contains(needle)))
                ).collect(java.util.stream.Collectors.toList());
            }

            return ResponseEntity.ok(items);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to fetch candidates: " + ex.getMessage()));
        }
    }

    /**
     * New endpoint: /cv/top-technologies
     * Returns top N technologies aggregated from the latest parsed row per candidate.
     * Response: [{ name: "<tech>", value: <count> }, ...]
     */
    @GetMapping("/top-technologies")
    public ResponseEntity<?> topTechnologies(@RequestParam(value = "limit", required = false, defaultValue = "10") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 1000));

            // Use the latest parsed row per candidate
            String sql = """
                WITH latest AS (
                  SELECT CandidateId, AiResult, Normalized, ResumeResult, ReceivedAt,
                         ROW_NUMBER() OVER (PARTITION BY CandidateId ORDER BY ReceivedAt DESC) rn
                  FROM dbo.CandidateParsedCv
                )
                SELECT l.CandidateId, l.AiResult, l.Normalized, l.ResumeResult
                FROM latest l
                WHERE l.rn = 1
            """;

            var rows = jdbc.query(sql, (rs, rowNum) -> {
                Map<String, String> out = new HashMap<>();
                out.put("ai", rs.getString("AiResult"));
                out.put("normalized", rs.getString("Normalized"));
                out.put("resume", rs.getString("ResumeResult"));
                return out;
            });

            ObjectMapper mapper = new ObjectMapper();
            Map<String, Integer> counts = new HashMap<>();

            for (var row : rows) {
                String aiJson = row.get("ai");
                // 1) Try ai.applied.Skills and raw.*.labels
                if (aiJson != null && !aiJson.isBlank()) {
                    try {
                        Map<String, Object> root = mapper.readValue(aiJson, new TypeReference<>() {});
                        Object applied = root.get("applied");
                        if (applied instanceof Map<?, ?> appliedMap) {
                            Object skillsObj = appliedMap.get("Skills");
                            if (skillsObj instanceof Iterable<?> skillsIter) {
                                for (Object s : skillsIter) {
                                    if (s != null) counts.merge(String.valueOf(s).trim(), 1, Integer::sum);
                                }
                                continue; // prefer applied.Skills when present
                            }
                        }

                        Object raw = root.get("raw");
                        if (raw instanceof Map<?, ?> rawMap) {
                            for (Object v : rawMap.values()) {
                                if (v instanceof Map<?, ?> cat) {
                                    Object labels = cat.get("labels");
                                    if (labels instanceof Iterable<?> labIter) {
                                        for (Object s : labIter) if (s != null) counts.merge(String.valueOf(s).trim(), 1, Integer::sum);
                                    }
                                }
                            }
                        }
                    } catch (Exception ignore) {
                        // fallback to normalized/resume below
                    }
                }

                // 2) fallback: normalized or resumeResult may contain CSV / newline separated skills
                String normalized = row.get("normalized");
                String resume = row.get("resume");
                String fallback = normalized != null && !normalized.isBlank() ? normalized : resume;
                if (fallback != null && !fallback.isBlank()) {
                    String[] parts = fallback.split("[,;\\n]");
                    for (String p : parts) {
                        String s = p.trim();
                        if (s.length() > 1 && s.length() < 80) counts.merge(s, 1, Integer::sum);
                    }
                }
            }

            List<Map<String, Object>> out = counts.entrySet().stream()
                    .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                    .limit(top)
                    .map(e -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("name", e.getKey());
                        m.put("value", e.getValue());
                        return m;
                    })
                    .toList();

            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to compute top technologies: " + ex.getMessage()));
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<?> listRecent(@RequestParam(value = "limit", required = false, defaultValue = "10") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 100));
            String sql = """
                WITH latest AS (
                  SELECT cpc.*, ROW_NUMBER() OVER (PARTITION BY cpc.CandidateId ORDER BY cpc.ReceivedAt DESC) rn
                  FROM dbo.CandidateParsedCv cpc
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email,
                       l.ResumeResult, l.AiResult, l.Normalized, l.ReceivedAt
                FROM dbo.Candidates c
                JOIN latest l ON l.CandidateId = c.Id AND l.rn = 1
                ORDER BY l.ReceivedAt DESC
            """.formatted(top);

            List<RecentRow> rows = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                String aiResult = rs.getString("AiResult");
                String normalized = rs.getString("Normalized");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                // Prefer skills from ResumeResult; fallback to normalized/aiResult if empty
                List<String> skills = extractSkillsFromResume(resumeJson);
                if (skills.isEmpty()) {
                    skills = extractSkills(normalized, aiResult);
                }
                String topSkills = String.join(", ", skills.stream().limit(3).toList());

                RecentRow r = new RecentRow();
                r.id = id;
                r.name = buildName(first, last, email);
                r.skills = topSkills;
                r.fit = "N/A";
                return r;
            });

            return ResponseEntity.ok(rows);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to fetch recent: " + ex.getMessage()));
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        try {
            Long total = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.Candidates", Long.class);
            var body = new java.util.HashMap<String, Object>();
            body.put("totalCandidates", total != null ? total : 0L);
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to fetch stats: " + ex.getMessage()));
        }
    }

    private String buildName(String first, String last, String email) {
        String full = ((first != null ? first.trim() : "") + " " + (last != null ? last.trim() : "")).trim();
        return !full.isEmpty() ? full : (email != null ? email : "Unknown");
    }

    private String firstNonEmpty(String a, String b) {
        return (a != null && !a.isEmpty()) ? a : b;
    }

    // Extract skills from ResumeResult JSON (supports both { skills: [...] } and { result: { skills: [...] } })
    @SuppressWarnings("unchecked")
    private List<String> extractSkillsFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return Collections.emptyList();
        try {
            Map<String, Object> root = json.readValue(resumeJson, Map.class);
            Object skillsNode = root.get("skills");
            if (skillsNode == null && root.get("result") instanceof Map<?, ?> res) {
                skillsNode = ((Map<?, ?>) res).get("skills");
            }
            List<String> out = coerceToStringList(skillsNode);
            return out != null ? out : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    // DTO for summary view
    public static class CandidateResumeSummary {
        public long id;
        public String firstName;
        public String lastName;
        public String email;
        public String summary;
        public String receivedAt;
        public CandidateResumeSummary(long id, String firstName, String lastName,
                                      String email, String summary, String receivedAt) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.summary = summary;
            this.receivedAt = receivedAt;
        }
    }

    // --- NEW: list all candidate summaries (latest parsed row per candidate) ---
    @GetMapping("/summaries")
    public ResponseEntity<?> listCandidateSummaries(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 500));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.ResumeResult, cpc.ReceivedAt
                  FROM dbo.CandidateParsedCv cpc
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CandidateParsedCv
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cpc.CandidateId AND m.MaxReceivedAt = cpc.ReceivedAt
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email,
                       l.ResumeResult, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id
                ORDER BY
                  CASE WHEN l.ReceivedAt IS NULL THEN 1 ELSE 0 END,  -- push NULLs last
                  l.ReceivedAt DESC,
                  c.Id DESC
            """.formatted(top);

            List<CandidateResumeSummary> list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                String summary = extractResumeSummary(resumeJson, null, null, null);

                return new CandidateResumeSummary(
                        id, first, last, email,
                        summary,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (q != null && !q.isBlank()) {
                String needle = q.toLowerCase();
                list = list.stream().filter(c ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.summary != null && c.summary.toLowerCase().contains(needle))
                ).toList();
            }

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("Failed to load summaries: " + ex.getMessage()));
        }
    }

    // --- NEW: single candidate summary by id ---
    @GetMapping({"/{identifier}/summary", "/{identifier}/summaries"})
    public ResponseEntity<?> getCandidateSummary(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;

            try {
                candidateId = Long.parseLong(identifier);
            } catch (NumberFormatException ex) {
                email = identifier; // treat as email
            }

            String sql;
            Object[] params;

            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs, i) -> {
                String resumeJson = rs.getString("ResumeResult");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                String summary = extractResumeSummary(resumeJson, normalized, aiResult, null);
                return new CandidateResumeSummary(
                        rs.getLong("Id"),
                        rs.getString("FirstName"),
                        rs.getString("LastName"),
                        rs.getString("Email"),
                        summary,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404)
                        .body(Map.of("message", "Candidate not found"));
            }
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(Map.of("message","Failed to load summary: "+ex.getMessage()));
        }
    }

    // --- Replace old simple extractResumeSummary(String) with robust variant ---
    // Remove/rename the previous extractResumeSummary(String) before adding this one.
    @SuppressWarnings("unchecked")
    private String extractResumeSummary(String resumeJson,
                                        String normalizedJson,
                                        String aiResultJson,
                                        String storedSummary) {
        // 0. Stored summary column (if present)
        if (!isBlank(storedSummary)) return truncateSummary(storedSummary);

        Map<String,Object> root = parseJsonToMap(resumeJson);
        if (root != null) {
            // 1. Direct keys at root
            String direct = findSummaryInMap(root);
            if (!isBlank(direct)) return truncateSummary(direct);

            // 2. Wrapped in "result"
            Object resultNode = root.get("result");
            if (resultNode instanceof Map<?,?> rm) {
                String inResult = findSummaryInMap((Map<String,Object>) rm);
                if (!isBlank(inResult)) return truncateSummary(inResult);

                // 3. Sections inside result
                Object sections = ((Map<?,?>) rm).get("sections");
                if (sections instanceof Map<?,?> secMap) {
                    String secSummary = findSummaryInSections((Map<String,Object>) secMap);
                    if (!isBlank(secSummary)) return truncateSummary(secSummary);
                }
            }

            // 4. Sections at root (rare)
            Object rootSections = root.get("sections");
            if (rootSections instanceof Map<?,?> secMap) {
                String secSummary = findSummaryInSections((Map<String,Object>) secMap);
                if (!isBlank(secSummary)) return truncateSummary(secSummary);
            }
        }

        // 5. Normalized JSON fallback
        Map<String,Object> norm = parseJsonToMap(normalizedJson);
        if (norm != null) {
            Object normSummary = firstNonNull(norm.get("summary"), norm.get("profile"), norm.get("objective"));
            if (normSummary instanceof String s && !isBlank(s)) return truncateSummary(s);
        }

        // 6. AI result applied? (less common for summary)
        Map<String,Object> ai = parseJsonToMap(aiResultJson);
        if (ai != null) {
            Object applied = ai.get("applied");
            if (applied instanceof Map<?,?> ap) {
                Object aiSum = ((Map<?,?>) ap).get("Summary");
                if (aiSum instanceof String s && !isBlank(s)) return truncateSummary(s);
            }
        }

        return null;
    }

    private Map<String,Object> parseJsonToMap(String jsonStr) {
        if (isBlank(jsonStr)) return null;
        try { return json.readValue(jsonStr, Map.class); } catch (Exception ignored) { return null; }
    }

    private Object firstNonNull(Object... arr) {
        if (arr == null) return null;
        for (Object o : arr) if (o != null) return o;
        return null;
    }

    @SuppressWarnings("unchecked")
    private String findSummaryInMap(Map<String,Object> map) {
        if (map == null) return null;
        String[] keys = {
            "summary","profile","objective","professional_summary","professionalSummary",
            "headline","about","about_me","aboutMe","overview"
        };
        for (String k : keys) {
            Object v = map.get(k);
            String s = coerceSummaryText(v);
            if (!isBlank(s)) return s;
        }
        // personal_info nested
        Object pi = firstNonNull(map.get("personal_info"), map.get("personalInfo"));
        if (pi instanceof Map<?,?> pim) {
            for (String k : keys) {
                Object v = ((Map<?,?>) pim).get(k);
                String s = coerceSummaryText(v);
                if (!isBlank(s)) return s;
            }
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private String findSummaryInSections(Map<String,Object> sections) {
        if (sections == null) return null;
        // Direct summary-like keys
        String s = findSummaryInMap(sections);
        if (!isBlank(s)) return s;

        // Heuristic: take first 1–2 sentences from education or experience text blobs
        Object edu = sections.get("education");
        String eduText = coerceSummaryText(edu);
        if (!isBlank(eduText)) {
            String fs = firstSentences(eduText, 2);
            if (!isBlank(fs)) return fs;
        }
        Object exp = sections.get("experience");
        String expText = coerceSummaryText(exp);
        if (!isBlank(expText)) {
            String fs = firstSentences(expText, 2);
            if (!isBlank(fs)) return fs;
        }
        return null;
    }

    private String coerceSummaryText(Object v) {
        if (v == null) return null;
        if (v instanceof String s) return normalizeSpaces(s);
        if (v instanceof List<?> list && !list.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            for (Object o : list) {
                if (o == null) continue;
                String line = o.toString().trim();
                if (line.isEmpty()) continue;
                if (sb.length() > 0) sb.append(" ");
                sb.append(line);
                if (sb.length() > 600) break;
            }
            return sb.length() == 0 ? null : normalizeSpaces(sb.toString());
        }
        return normalizeSpaces(String.valueOf(v));
    }

    private String firstSentences(String text, int maxSentences) {
        if (isBlank(text)) return null;
        String[] parts = text.split("(?<=[.!?])\\s+");
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (String p : parts) {
            String t = p.trim();
            if (t.isEmpty()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(t);
            if (++count >= maxSentences) break;
            if (sb.length() > 500) break;
        }
        return sb.length() == 0 ? null : sb.toString();
    }

private String normalizeSpaces(String s) {
    return s == null ? null : s.replaceAll("\\s+", " ").trim();
}

// Helper to truncate long summaries safely
private String truncateSummary(String s) {
    if (s == null) return null;
    String norm = normalizeSpaces(s);
    int max = 600;
    if (norm.length() > max) {
        return norm.substring(0, max).trim() + "...";
    }
    return norm;
}

    public static class CandidateSkills {
        public long id;
        public String firstName;
        public String lastName;
        public String email;
        public java.util.List<String> skills;
        public String receivedAt;
        public CandidateSkills(long id, String firstName, String lastName,
                               String email, java.util.List<String> skills, String receivedAt) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.skills = skills;
            this.receivedAt = receivedAt;
        }
    }

    // List all candidate skills (latest parsed CV row per candidate)
    @GetMapping("/skills")
    public ResponseEntity<?> listCandidateSkills(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 500));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                  FROM dbo.CandidateParsedCv cpc
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CandidateParsedCv
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cpc.CandidateId AND m.MaxReceivedAt = cpc.ReceivedAt
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email,
                       l.ResumeResult, l.Normalized, l.AiResult, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id
                ORDER BY
                  CASE WHEN l.ReceivedAt IS NULL THEN 1 ELSE 0 END,
                  l.ReceivedAt DESC,
                  c.Id DESC
            """.formatted(top);

            var list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                java.util.List<String> skills = extractSkillsFromResume(resumeJson);
                if (skills.isEmpty()) {
                    skills = extractSkills(normalized, aiResult);
                }

                return new CandidateSkills(
                        id, first, last, email,
                        skills,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (q != null && !q.isBlank()) {
                String needle = q.toLowerCase();
                list = list.stream().filter(c ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.skills != null && c.skills.stream().anyMatch(s -> s.toLowerCase().contains(needle)))
                ).toList();
            }

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("Failed to load skills: " + ex.getMessage()));
        }
    }

    // Single candidate skills (numeric id or email)
    @GetMapping("/{identifier}/skills")
    public ResponseEntity<?> getCandidateSkills(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { email = identifier; }

            String sql;
            Object[] params;
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs,i) -> {
                String resumeJson = rs.getString("ResumeResult");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                var skills = extractSkillsFromResume(resumeJson);
                if (skills.isEmpty()) skills = extractSkills(normalized, aiResult);
                return new CandidateSkills(
                        rs.getLong("Id"),
                        rs.getString("FirstName"),
                        rs.getString("LastName"),
                        rs.getString("Email"),
                        skills,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message","Candidate not found"));
            }
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                .body(Map.of("message","Failed to load candidate skills: "+ex.getMessage()));
        }
    }

    // --- DTO: Candidate Experience ---
    public static class CandidateExperience {
        public long id;
        public String firstName;
        public String lastName;
        public String email;
        public java.util.List<String> experience; // normalized list entries
        public String receivedAt;
        public CandidateExperience(long id, String firstName, String lastName,
                                   String email, java.util.List<String> experience, String receivedAt) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.experience = experience;
            this.receivedAt = receivedAt;
        }
    }

    // --- List all candidate experience (latest parsed row per candidate) ---
    @GetMapping("/experience")
    public ResponseEntity<?> listCandidateExperience(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 500));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                  FROM dbo.CandidateParsedCv cpc
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CandidateParsedCv
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cpc.CandidateId AND m.MaxReceivedAt = cpc.ReceivedAt
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email,
                       l.ResumeResult, l.Normalized, l.AiResult, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id
                ORDER BY
                  CASE WHEN l.ReceivedAt IS NULL THEN 1 ELSE 0 END,
                  l.ReceivedAt DESC,
                  c.Id DESC
            """.formatted(top);

            var list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                String aiResult = rs.getString("AiResult");
                String normalized = rs.getString("Normalized");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                java.util.List<String> experience = extractExperienceFromResume(resumeJson);
                if (experience.isEmpty()) {
                    experience = extractExperienceFallback(normalized, aiResult);
                }

                return new CandidateExperience(
                        id, first, last, email,
                        experience,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (q != null && !q.isBlank()) {
                String needle = q.toLowerCase();
                list = list.stream().filter(c ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.experience != null && c.experience.stream().anyMatch(e -> e.toLowerCase().contains(needle)))
                ).toList();
            }

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("Failed to load experience: " + ex.getMessage()));
        }
    }

    // --- Single candidate experience (id or email) ---
    @GetMapping("/{identifier}/experience")
    public ResponseEntity<?> getCandidateExperience(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null; String email = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { email = identifier; }

            String sql;
            Object[] params;
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.ResumeResult, cpc.Normalized, cpc.AiResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs,i) -> {
                String resumeJson = rs.getString("ResumeResult");
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                var experience = extractExperienceFromResume(resumeJson);
                if (experience.isEmpty()) experience = extractExperienceFallback(normalized, aiResult);

                return new CandidateExperience(
                        rs.getLong("Id"),
                        rs.getString("FirstName"),
                        rs.getString("LastName"),
                        rs.getString("Email"),
                        experience,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message","Candidate not found"));
            }
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(Map.of("message","Failed to load candidate experience: "+ex.getMessage()));
        }
    }

    // --- Experience extraction helpers ---

    @SuppressWarnings("unchecked")
    private java.util.List<String> extractExperienceFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return java.util.Collections.emptyList();
        try {
            Map<String,Object> root = json.readValue(resumeJson, Map.class);

            Object sections = root.get("sections");
            if (sections == null && root.get("result") instanceof Map<?,?> r) {
                sections = ((Map<?,?>) r).get("sections");
            }

            // Direct experience field
            Object expNode = null;
            if (sections instanceof Map<?,?> secMap) {
                expNode = ((Map<?,?>) secMap).get("experience");
            } else {
                // fallback: maybe root has "experience"
                expNode = root.get("experience");
            }

            java.util.List<String> expList = coerceExperienceList(expNode);
            if (!expList.isEmpty()) return expList;

            // If still empty and sections is a big text blob
            if (expNode instanceof String s) {
                return splitExperienceBlob(s);
            }

            return java.util.Collections.emptyList();
        } catch (Exception ignored) {}
        return java.util.Collections.emptyList();
    }

    private java.util.List<String> extractExperienceFallback(String normalizedJson, String aiResultJson) {
        // Try normalized
        if (!isBlank(normalizedJson)) {
            try {
                Map<String,Object> norm = json.readValue(normalizedJson, Map.class);
                Object exp = firstNonNull(norm.get("experience"), norm.get("work_experience"), norm.get("workExperience"));
                java.util.List<String> list = coerceExperienceList(exp);
                if (!list.isEmpty()) return list;
                if (exp instanceof String s) return splitExperienceBlob(s);
            } catch (Exception ignored) {}
        }
        // Try AI result
        if (!isBlank(aiResultJson)) {
            try {
                Map<String,Object> ai = json.readValue(aiResultJson, Map.class);
                Object applied = ai.get("applied");
                if (applied instanceof Map<?,?> a) {
                    Object exp = ((Map<?, ?>) a).get("Experience");
                    java.util.List<String> list = coerceExperienceList(exp);
                    if (!list.isEmpty()) return list;
                    if (exp instanceof String s) return splitExperienceBlob(s);
                }
            } catch (Exception ignored) {}
        }
        return java.util.Collections.emptyList();
    }

    private java.util.List<String> coerceExperienceList(Object node) {
        java.util.List<String> out = new java.util.ArrayList<>();
        if (node == null) return out;
        if (node instanceof java.util.List<?> list) {
            for (Object o : list) {
                if (o == null) continue;
                String s = normalizeSpaces(String.valueOf(o));
                if (s.isEmpty()) continue;
                out.add(s);
                if (out.size() >= 40) break;
            }
            return out;
        }
        if (node instanceof String s) {
            // If multiline treat each non-empty line as item if >1 lines
            if (s.contains("\n")) {
                for (String line : s.split("\\r?\\n")) {
                    String t = normalizeSpaces(line);
                    if (t.length() > 2) out.add(t);
                    if (out.size() >= 40) break;
                }
                if (!out.isEmpty()) return out;
            }
            // Fallback to sentence split
            return splitExperienceBlob(s);
        }
        // Unknown type
        String single = normalizeSpaces(String.valueOf(node));
        if (!single.isEmpty()) out.add(single);
        return out;
    }

    private java.util.List<String> splitExperienceBlob(String text) {
        java.util.List<String> out = new java.util.ArrayList<>();
        if (isBlank(text)) return out;
        // Prefer sentence boundary
        String[] sentences = text.split("(?<=[.!?])\\s+");
        for (String sen : sentences) {
            String t = normalizeSpaces(sen);
            if (t.length() < 4) continue;
            out.add(t);
            if (out.size() >= 40) break;
        }
        if (!out.isEmpty()) return out;

        // Fallback: split by periods anyway
        for (String part : text.split("\\.")) {
            String t = normalizeSpaces(part);
            if (t.length() < 4) continue;
            out.add(t);
            if (out.size() >= 40) break;
        }
        return out;
    }

    // DTO: Candidate Filename
    public static class CandidateFilename {
        public long id;
        public String firstName;
        public String lastName;
        public String email;
        public String fileUrl;
        public String filename;
        public String receivedAt;
        public CandidateFilename(long id, String firstName, String lastName, String email,
                                 String fileUrl, String filename, String receivedAt) {
            this.id = id;
            this.firstName = firstName;
            this.lastName = lastName;
            this.email = email;
            this.fileUrl = fileUrl;
            this.filename = filename;
            this.receivedAt = receivedAt;
        }
    }

    // List all candidate filenames (latest parsed row per candidate)
    @GetMapping("/filenames")
    public ResponseEntity<?> listCandidateFilenames(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 500));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.FileUrl, cpc.ResumeResult, cpc.ReceivedAt
                  FROM dbo.CandidateParsedCv cpc
                  JOIN (
                    SELECT CandidateId, MAX(ReceivedAt) AS MaxReceivedAt
                    FROM dbo.CandidateParsedCv
                    GROUP BY CandidateId
                  ) m ON m.CandidateId = cpc.CandidateId AND m.MaxReceivedAt = cpc.ReceivedAt
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email,
                       l.FileUrl, l.ResumeResult, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id
                ORDER BY
                  CASE WHEN l.ReceivedAt IS NULL THEN 1 ELSE 0 END,
                  l.ReceivedAt DESC,
                  c.Id DESC
            """.formatted(top);

            var list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String fileUrl = rs.getString("FileUrl");
                String resumeJson = rs.getString("ResumeResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");

                String fn = extractFilenameFromResume(resumeJson);
                if (isBlank(fn) && fileUrl != null) fn = lastSegment(fileUrl);
                if (isBlank(fn)) fn = null;

                return new CandidateFilename(
                        id, first, last, email,
                        fileUrl, fn,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (q != null && !q.isBlank()) {
                String needle = q.toLowerCase();
                list = list.stream().filter(c ->
                        (c.firstName != null && c.firstName.toLowerCase().contains(needle)) ||
                        (c.lastName != null && c.lastName.toLowerCase().contains(needle)) ||
                        (c.email != null && c.email.toLowerCase().contains(needle)) ||
                        (c.filename != null && c.filename.toLowerCase().contains(needle)) ||
                        (c.fileUrl != null && c.fileUrl.toLowerCase().contains(needle))
                ).toList();
            }

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(createErrorResponse("Failed to load filenames: " + ex.getMessage()));
        }
    }

    // Single candidate filename (id or email)
    @GetMapping("/{identifier}/filename")
    public ResponseEntity<?> getCandidateFilename(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null; String email = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { email = identifier; }

            String sql;
            Object[] params;
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.FileUrl, cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email,
                                 cpc.FileUrl, cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs,i) -> {
                String resumeJson = rs.getString("ResumeResult");
                String fileUrl = rs.getString("FileUrl");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                String fn = extractFilenameFromResume(resumeJson);
                if (isBlank(fn) && fileUrl != null) fn = lastSegment(fileUrl);
                if (isBlank(fn)) fn = null;
                return new CandidateFilename(
                        rs.getLong("Id"),
                        rs.getString("FirstName"),
                        rs.getString("LastName"),
                        rs.getString("Email"),
                        fileUrl,
                        fn,
                        ts != null ? ts.toInstant().toString() : null
                );
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message","Candidate not found"));
            }
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(Map.of("message","Failed to load candidate filename: "+ex.getMessage()));
        }
    }

    // Helper to extract filename from ResumeResult JSON
    @SuppressWarnings("unchecked")
    private String extractFilenameFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return null;
        try {
            Map<String,Object> root = json.readValue(resumeJson, Map.class);

            // Common keys
            String[] keys = {"filename","file_name","file","originalFilename","original_name"};
            for (String k : keys) {
                Object v = root.get(k);
                if (v instanceof String s && !isBlank(s)) return s.trim();
            }

            // Nested meta
            Object meta = root.get("meta");
            if (meta instanceof Map<?,?> m) {
                for (String k : keys) {
                    Object v = ((Map<?,?>) m).get(k);
                    if (v instanceof String s && !isBlank(s)) return s.trim();
                }
            }

            // Wrapped result
            Object result = root.get("result");
            if (result instanceof Map<?,?> r) {
                for (String k : keys) {
                    Object v = ((Map<?,?>) r).get(k);
                    if (v instanceof String s && !isBlank(s)) return s.trim();
                }
                Object rMeta = ((Map<?,?>) r).get("meta");
                if (rMeta instanceof Map<?,?> rm) {
                    for (String k : keys) {
                        Object v = ((Map<?,?>) rm).get(k);
                        if (v instanceof String s && !isBlank(s)) return s.trim();
                    }
                }
            }

            return null;
        } catch (Exception ignored) { }
        return null;
    }

    @GetMapping("/average-scores")
    public ResponseEntity<?> averageScores(@RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 1000));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.AiResult, cpc.ReceivedAt,
                         ROW_NUMBER() OVER (PARTITION BY cpc.CandidateId ORDER BY cpc.ReceivedAt DESC) rn
                  FROM dbo.CandidateParsedCv cpc
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email, l.AiResult
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id AND l.rn = 1
                ORDER BY c.Id DESC
            """.formatted(top);

            var list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String email = rs.getString("Email");
                String aiResult = rs.getString("AiResult");

                Double avgScore = computeAverageScoreFromAiResult(aiResult);
                Map<String, Object> map = new HashMap<>();
                map.put("candidateId", id);
                map.put("firstName", first);
                map.put("lastName", last);
                map.put("email", email);
                map.put("averageScoreOutOf10", avgScore); // null if unavailable
                return map;
            });

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to compute averages: " + ex.getMessage()));
        }
    }

    // ========== NEW ENDPOINTS FOR CV SCORE AND PROJECT TYPE ==========

    /**
     * GET /cv/{identifier}/cv-score
     * Returns the CV score (0-10 scale) from parse_resume result.
     * Identifier can be candidate ID (numeric) or email.
     * 
     * Response:
     * {
     *   "candidateId": 123,
     *   "firstName": "John",
     *   "lastName": "Doe",
     *   "email": "john@example.com",
     *   "cvScore": 8.1,
     *   "cvScoreOutOf100": 81,
     *   "receivedAt": "2025-10-09T12:34:56Z"
     * }
     */
    @GetMapping("/{identifier}/cv-score")
    public ResponseEntity<?> getCandidateCvScore(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;
            
            // Parse identifier as ID or email
            try {
                candidateId = Long.parseLong(identifier);
            } catch (NumberFormatException ignored) {
                email = identifier;
            }

            String sql;
            Object[] params;
            
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 
                        c.Id, c.FirstName, c.LastName, c.Email,
                        cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 
                        c.Id, c.FirstName, c.LastName, c.Email,
                        cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String mail = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                
                Double cvScore = extractCvScoreFromResume(resumeJson);
                Integer cvScoreOutOf100 = cvScore != null ? (int) Math.round(cvScore * 10.0) : null;
                
                Map<String, Object> response = new LinkedHashMap<>();
                response.put("candidateId", id);
                response.put("firstName", first);
                response.put("lastName", last);
                response.put("email", mail);
                response.put("cvScore", cvScore); // 0-10 scale
                response.put("cvScoreOutOf100", cvScoreOutOf100); // percentage
                response.put("receivedAt", ts != null ? ts.toInstant().toString() : null);
                
                return response;
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404)
                    .body(Map.of("message", "Candidate not found"));
            }
            
            return ResponseEntity.ok(rows.get(0));
            
        } catch (Exception ex) {
            System.err.println("Failed to get CV score: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500)
                .body(createErrorResponse("Failed to get CV score: " + ex.getMessage()));
        }
    }

    /**
     * GET /cv/{identifier}/project-type
     * Returns the project type and fit percentage from parse_resume result.
     * Identifier can be candidate ID (numeric) or email.
     * 
     * Response:
     * {
     *   "candidateId": 123,
     *   "firstName": "John",
     *   "lastName": "Doe",
     *   "email": "john@example.com",
     *   "projectType": "Frontend Web App",
     *   "projectFit": 8.7,
     *   "projectFitPercent": 87,
     *   "projectFitLabel": "Frontend Web App 87%",
     *   "receivedAt": "2025-10-09T12:34:56Z"
     * }
     */
    @GetMapping("/{identifier}/project-type")
    public ResponseEntity<?> getCandidateProjectType(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;
            
            // Parse identifier as ID or email
            try {
                candidateId = Long.parseLong(identifier);
            } catch (NumberFormatException ignored) {
                email = identifier;
            }

            String sql;
            Object[] params;
            
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 
                        c.Id, c.FirstName, c.LastName, c.Email,
                        cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 
                        c.Id, c.FirstName, c.LastName, c.Email,
                        cpc.ResumeResult, cpc.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String mail = rs.getString("Email");
                String resumeJson = rs.getString("ResumeResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                
                String projectType = extractProjectTypeFromResume(resumeJson);
                Double projectFit = extractProjectFitFromResume(resumeJson);
                Integer projectFitPercent = projectFit != null ? (int) Math.round(projectFit * 10.0) : null;
                
                String projectFitLabel = null;
                if (projectType != null && projectFitPercent != null) {
                    projectFitLabel = projectType + " " + projectFitPercent + "%";
                }
                
                Map<String, Object> response = new LinkedHashMap<>();
                response.put("candidateId", id);
                response.put("firstName", first);
                response.put("lastName", last);
                response.put("email", mail);
                response.put("projectType", projectType);
                response.put("projectFit", projectFit); // 0-10 scale
                response.put("projectFitPercent", projectFitPercent); // percentage
                response.put("projectFitLabel", projectFitLabel); // "Frontend Web App 87%"
                response.put("receivedAt", ts != null ? ts.toInstant().toString() : null);
                
                return response;
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404)
                    .body(Map.of("message", "Candidate not found"));
            }
            
            return ResponseEntity.ok(rows.get(0));
            
        } catch (Exception ex) {
            System.err.println("Failed to get project type: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500)
                .body(createErrorResponse("Failed to get project type: " + ex.getMessage()));
        }
    }

    // ========== HELPER METHODS FOR NEW ENDPOINTS ==========

    /**
     * Extract cv_score from ResumeResult JSON.
     * Supports both direct result.cv_score and nested structures.
     * Returns value on 0-10 scale, or null if not found.
     */
    @SuppressWarnings("unchecked")
    private Double extractCvScoreFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return null;
        
        try {
            Map<String, Object> root = json.readValue(resumeJson, Map.class);
            
            // Try direct cv_score at root
            Object cvScoreObj = root.get("cv_score");
            if (cvScoreObj != null) {
                return toDouble(cvScoreObj);
            }
            
            // Try nested in result.cv_score
            Object resultObj = root.get("result");
            if (resultObj instanceof Map<?, ?>) {
                Map<String, Object> result = (Map<String, Object>) resultObj;
                cvScoreObj = result.get("cv_score");
                if (cvScoreObj != null) {
                    return toDouble(cvScoreObj);
                }
            }
            
            return null;
        } catch (Exception e) {
            System.err.println("Failed to extract cv_score: " + e.getMessage());
            return null;
        }
    }

    /**
     * Extract project_type from ResumeResult JSON.
     * Supports multiple nested structures and formats.
     * Returns the project type string, or null if not found.
     */
    @SuppressWarnings("unchecked")
    private String extractProjectTypeFromResume(String resumeJson) {
        if (isBlank(resumeJson)) {
            System.out.println("extractProjectType: resumeJson is blank");
            return null;
        }
        
        try {
            Map<String, Object> root = json.readValue(resumeJson, Map.class);
            System.out.println("extractProjectType: Parsed JSON, root keys: " + root.keySet());
            
            // 1. Try direct project_type at root
            Object projectTypeObj = root.get("project_type");
            if (projectTypeObj != null && !isBlank(String.valueOf(projectTypeObj))) {
                String type = String.valueOf(projectTypeObj).trim();
                System.out.println("Found project_type at root: " + type);
                return type;
            }
            
            // 2. Try nested in result.project_type
            Object resultObj = root.get("result");
            if (resultObj instanceof Map<?, ?>) {
                Map<String, Object> result = (Map<String, Object>) resultObj;
                System.out.println("extractProjectType: result keys: " + result.keySet());
                
                projectTypeObj = result.get("project_type");
                if (projectTypeObj != null && !isBlank(String.valueOf(projectTypeObj))) {
                    String type = String.valueOf(projectTypeObj).trim();
                    System.out.println("Found project_type in result: " + type);
                    return type;
                }
                
                // 3. Check summary field for project type keywords
                Object summaryObj = result.get("summary");
                if (summaryObj != null) {
                    String summary = String.valueOf(summaryObj).toLowerCase();
                    System.out.println("Checking summary for project type: " + summary.substring(0, Math.min(100, summary.length())));
                    
                    // Extract from patterns like "specializing in ['Frontend Development', ...]"
                    if (summary.contains("frontend") || summary.contains("front-end")) {
                        System.out.println("Detected: Frontend Development");
                        return "Frontend Development";
                    }
                    if (summary.contains("backend") || summary.contains("back-end")) {
                        System.out.println("Detected: Backend Development");
                        return "Backend Development";
                    }
                    if (summary.contains("full stack") || summary.contains("fullstack")) {
                        System.out.println("Detected: Full Stack Development");
                        return "Full Stack Development";
                    }
                    if (summary.contains("mobile") || summary.contains("android") || summary.contains("ios")) {
                        System.out.println("Detected: Mobile Development");
                        return "Mobile Development";
                    }
                    if (summary.contains("data science") || summary.contains("machine learning") || summary.contains("ai/ml")) {
                        System.out.println("Detected: Data Science / AI/ML");
                        return "Data Science / AI/ML";
                    }
                    if (summary.contains("devops") || summary.contains("infrastructure")) {
                        System.out.println("Detected: DevOps / Infrastructure");
                        return "DevOps / Infrastructure";
                    }
                    if (summary.contains("cybersecurity") || summary.contains("security")) {
                        System.out.println("Detected: Cybersecurity");
                        return "Cybersecurity";
                    }
                }
            }
            
            // 4. Fallback: analyze skills to infer project type
            Object skillsObj = root.get("skills");
            if (skillsObj == null && resultObj instanceof Map<?, ?>) {
                skillsObj = ((Map<?, ?>) resultObj).get("skills");
            }
            
            if (skillsObj instanceof List<?>) {
                List<?> skills = (List<?>) skillsObj;
                String inferredType = inferProjectTypeFromSkills(skills);
                if (inferredType != null) {
                    System.out.println("Inferred project type from skills: " + inferredType);
                    return inferredType;
                }
            }
            
            System.out.println("extractProjectType: No project type found");
            return null;
        } catch (Exception e) {
            System.err.println("Failed to extract project_type: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    /**
     * Infer project type from skills list
     */
    private String inferProjectTypeFromSkills(List<?> skills) {
        if (skills == null || skills.isEmpty()) return null;
        
        int frontendScore = 0;
        int backendScore = 0;
        int mobileScore = 0;
        int dataScore = 0;
        int devopsScore = 0;
        
        for (Object skillObj : skills) {
            String skill = String.valueOf(skillObj).toLowerCase();
            
            // Frontend indicators
            if (skill.matches(".*(react|angular|vue|html|css|javascript|typescript|frontend|ui|ux).*")) {
                frontendScore++;
            }
            // Backend indicators
            if (skill.matches(".*(java|python|node|spring|django|flask|sql|database|api|backend).*")) {
                backendScore++;
            }
            // Mobile indicators
            if (skill.matches(".*(android|ios|swift|kotlin|flutter|react native|mobile).*")) {
                mobileScore++;
            }
            // Data Science indicators
            if (skill.matches(".*(machine learning|tensorflow|pytorch|data science|ai|ml|pandas|numpy).*")) {
                dataScore++;
            }
            // DevOps indicators
            if (skill.matches(".*(docker|kubernetes|jenkins|ci/cd|aws|azure|devops|cloud).*")) {
                devopsScore++;
            }
        }
        
        // Determine dominant type
        int maxScore = Math.max(frontendScore, Math.max(backendScore, Math.max(mobileScore, Math.max(dataScore, devopsScore))));
        
        if (maxScore == 0) return null;
        
        if (frontendScore == maxScore && backendScore == maxScore && frontendScore >= 2) {
            return "Full Stack Development";
        }
        if (frontendScore == maxScore) return "Frontend Development";
        if (backendScore == maxScore) return "Backend Development";
        if (mobileScore == maxScore) return "Mobile Development";
        if (dataScore == maxScore) return "Data Science / AI/ML";
        if (devopsScore == maxScore) return "DevOps / Infrastructure";
        
        return null;
    }

    /**
     * Extract project_fit score from ResumeResult JSON and normalize it to 0..10.
     */
    @SuppressWarnings("unchecked")
    private Double extractProjectFitFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return null;
        try {
            Map<String, Object> root = json.readValue(resumeJson, Map.class);

            Double score = findProjectFitScore(root);
            if (score == null) {
                Object resultObj = root.get("result");
                if (resultObj instanceof Map<?, ?>) {
                    score = findProjectFitScore((Map<String, Object>) resultObj);
                }
            }
            if (score == null) return null;

            double norm = normalizeToTen(score);
            return Math.round(norm * 100.0) / 100.0;
        } catch (Exception e) {
            System.err.println("Failed to extract project_fit: " + e.getMessage());
            return null;
        }
    }

    private Double findProjectFitScore(Map<String, Object> map) {
        if (map == null) return null;

        String[] keys = {
            "project_fit","projectFit","project_fit_score","projectFitScore",
            "fit_score","fitScore","project_fit_percent","projectFitPercent"
        };
        for (String k : keys) {
            Double v = toDouble(map.get(k));
            if (v != null) return v;
        }

        Object projTypeObj = map.get("project_type");
        if (projTypeObj instanceof Map<?, ?> pm) {
            Double v = toDouble(((Map<?, ?>) pm).get("score"));
            if (v == null) v = toDouble(((Map<?, ?>) pm).get("confidence"));
            if (v != null) return v;
        }

        Object fitObj = map.get("fit");
        if (fitObj instanceof Map<?, ?> fm) {
            Double v = toDouble(((Map<?, ?>) fm).get("score"));
            if (v == null) v = toDouble(((Map<?, ?>) fm).get("confidence"));
            if (v != null) return v;
        }

        Object topk = map.get("top_k");
        if (topk instanceof List<?> list && !list.isEmpty()) {
            Object first = list.get(0);
            if (first instanceof Map<?, ?> m && m.get("score") != null) {
                Double v = toDouble(m.get("score"));
                if (v != null) return v;
            }
        }

        return null;
    }

    // Normalize score possibly expressed as 0..1, 0..10, or 0..100 to 0..10.
    private double normalizeToTen(Double score) {
        double d = score;
        if (Double.isNaN(d) || Double.isInfinite(d)) return 0.0;
        if (d <= 1.0) return d * 10.0;     // probability
        if (d <= 10.0) return d;           // already on 0..10
        if (d <= 100.0) return d / 10.0;   // percentage
        return Math.max(0.0, Math.min(10.0, d / 10.0)); // clamp
    }

    // Safely convert various value types to Double (supports Number, numeric Strings, and percentages like "87%").
    private Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof String s) {
            String t = s.trim();
            if (t.isEmpty()) return null;
            // Handle percentages like "87%" explicitly
            if (t.endsWith("%")) {
                try {
                    String pct = t.substring(0, t.length() - 1).trim();
                    return Double.parseDouble(pct);
                } catch (NumberFormatException ignored) {
                    // fallthrough to generic parse
                }
            }
            // Remove common non-numeric decorations while keeping signs, decimals, and exponent
            String cleaned = t.replaceAll("[^0-9eE+\\-\\.]", "");
            if (cleaned.isEmpty() || cleaned.equals("+") || cleaned.equals("-") || cleaned.equals("."))
                return null;
            try {
                return Double.parseDouble(cleaned);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    // Compute an average score (0..10) from a flexible AI result JSON by collecting score-like fields.
    private Double computeAverageScoreFromAiResult(String aiResultJson) {
        if (isBlank(aiResultJson)) return null;
        try {
            Map<String, Object> root = json.readValue(aiResultJson, Map.class);
            java.util.List<Double> rawScores = new java.util.ArrayList<>();
            collectScores(root, rawScores, 0);
            if (rawScores.isEmpty()) return null;
            double sum = 0.0;
            for (Double d : rawScores) {
                if (d == null) continue;
                sum += normalizeToTen(d);
            }
            double avg = sum / rawScores.size();
            return Math.round(avg * 100.0) / 100.0;
        } catch (Exception ignored) {
            return null;
        }
    }

    // Recursively traverse JSON-like structures and collect score-like numeric values.
    @SuppressWarnings("unchecked")
    private void collectScores(Object node, java.util.List<Double> out, int depth) {
        if (node == null || depth > 6) return;

        if (node instanceof Map<?, ?> map) {
            // If this map has typical score fields, prefer them
            Object s1 = map.get("score");
            Object s2 = map.get("confidence");
            Object s3 = map.get("cv_score");
            Object s4 = map.get("fit");
            Object s5 = map.get("project_fit");
            Double v = toDouble(s1);
            if (v == null) v = toDouble(s2);
            if (v == null) v = toDouble(s3);
            if (v == null) v = toDouble(s4);
            if (v == null) v = toDouble(s5);
            if (v != null) out.add(v);

            // Recurse into values
            for (Object value : map.values()) {
                if (value != null) collectScores(value, out, depth + 1);
            }
            return;
        }

        if (node instanceof Iterable<?> it) {
            for (Object item : it) {
                collectScores(item, out, depth + 1);
            }
            return;
        }

        // Standalone primitive/string number
        Double v = toDouble(node);
        if (v != null) out.add(v);
    }

    /**
     * GET /cv/project-fits
     * Returns aggregated project fit types from all candidates' latest parsed CVs.
     * Used for the Project Fit Types pie chart on the dashboard.
     * 
     * Response: [
     *   { "type": "Frontend Development", "value": 15 },
     *   { "type": "Backend Development", "value": 12 },
     *   { "type": "Mobile Development", "value": 8 }
     * ]
     */
    @GetMapping("/project-fits")
    public ResponseEntity<?> getProjectFits(
            @RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 1000));
            
            System.out.println("=== PROJECT FITS DEBUG ===");
            System.out.println("Fetching latest parsed CVs for up to " + top + " candidates");
            
            // Get latest parsed CV per candidate
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.ResumeResult, cpc.ReceivedAt,
                         ROW_NUMBER() OVER (PARTITION BY cpc.CandidateId ORDER BY cpc.ReceivedAt DESC) rn
                  FROM dbo.CandidateParsedCv cpc
                )
                SELECT TOP %d
                       l.CandidateId, l.ResumeResult
                FROM latest l
                WHERE l.rn = 1
                ORDER BY l.ReceivedAt DESC
            """.formatted(top);

            var rows = jdbc.query(sql, (rs, rowNum) -> {
                return rs.getString("ResumeResult");
            });

            System.out.println("Processing " + rows.size() + " candidates for project types");

            // Count project types
            Map<String, Integer> projectTypeCounts = new HashMap<>();
            int processed = 0;
            int found = 0;
            
            for (String resumeJson : rows) {
                processed++;
                String projectType = extractProjectTypeFromResume(resumeJson);
                
                if (projectType != null && !projectType.trim().isEmpty()) {
                    String normalized = projectType.trim();
                    projectTypeCounts.merge(normalized, 1, Integer::sum);
                    found++;
                    if (found <= 10) { // Log first 10 for debugging
                        System.out.println("Candidate " + processed + ": Found project type: " + normalized);
                    }
                }
            }

            System.out.println("Summary: Processed " + processed + " candidates, found " + found + " project types");
            System.out.println("Unique project types: " + projectTypeCounts.size());
            projectTypeCounts.forEach((type, count) -> 
                System.out.println("  - " + type + ": " + count)
            );

            // Convert to list format for frontend
            List<Map<String, Object>> result = projectTypeCounts.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue())) // Sort by count descending
                .map(entry -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("type", entry.getKey());
                    item.put("value", entry.getValue());
                    return item;
                })
                .collect(java.util.stream.Collectors.toList());

            // If no data found, return placeholder
            if (result.isEmpty()) {
                System.out.println("No project types found, returning placeholder");
                result = List.of(Map.of("type", "No Data", "value", 1));
            }

            return ResponseEntity.ok(result);
            
        } catch (Exception ex) {
            System.err.println("Failed to get project fits: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500)
                .body(createErrorResponse("Failed to get project fits: " + ex.getMessage()));
        }
    }

    @GetMapping("/{identifier}/phone")
    public ResponseEntity<?> getCandidatePhone(@PathVariable("identifier") String identifier) {
        System.out.println("=== PHONE ENDPOINT DEBUG ===");
        System.out.println("Identifier: " + identifier);
        
        try {
            Long candidateId = null;
            String email = null;
            
            // Parse identifier as ID or email
            try {
                candidateId = Long.parseLong(identifier);
                System.out.println("Parsed as candidate ID: " + candidateId);
            } catch (NumberFormatException ignored) {
                email = identifier;
                System.out.println("Parsed as email: " + email);
            }

            // First, check if candidate exists
            String candidateCheckSql;
            Object[] candidateCheckParams;
            
            if (candidateId != null) {
                candidateCheckSql = "SELECT Id, FirstName, LastName, Email FROM dbo.Candidates WHERE Id = ?";
                candidateCheckParams = new Object[]{candidateId};
            } else {
                candidateCheckSql = "SELECT Id, FirstName, LastName, Email FROM dbo.Candidates WHERE Email = ?";
                candidateCheckParams = new Object[]{email};
            }

            var candidateRows = jdbc.query(candidateCheckSql, candidateCheckParams, (rs, i) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", rs.getLong("Id"));
                row.put("firstName", rs.getString("FirstName"));
                row.put("lastName", rs.getString("LastName"));
                row.put("email", rs.getString("Email"));
                return row;
            });

            if (candidateRows.isEmpty()) {
                System.out.println("No candidate found for identifier: " + identifier);
                return ResponseEntity.status(404)
                    .body(Map.of(
                        "status", "error",
                        "message", "Candidate not found",
                        "identifier", identifier,
                        "detail", "No candidate exists with ID or email: " + identifier
                    ));
            }

            Map<String, Object> candidateInfo = candidateRows.get(0);
            long foundCandidateId = (Long) candidateInfo.get("id");
            String firstName = (String) candidateInfo.get("firstName");
            String lastName = (String) candidateInfo.get("lastName");
            String candidateEmail = (String) candidateInfo.get("email");

            System.out.println("Found candidate: " + foundCandidateId + " - " + firstName + " " + lastName);

            // Now try to get phone from latest parsed CV
            String parsedCvSql = """
                SELECT TOP 1 ResumeResult, ReceivedAt
                FROM dbo.CandidateParsedCv
                WHERE CandidateId = ?
                ORDER BY ReceivedAt DESC
            """;

            var parsedCvRows = jdbc.query(parsedCvSql, new Object[]{foundCandidateId}, (rs, i) -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("resumeResult", rs.getString("ResumeResult"));
                row.put("receivedAt", rs.getTimestamp("ReceivedAt"));
                return row;
            });

            String phone = null;
            String source = "not_found";
            String receivedAt = null;

            if (!parsedCvRows.isEmpty()) {
                Map<String, Object> parsedCv = parsedCvRows.get(0);
                String resumeJson = (String) parsedCv.get("resumeResult");
                Timestamp ts = (Timestamp) parsedCv.get("receivedAt");
                receivedAt = ts != null ? ts.toInstant().toString() : null;

                System.out.println("Found parsed CV, length: " + (resumeJson != null ? resumeJson.length() : 0));

                try {
                    phone = extractPhoneFromResume(resumeJson);
                    if (phone != null && !phone.trim().isEmpty()) {
                        source = "resume";
                        System.out.println("Phone from resume: " + phone);
                    } else {
                        System.out.println("No phone found in resume JSON");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to extract phone from resume: " + e.getMessage());
                    e.printStackTrace();
                }
            } else {
                System.out.println("No parsed CV found for candidate " + foundCandidateId);
            }

            // Build response
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("candidateId", foundCandidateId);
            response.put("firstName", firstName);
            response.put("lastName", lastName);
            response.put("email", candidateEmail);
            response.put("phone", phone);
            response.put("source", source);
            response.put("receivedAt", receivedAt);

            System.out.println("Returning phone data successfully");
            return ResponseEntity.ok(response);
            
        } catch (Exception ex) {
            System.err.println("=== PHONE ENDPOINT ERROR ===");
            System.err.println("Error type: " + ex.getClass().getName());
            System.err.println("Error message: " + ex.getMessage());
            ex.printStackTrace();
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("message", "Failed to get phone number");
            errorResponse.put("detail", ex.getMessage());
            errorResponse.put("identifier", identifier);
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    // Extract phone from ResumeResult JSON with regex fallback and sanitization
    @SuppressWarnings("unchecked")
    private String extractPhoneFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return null;
        try {
            Map<String, Object> root = json.readValue(resumeJson, Map.class);

            String phone = findPhoneInMap(root, 0);
            if (!isBlank(phone)) return sanitizePhone(phone);

            Object result = root.get("result");
            if (result instanceof Map<?, ?>) {
                phone = findPhoneInMap((Map<String, Object>) result, 0);
                if (!isBlank(phone)) return sanitizePhone(phone);
            }

            // Fallback to regex over the entire JSON string
            String viaRegex = findPhoneByRegex(resumeJson);
            return sanitizePhone(viaRegex);
        } catch (Exception e) {
            // Fallback to regex if JSON parsing fails
            String viaRegex = findPhoneByRegex(resumeJson);
            return sanitizePhone(viaRegex);
        }
    }

    private String findPhoneByRegex(String text) {
        if (isBlank(text)) return null;
        // Prefer label-based match like "phone: +1 234 567 890"
        java.util.regex.Pattern labeled = java.util.regex.Pattern.compile("(?i)(?:phone|mobile|tel(?:ephone)?|contact|cell)\\s*[:\\-]?\\s*([+()\\d][\\d\\s().\\-]{6,})");
        java.util.regex.Matcher m = labeled.matcher(text);
        if (m.find()) {
            String g = m.group(1);
            if (!isBlank(g)) return g.trim();
        }
        // Generic phone-like number
        java.util.regex.Pattern generic = java.util.regex.Pattern.compile("([+]?\\d[\\d\\s().\\-]{7,}\\d)");
        m = generic.matcher(text);
        if (m.find()) return m.group(1).trim();
        return null;
    }

    @SuppressWarnings("unchecked")
    private String findPhoneInMap(Map<String, Object> map, int depth) {
        if (map == null || depth > 4) return null;

        // Common phone keys
        String[] keys = {
            "phone","phone_number","phoneNumber","mobile","mobile_number","mobileNumber",
            "contact_number","contactNumber","tel","telephone","cell","cellphone"
        };
        for (String k : keys) {
            Object v = map.get(k);
            if (v instanceof String s && !isBlank(s)) return s;
            if (v instanceof Number n) return String.valueOf(n);
        }

        // Common containers where phone may reside
        String[] containers = { "personalInfo","personal_info","contact","contacts","profile","meta" };
        for (String c : containers) {
            Object obj = map.get(c);
            if (obj instanceof Map<?, ?> m) {
                String s = findPhoneInMap((Map<String, Object>) m, depth + 1);
                if (!isBlank(s)) return s;
            } else if (obj instanceof java.util.List<?> list) {
                for (Object item : list) {
                    if (item instanceof Map<?, ?> m) {
                        String s = findPhoneInMap((Map<String, Object>) m, depth + 1);
                        if (!isBlank(s)) return s;
                    } else if (item instanceof String s) {
                        String viaRegex = findPhoneByRegex(s);
                        if (!isBlank(viaRegex)) return viaRegex;
                    }
                }
            }
        }

        // Sections may contain contact info too
        Object sections = map.get("sections");
        if (sections instanceof Map<?, ?> m) {
            String s = findPhoneInMap((Map<String, Object>) m, depth + 1);
            if (!isBlank(s)) return s;
        }

        return null;
    }

    private String sanitizePhone(String s) {
        if (isBlank(s)) return null;

        String trimmed = s.replace('\u00A0', ' ').trim();

        // If multiple numbers present, choose the first phone-like token
        String primary = findPhoneByRegex(trimmed);
        if (!isBlank(primary)) trimmed = primary;

        // Keep leading '+' and digits only
        String digits = trimmed.replaceAll("[^+\\d]", "");
        if (digits.startsWith("00")) digits = "+" + digits.substring(2);

        String onlyDigits = digits.startsWith("+") ? digits.substring(1) : digits;
        if (onlyDigits.length() < 7) return null;

        return digits;
    }

    @GetMapping("/{identifier}/parsed")
    public ResponseEntity<?> getParsedSections(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { email = identifier; }
    
            String sql;
            Object[] params;
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 cpc.ResumeResult
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 cpc.ResumeResult
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv cpc ON cpc.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY cpc.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }
    
            List<String> rows = jdbc.query(sql, params, (rs, i) -> rs.getString("ResumeResult"));
            if (rows.isEmpty() || isBlank(rows.get(0))) {
                return ResponseEntity.status(404).body(Map.of("message", "Parsed resume not found for: " + identifier));
            }
    
            String resumeJson = rows.get(0);
    
            Map<String, Object> out = new LinkedHashMap<>();
            // summary: reuse existing robust summary extractor
            String summary = extractResumeSummary(resumeJson, null, null, null);
            out.put("summary", summary);
    
            // education, experience, projects
            List<String> education = extractEducationFromResume(resumeJson);
            List<String> experience = extractExperienceFromResume(resumeJson);
            List<String> projects = extractProjectsFromResume(resumeJson);
    
            out.put("education", education);
            out.put("experience", experience);
            out.put("projects", projects);
    
            return ResponseEntity.ok(out);
        } catch (Exception ex) {
            System.err.println("Failed to load parsed sections: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500).body(createErrorResponse("Failed to load parsed sections: " + ex.getMessage()));
        }
    }
    
    // --- helpers for parsed-fields endpoint ---
    @SuppressWarnings("unchecked")
    private List<String> extractEducationFromResume(String resumeJson) {
        if (isBlank(resumeJson)) return java.util.Collections.emptyList();
        try {
            Map<String,Object> root = parseJsonToMap(resumeJson);
            if (root == null) return java.util.Collections.emptyList();
    
            // common locations
            Object ed = firstNonNull(root.get("education"),
                                         (root.get("result") instanceof Map<?,?> r) ? ((Map<?,?>) r).get("education") : null,
                                         (root.get("sections") instanceof Map<?,?> s) ? ((Map<?,?>) s).get("education") : null,
                                         (root.get("sections") instanceof Map<?,?> s2) ? ((Map<?,?>) s2).get("educationDetails") : null);
                List<String> list = coerceToList(ed);
                if (list != null && !list.isEmpty()) return list;
    
                // fallback: try scanning 'sections' for education-like keys and return text blobs split
                Object sections = firstNonNull(root.get("sections"), (root.get("result") instanceof Map<?,?> r) ? ((Map<?,?>) r).get("sections") : null);
                if (sections instanceof Map<?,?> sec) {
                    Object maybe = firstNonNull(sec.get("education"), sec.get("education_history"), sec.get("educationDetails"));
                    list = coerceToList(maybe);
                    if (list != null && !list.isEmpty()) return list;
                }
    
                // last resort: search for typical education lines inside resumeJson string (simple regex)
                java.util.List<String> found = new java.util.ArrayList<>();
                java.util.regex.Pattern p = java.util.regex.Pattern.compile("(?im)(bachelor|bsc|ba|msc|master|phd|degree|university|college)[^\\n]{0,120}");
                java.util.regex.Matcher m = p.matcher(resumeJson);
                while (m.find() && found.size() < 10) {
                    found.add(normalizeSpaces(m.group()).trim());
                }
                return found;
            } catch (Exception e) {
                return java.util.Collections.emptyList();
            }
        }
    
        @SuppressWarnings("unchecked")
        private List<String> extractProjectsFromResume(String resumeJson) {
            if (isBlank(resumeJson)) return java.util.Collections.emptyList();
            try {
                Map<String,Object> root = parseJsonToMap(resumeJson);
                if (root == null) return java.util.Collections.emptyList();
    
                Object proj = firstNonNull(root.get("projects"),
                                           (root.get("result") instanceof Map<?,?> r) ? ((Map<?,?>) r).get("projects") : null,
                                           (root.get("sections") instanceof Map<?,?> s) ? ((Map<?,?>) s).get("projects") : null,
                                           root.get("project"));
                List<String> list = coerceToList(proj);
                if (list != null && !list.isEmpty()) return list;
    
                // try nested result.sections.projects text
                Object sections = firstNonNull(root.get("sections"), (root.get("result") instanceof Map<?,?> r) ? ((Map<?,?>) r).get("sections") : null);
                if (sections instanceof Map<?,?> sec) {
                    Object maybe = firstNonNull(sec.get("projects"), sec.get("project_list"), sec.get("selectedProjects"));
                    list = coerceToList(maybe);
                    if (list != null && !list.isEmpty()) return list;
                }
    
                // fallback: extract bullet-like project lines from resumeJson
                java.util.List<String> found = new java.util.ArrayList<>();
                java.util.regex.Pattern p = java.util.regex.Pattern.compile("(?m)^\\s*[-•\\*]\\s*(.{10,200})$");
                java.util.regex.Matcher m = p.matcher(resumeJson);
                while (m.find() && found.size() < 20) {
                    found.add(normalizeSpaces(m.group(1)).trim());
                }
                if (!found.isEmpty()) return found;
    
                // final fallback: try sentences containing "project" keyword
                found.clear();
                java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("(?im)([^\\.\\n]{20,200}project[^\\.\\n]{0,200})");
                java.util.regex.Matcher m2 = p2.matcher(resumeJson);
                while (m2.find() && found.size() < 10) {
                    found.add(normalizeSpaces(m2.group()).trim());
                }
                return found;
            } catch (Exception e) {
                return java.util.Collections.emptyList();
            }
        }

    @PutMapping(value = "/{identifier}/parsed", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateParsedSections(
            @PathVariable("identifier") String identifier,
            @RequestBody Map<String, Object> payload) {
        try {
            // resolve candidate id (numeric id or email)
            Long candidateId = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { /* treat as email below */ }

            if (candidateId == null) {
                // lookup by email
                List<Long> ids = jdbc.query("SELECT Id FROM dbo.Candidates WHERE Email = ?", new Object[]{identifier},
                        (rs, rowNum) -> rs.getLong("Id"));
                if (ids.isEmpty()) {
                    return ResponseEntity.status(404).body(Map.of("message", "Candidate not found for identifier: " + identifier));
                }
                candidateId = ids.get(0);
            }

            // fetch latest parsed row for this candidate
            String selectSql = """
                SELECT TOP 1 Id, ResumeResult
                FROM dbo.CandidateParsedCv
                WHERE CandidateId = ?
                ORDER BY ReceivedAt DESC
            """;
            List<Map<String,Object>> rows = jdbc.query(selectSql, new Object[]{candidateId}, (rs, i) -> {
                Map<String,Object> r = new LinkedHashMap<>();
                r.put("id", rs.getLong("Id"));
                r.put("resume", rs.getString("ResumeResult"));
                return r;
            });

            if (rows.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "No parsed CV found for candidate: " + candidateId));
            }

            long parsedId = (Long) rows.get(0).get("id");
            String resumeJson = (String) rows.get(0).get("resume");

            // parse existing resume JSON (or create empty root)
            Map<String,Object> root = parseJsonToMap(resumeJson);
            if (root == null) root = new LinkedHashMap<>();

            // ensure result and sections maps exist
            final Map<String,Object> resultNode;
            Object resultObj = root.get("result");
            if (resultObj instanceof Map<?,?> m) {
                resultNode = (Map<String,Object>) m;
            } else {
                resultNode = new LinkedHashMap<>();
                root.put("result", resultNode);
            }

            final Map<String,Object> sectionsNode;
            Object sectionsObj = resultNode.get("sections");
            if (sectionsObj instanceof Map<?,?> s) {
                sectionsNode = (Map<String,Object>) s;
            } else {
                sectionsNode = new LinkedHashMap<>();
                resultNode.put("sections", sectionsNode);
            }

            // Helper to apply a field which may be string or list
            java.util.function.BiConsumer<String, Object> applyField = (field, value) -> {
                if (value == null) return;
                if (value instanceof java.util.List) {
                    sectionsNode.put(field, value);
                    // also update result-level top key for backwards compatibility
                    resultNode.put(field, value);
                } else if (value instanceof String) {
                    String s = ((String) value).trim();
                    // keep multiline strings as-is, but also expose as list for UI that expects list
                    if (s.contains("\n")) {
                        List<String> lines = Arrays.stream(s.split("\\r?\\n"))
                                                   .map(String::trim)
                                                   .filter(t -> !t.isEmpty())
                                                   .toList();
                        sectionsNode.put(field, lines);
                        resultNode.put(field, lines);
                    } else {
                        sectionsNode.put(field, s);
                        resultNode.put(field, s);
                    }
                } else {
                    // other types: serialize as-is
                    sectionsNode.put(field, value);
                    resultNode.put(field, value);
                }
            };

            // Patch fields from payload
            applyField.accept("education", payload.get("education"));
            applyField.accept("experience", payload.get("experience"));
            applyField.accept("projects", payload.get("projects"));

            // optional: update top-level summary if provided
            if (payload.containsKey("summary")) {
                Object summ = payload.get("summary");
                if (summ != null) {
                    if (summ instanceof String) {
                        String s = ((String) summ).trim();
                        root.put("summary", s);
                        resultNode.put("summary", s);
                    } else {
                        String s = json.writeValueAsString(summ);
                        root.put("summary", s);
                        resultNode.put("summary", s);
                    }
                }
            }

            // persist updated ResumeResult back to DB (update the existing parsed row)
            String updatedJson = json.writeValueAsString(root);

            String updateSql = "UPDATE dbo.CandidateParsedCv SET ResumeResult = ? WHERE Id = ?";
            int updated = jdbc.update(updateSql, updatedJson, parsedId);

            if (updated <= 0) {
                return ResponseEntity.status(500).body(Map.of("message", "Failed to update parsed CV row"));
            }

            return ResponseEntity.ok(Map.of(
                "status", "ok",
                "candidateId", candidateId,
                "parsedRowId", parsedId,
                "updatedFields", List.of("summary","education","experience","projects")
            ));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(createErrorResponse("Failed to update parsed sections: " + ex.getMessage()));
        }
    }

    @DeleteMapping("/{identifier}")
    public ResponseEntity<?> deleteCandidate(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            try { 
                candidateId = Long.parseLong(identifier); 
            } catch (NumberFormatException ignored) {
                // lookup by email
                List<Long> ids = jdbc.query(
                    "SELECT Id FROM dbo.Candidates WHERE Email = ?", 
                    new Object[]{identifier},
                    (rs, rowNum) -> rs.getLong("Id")
                );
                if (ids.isEmpty()) {
                    return ResponseEntity.status(404).body(Map.of("message", "Candidate not found: " + identifier));
                }
                candidateId = ids.get(0);
            }

            // delete dependent parsed rows first
            int parsedDeleted = jdbc.update("DELETE FROM dbo.CandidateParsedCv WHERE CandidateId = ?", candidateId);

            // delete candidate row
            int candidateDeleted = jdbc.update("DELETE FROM dbo.Candidates WHERE Id = ?", candidateId);

            if (candidateDeleted <= 0) {
                return ResponseEntity.status(404).body(Map.of("message", "Candidate not found or already deleted: " + candidateId));
            }

            Map<String,Object> resp = new LinkedHashMap<>();
            resp.put("status", "ok");
            resp.put("candidateId", candidateId);
            resp.put("deletedCandidateRows", candidateDeleted);
            resp.put("deletedParsedRows", parsedDeleted);
            return ResponseEntity.ok(resp);
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body(createErrorResponse("Failed to delete candidate: " + ex.getMessage()));
        }
    }

    @GetMapping(value = "/{identifier}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> getCandidatePdf(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            try {
                candidateId = Long.parseLong(identifier);
            } catch (NumberFormatException ignored) {
                List<Long> ids = jdbc.query(
                        "SELECT Id FROM dbo.Candidates WHERE Email = ?",
                        new Object[]{identifier},
                        (rs, rowNum) -> rs.getLong("Id"));
                if (ids.isEmpty()) {
                    return ResponseEntity.status(404)
                            .body(Map.of("message", "Candidate not found: " + identifier));
                }
                candidateId = ids.get(0);
            }

            String sql = """
                SELECT TOP 1 PdfData, FileUrl, ReceivedAt
                FROM dbo.CandidateParsedCv
                WHERE CandidateId = ?
                ORDER BY ReceivedAt DESC
            """;

            List<Map<String, Object>> rows = jdbc.query(sql, new Object[]{candidateId}, (rs, i) -> {
                Map<String, Object> row = new HashMap<>();
                row.put("pdf", rs.getBytes("PdfData"));
                row.put("fileUrl", rs.getString("FileUrl"));
                row.put("receivedAt", rs.getTimestamp("ReceivedAt"));
                return row;
            });

            if (rows.isEmpty() || rows.get(0).get("pdf") == null) {
                return ResponseEntity.status(404)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("message", "No PDF stored for candidate: " + identifier));
            }
            byte[] pdfBytes = (byte[]) rows.get(0).get("pdf");
            String filename = Optional.ofNullable((String) rows.get(0).get("fileUrl"))
                    .map(CVController::lastSegment)
                    .orElse("CandidateCV.pdf");

            ByteArrayResource resource = new ByteArrayResource(pdfBytes);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .contentLength(pdfBytes.length)
                    .body(resource);

        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(createErrorResponse("Failed to load candidate PDF: " + ex.getMessage()));
        }
    }
}


