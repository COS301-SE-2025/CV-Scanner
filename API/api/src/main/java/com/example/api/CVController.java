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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpClient;

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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
@CrossOrigin(origins = "*")
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
            if (body == null || body.candidate == null || isBlank(body.candidate.email)) {
                return ResponseEntity.badRequest().body(createErrorResponse("Missing candidate/email"));
            }

            long candidateId = upsertCandidate(body.candidate);
            Instant when = parseInstantOrNow(body.receivedAt);

            // Serialize JSON blobs still kept
            String aiResultJson = toJson(body.aiResult);
            String rawJson = toJson(body.raw);
            String normalizedJson = toJson(body.normalized);

            // Build ResumeResult JSON (preferred full parsed resume if supplied)
            String resumeJson;
            try {
                if (body.resume != null) {
                    // Use provided resume object verbatim
                    resumeJson = json.writeValueAsString(body.resume);
                } else {
                    // Construct a composite JSON from individual fields
                    Map<String,Object> root = new HashMap<>();
                    if (!isBlank(body.summary)) root.put("summary", body.summary);
                    if (body.personalInfo != null) root.put("personal_info", body.personalInfo);
                    if (body.sections != null) root.put("sections", body.sections);
                    if (body.skills != null && !body.skills.isEmpty()) root.put("skills", body.skills);
                    // Keep raw fallback structure recognizable
                    root.put("source", "composite");
                    resumeJson = json.writeValueAsString(root);
                }
            } catch (Exception e) {
                resumeJson = null;
            }

            // INSERT only existing columns
            final String sql = "INSERT INTO dbo.CandidateParsedCv " +
                    "(CandidateId, FileUrl, AiResult, Normalized, ResumeResult, ReceivedAt, RawResult) " +
                    "VALUES (?,?,?,?,?,?,?)";

            jdbc.update(sql,
                candidateId,
                body.fileUrl,
                aiResultJson,
                normalizedJson,
                resumeJson,
                Timestamp.from(when),
                rawJson
            );

            return ResponseEntity.ok(Map.of("status","ok","candidateId", candidateId));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to save parsed CV: " + ex.getMessage()));
        }
    }
    @PostMapping("/proxy-ai")
    public ResponseEntity<String> proxyToAi(@RequestBody ProxyRequest request) {
        System.out.println("Received proxy-ai POST");
        try {
            // Validate request
            if (request == null || request.getTargetUrl() == null) {
                return ResponseEntity.badRequest().body("{\"error\": \"Missing targetUrl\"}");
            }

            // Build the full URL to the AI server
            String targetUrl = request.getTargetUrl();
            if (!targetUrl.startsWith("http")) {
                targetUrl = "http://localhost:5000" + (targetUrl.startsWith("/") ? targetUrl : "/" + targetUrl);
            }

            // Create HTTP client
            HttpClient client = HttpClient.newHttpClient();
            
            // Build request to AI server
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                .uri(URI.create(targetUrl))
                .method(request.getMethod(), getBodyPublisher(request));

            // Add headers
            if (request.isFormData() && request.getBody() != null) {
                // Handle FormData - convert base64 back to file
                byte[] fileBytes = java.util.Base64.getDecoder().decode(request.getBody());
                requestBuilder.header("Content-Type", "multipart/form-data");
                HttpRequest.BodyPublisher bodyPublisher = HttpRequest.BodyPublishers.ofByteArray(fileBytes);
                requestBuilder.method(request.getMethod(), bodyPublisher);
            } else if (request.getBody() != null && !request.getBody().isEmpty()) {
                requestBuilder.header("Content-Type", "application/json");
                HttpRequest.BodyPublisher bodyPublisher = HttpRequest.BodyPublishers.ofString(request.getBody());
                requestBuilder.method(request.getMethod(), bodyPublisher);
            } else {
                requestBuilder.method(request.getMethod(), HttpRequest.BodyPublishers.noBody());
            }

            // Execute request
            HttpResponse<String> response = client.send(
                requestBuilder.build(),
                HttpResponse.BodyHandlers.ofString()
            );
            
            // Return the AI server's response
            return ResponseEntity.status(response.statusCode())
                .contentType(MediaType.APPLICATION_JSON)
                .body(response.body());
                
        } catch (Exception e) {
            System.err.println("Proxy error: " + e.getMessage());
            return ResponseEntity.status(500)
                .body("{\"error\": \"Proxy failed: " + e.getMessage() + "\"}");
        }
    }

    private HttpRequest.BodyPublisher getBodyPublisher(ProxyRequest request) {
        if (request.getBody() == null || request.getBody().isEmpty()) {
            return HttpRequest.BodyPublishers.noBody();
        }
        return HttpRequest.BodyPublishers.ofString(request.getBody());
    }

    // Add this inner class for the proxy request
    public static class ProxyRequest {
        private String targetUrl;
        private String method = "POST";
        private String body;
        private boolean isFormData;

        // getters and setters
        public String getTargetUrl() { return targetUrl; }
        public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }
        
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
        
        public String getBody() { return body; }
        public void setBody(String body) { this.body = body; }
        
        public boolean isFormData() { return isFormData; }
        public void setFormData(boolean formData) { isFormData = formData; }
    }
    @GetMapping("/proxy-ai")
    public ResponseEntity<String> testProxyAi() {
        return ResponseEntity.ok("Proxy AI GET works");
    }
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

        // Parsed resume full JSON (from /parse_resume)
        public Object resume; // NEW
        // Optional parsed fields (if you also send them separately)
        public String filename;
        public String summary;
        public Map<String, Object> personalInfo;
        public Map<String, Object> sections;
        public java.util.List<String> skills;
        public String status;
        public Object result; // some UIs wrap parsed output under "result"
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
                String normalized = rs.getString("Normalized");
                String aiResult = rs.getString("AiResult");
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

    // Helper: coerce arbitrary object (Number/String) to Double or null
    private Double toDouble(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) {
            double d = n.doubleValue();
            return Double.isFinite(d) ? d : null;
        }
        if (v instanceof String s) {
            s = s.trim();
            if (s.isEmpty()) return null;
            // Try stripping a trailing % (treat as 0-1 if percentage, e.g. 85% -> 0.85)
            if (s.endsWith("%")) {
                try {
                    double pct = Double.parseDouble(s.substring(0, s.length() - 1).trim());
                    return pct / 100.0;
                } catch (NumberFormatException ignored) { }
            }
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    // Computes average score (0..10) from AiResult JSON. Returns null if no numeric scores found.
    private Double computeAverageScoreFromAiResult(String aiResultJson) {
        try {
            Map<String, Object> root = parseJsonToMap(aiResultJson);
            if (root == null) return null;

            Object rawObj = root.get("raw");
            Map<String, Object> raw = null;
            if (rawObj instanceof Map) raw = (Map<String, Object>) rawObj;
            else if (rawObj instanceof String) {
                try { raw = json.readValue((String) rawObj, Map.class); } catch (Exception ignored) {}
            } else {
                // also support case where top-level keys are categories (raw absent)
                raw = root;
            }

            if (raw == null || raw.isEmpty()) return null;

            List<Double> collected = new ArrayList<>();
            for (Object v : raw.values()) {
                if (v == null) continue;
                if (v instanceof Map<?, ?> info) {
                    // Prefer explicit "scores" array
                    Object scoresObj = info.get("scores");
                    if (scoresObj instanceof java.util.List<?> scoresList && !scoresList.isEmpty()) {
                        Object first = scoresList.get(0);
                        Double d = toDouble(first);
                        if (d != null) { collected.add(d); continue; }
                    }
                    // Fallback: top_k list of {label,score}
                    Object topkObj = info.get("top_k");
                    if (topkObj instanceof java.util.List<?> topkList && !topkList.isEmpty()) {
                        Object first = topkList.get(0);
                        if (first instanceof Map<?,?> m && m.get("score") != null) {
                            Double d = toDouble(m.get("score"));
                            if (d != null) { collected.add(d); continue; }
                        }
                    }
                    // Fallback: try any numeric value inside info
                    for (Object inner : ((Map<?,?>) info).values()) {
                        Double d = toDouble(inner);
                        if (d != null) { collected.add(d); break; }
                    }
                } else if (v instanceof java.util.List<?> list) {
                    // If raw category directly a list of scores or top_k objects
                    Object first = list.isEmpty() ? null : list.get(0);
                    Double d = toDouble(first);
                    if (d != null) { collected.add(d); continue; }
                    if (first instanceof Map<?,?> m && m.get("score") != null) {
                        Double d2 = toDouble(m.get("score"));
                        if (d2 != null) { collected.add(d2); continue; }
                    }
                } else {
                    Double d = toDouble(v);
                    if (d != null) collected.add(d);
                }
            }

            if (collected.isEmpty()) return null;

            double mean = collected.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double scaled = mean * 10.0;
            // round to 2 decimals
            return Math.round(scaled * 100.0) / 100.0;
        } catch (Exception e) {
            return null;
        }
    }

    // ---------- New: project-fit extraction ----------
    @SuppressWarnings("unchecked")
    private Map<String, Object> extractProjectFitFromAiResult(String aiResultJson) {
        if (isBlank(aiResultJson)) return null;
        try {
            Map<String, Object> root = parseJsonToMap(aiResultJson);
            if (root == null) return null;

            // 1) top-level best_fit_project_type
            Object b = root.get("best_fit_project_type");
            if (b instanceof Map<?, ?> bm) {
                Map<String, Object> out = new HashMap<>();
                Object type = ((Map<?, ?>) bm).get("type");
                Object confidence = ((Map<?, ?>) bm).get("confidence");
                Object basis = ((Map<?, ?>) bm).get("basis");
                if (type != null) out.put("type", String.valueOf(type));
                if (confidence != null) out.put("confidence", toDouble(confidence));
                if (basis != null) out.put("basis", basis);
                return out;
            }

            // 2) maybe nested under "result" or "applied"
            Object result = root.get("result");
            if (result instanceof Map<?, ?> rm) {
                Object rf = ((Map<?, ?>) rm).get("best_fit_project_type");
                if (rf instanceof Map<?, ?> rfm) {
                    Map<String, Object> out = new HashMap<>();
                    Object type = ((Map<?, ?>) rfm).get("type");
                    Object confidence = ((Map<?, ?>) rfm).get("confidence");
                    Object basis = ((Map<?, ?>) rfm).get("basis");
                    if (type != null) out.put("type", String.valueOf(type));
                    if (confidence != null) out.put("confidence", toDouble(confidence));
                    if (basis != null) out.put("basis", basis);
                    return out;
                }
            }

            // 3) fallback: look at ai.applied keys for heuristics (e.g., label presence)
            Object applied = root.get("applied");
            if (applied instanceof Map<?, ?> am) {
                // If applied contains a single strong label for project-type, return it
                Object project = ((Map<?, ?>) am).get("ProjectType");
                if (project instanceof String) {
                    return Map.of("type", project, "confidence", null, "basis", "applied.ProjectType");
                }
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }
    
    // ---------- New endpoint: single candidate project fit ----------
    @GetMapping("/{identifier}/project-fit")
    public ResponseEntity<?> getCandidateProjectFit(@PathVariable("identifier") String identifier) {
        try {
            Long candidateId = null;
            String email = null;
            try { candidateId = Long.parseLong(identifier); } catch (NumberFormatException ignored) { email = identifier; }

            String sql;
            Object[] params;
            if (candidateId != null) {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email, l.AiResult, l.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv l ON l.CandidateId = c.Id
                    WHERE c.Id = ?
                    ORDER BY l.ReceivedAt DESC
                """;
                params = new Object[]{candidateId};
            } else {
                sql = """
                    SELECT TOP 1 c.Id, c.FirstName, c.LastName, c.Email, l.AiResult, l.ReceivedAt
                    FROM dbo.Candidates c
                    LEFT JOIN dbo.CandidateParsedCv l ON l.CandidateId = c.Id
                    WHERE c.Email = ?
                    ORDER BY l.ReceivedAt DESC
                """;
                params = new Object[]{email};
            }

            var rows = jdbc.query(sql, params, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String mail = rs.getString("Email");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                Map<String, Object> fit = extractProjectFitFromAiResult(aiResult);
                Map<String, Object> out = new HashMap<>();
                Integer pct = projectFitPercentFromAi(aiResult);
                out.put("candidateId", id);
                out.put("firstName", first);
                out.put("lastName", last);
                out.put("email", mail);
                out.put("projectFit", fit);
                out.put("projectFitPercent", pct);
                out.put("projectFitLabel", pct != null ? ("Project Fit: " + pct + "%") : null);
                out.put("receivedAt", ts != null ? ts.toInstant().toString() : null);
                return out;
            });

            if (rows.isEmpty()) return ResponseEntity.status(404).body(Map.of("message","Candidate not found"));
            return ResponseEntity.ok(rows.get(0));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to load project fit: " + ex.getMessage()));
        }
    }

    // ---------- New endpoint: project fit for many candidates ----------
    @GetMapping("/project-fit")
    public ResponseEntity<?> listProjectFits(@RequestParam(value = "limit", required = false, defaultValue = "100") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 1000));
            String sql = """
                WITH latest AS (
                  SELECT cpc.CandidateId, cpc.AiResult, cpc.ReceivedAt,
                         ROW_NUMBER() OVER (PARTITION BY cpc.CandidateId ORDER BY cpc.ReceivedAt DESC) rn
                  FROM dbo.CandidateParsedCv cpc
                )
                SELECT TOP %d
                       c.Id, c.FirstName, c.LastName, c.Email, l.AiResult, l.ReceivedAt
                FROM dbo.Candidates c
                LEFT JOIN latest l ON l.CandidateId = c.Id AND l.rn = 1
                ORDER BY c.Id DESC
            """.formatted(top);

            var list = jdbc.query(sql, (rs, i) -> {
                long id = rs.getLong("Id");
                String first = rs.getString("FirstName");
                String last = rs.getString("LastName");
                String mail = rs.getString("Email");
                String aiResult = rs.getString("AiResult");
                Timestamp ts = rs.getTimestamp("ReceivedAt");
                Map<String, Object> fit = extractProjectFitFromAiResult(aiResult);
                Map<String, Object> out = new HashMap<>();
                Integer pct = projectFitPercentFromAi(aiResult);
                out.put("candidateId", id);
                out.put("firstName", first);
                out.put("lastName", last);
                out.put("email", mail);
                out.put("projectFit", fit);
                out.put("projectFitPercent", pct);
                out.put("projectFitLabel", pct != null ? ("Project Fit: " + pct + "%") : null);
                out.put("receivedAt", ts != null ? ts.toInstant().toString() : null);
                return out;
            });

            return ResponseEntity.ok(list);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(createErrorResponse("Failed to list project fits: " + ex.getMessage()));
        }
    }

    // Derive a project-fit percent from AI JSON. Prefer explicit best_fit_project_type.confidence,
    // fall back to computeAverageScoreFromAiResult() (0..10 -> percent).
    private Integer projectFitPercentFromAi(String aiResultJson) {
        try {
            if (isBlank(aiResultJson)) return null;
            Map<String,Object> root = parseJsonToMap(aiResultJson);
            if (root == null) return null;

            // 1) top-level best_fit_project_type.confidence
            Object b = root.get("best_fit_project_type");
            Double conf = null;
            if (b instanceof Map<?,?> bm) {
                conf = toDouble(((Map<?,?>) bm).get("confidence"));
            }
            // 2) fallback under result.best_fit_project_type.confidence
            if (conf == null && root.get("result") instanceof Map<?,?> rm) {
                Object rf = ((Map<?,?>) rm).get("best_fit_project_type");
                if (rf instanceof Map<?,?> rfm) conf = toDouble(((Map<?,?>) rfm).get("confidence"));
            }

            // If we have a confidence value, normalize to 0..100
            if (conf != null) {
                if (conf > 1.0 && conf <= 100.0) {
                    return (int) Math.round(conf); // already percent-like
                } else if (conf > 100.0) {
                    // improbable: clamp to 100
                    return 100;
                } else {
                    // 0..1 -> percent
                    return (int) Math.round(conf * 100.0);
                }
            }

            // 3) fallback: compute average score (0..10) and scale to percent
            Double avgOutOf10 = computeAverageScoreFromAiResult(aiResultJson);
            if (avgOutOf10 != null) {
                int pct = (int) Math.round(avgOutOf10 * 10.0);
                return Math.max(0, Math.min(100, pct));
            }

            return null;
        } catch (Exception e) {
            return null;
        }
    }

    @GetMapping("/skill-distribution")
    public ResponseEntity<?> skillDistribution(@RequestParam(value = "limit", required = false, defaultValue = "10") int limit) {
        try {
            int top = Math.max(1, Math.min(limit, 1000));

            // Latest parsed row per candidate
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
                String aiResult = rs.getString("AiResult");
                String normalized = rs.getString("Normalized");
                String resumeResult = rs.getString("ResumeResult");
                Map<String, String> out = new HashMap<>();
                out.put("ai", aiResult);
                out.put("normalized", normalized);
                out.put("resume", resumeResult);
                return out;
            });

            ObjectMapper mapper = new ObjectMapper();
            Map<String, Integer> counts = new HashMap<>();

            for (var row : rows) {
                String aiJson = row.get("ai");
                // Try to extract skill lists from ai JSON
                if (aiJson != null && !aiJson.isBlank()) {
                    try {
                        Map<String, Object> root = mapper.readValue(aiJson, new TypeReference<>() {});
                        // 1) applied.Skills (array)
                        Object applied = root.get("applied");
                        if (applied instanceof Map<?, ?> appliedMap) {
                            Object skillsObj = appliedMap.get("Skills");
                            if (skillsObj instanceof Iterable<?> skillsIter) {
                                for (Object s : skillsIter) {
                                    if (s != null) {
                                        String skill = String.valueOf(s).trim();
                                        if (!skill.isEmpty()) counts.merge(skill, 1, Integer::sum);
                                    }
                                }
                                continue; // prefer applied.Skills when present
                            }
                        }

                        // 2) raw.*.labels (look through raw categories)
                        Object raw = root.get("raw");
                        if (raw instanceof Map<?, ?> rawMap) {
                            for (Object v : rawMap.values()) {
                                if (v instanceof Map<?, ?> cat) {
                                    Object labels = cat.get("labels");
                                    if (labels instanceof Iterable<?> labIter) {
                                        for (Object s : labIter) {
                                            if (s != null) {
                                                String skill = String.valueOf(s).trim();
                                                if (!skill.isEmpty()) counts.merge(skill, 1, Integer::sum);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception ignore) {
                        // continue to other sources
                    }
                }

                // 3) fallback: normalized or resumeResult may be CSV/strings - try simple comma split
                String normalized = row.get("normalized");
                String resume = row.get("resume");
                String fallback = normalized != null && !normalized.isBlank() ? normalized : resume;
                if (fallback != null && !fallback.isBlank()) {
                    String[] parts = fallback.split("[,;\\n]");
                    for (String p : parts) {
                        String s = p.trim();
                        if (s.length() > 1 && s.length() < 60) {
                            counts.merge(s, 1, Integer::sum);
                        }
                    }
                }
            }

            // Convert counts -> sorted list of { name, value }
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
            return ResponseEntity.status(500).body(Map.of("error", "Failed to compute skill distribution: " + ex.getMessage()));
        }
    }
}


