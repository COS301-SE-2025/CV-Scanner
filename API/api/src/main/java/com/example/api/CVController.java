package com.example.api;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/cv")
@CrossOrigin(origins = "*") // Enable CORS for frontend access
public class CVController {
    
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
    

}