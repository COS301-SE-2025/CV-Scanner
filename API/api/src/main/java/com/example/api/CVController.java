package com.example.api;
import java.io.InputStream;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.apache.tika.Tika;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
    public ResponseEntity<byte[]> uploadAndConvertToTxt(@RequestParam("file") MultipartFile file) {
        try {
            String filename = file.getOriginalFilename();
            String text;
            if (filename != null && filename.endsWith(".docx")) {
               
                try (InputStream is = file.getInputStream();
                     XWPFDocument doc = new XWPFDocument(is)) {
                    StringBuilder sb = new StringBuilder();
                    for (XWPFParagraph p : doc.getParagraphs()) {
                        sb.append(p.getText()).append("\n");
                    }
                    for (XWPFTable table : doc.getTables()) {
                        for (XWPFTableRow row : table.getRows()) {
                            for (XWPFTableCell cell : row.getTableCells()) {
                                sb.append(cell.getText()).append("\t");
                            }
                            sb.append("\n");
                        }
                    }
                    text = sb.toString();
                }
            } else {

                Tika tika = new Tika();
                text = tika.parseToString(file.getInputStream());
            }
            byte[] txtBytes = text.getBytes();
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cv.txt")
                .contentType(MediaType.TEXT_PLAIN)
                .body(txtBytes);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(("Error: " + e.getMessage()).getBytes());
        }
    }
}