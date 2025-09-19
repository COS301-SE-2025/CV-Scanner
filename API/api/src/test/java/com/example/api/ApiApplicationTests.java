package com.example.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.stubbing.Answer;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// JUnit
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Mockito argument matchers
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;

// Mockito core
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import org.springframework.jdbc.core.RowMapper;
import java.sql.Timestamp;
import java.time.Instant;
import org.hamcrest.Matchers;

// Spring MVC test builders and matchers
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import org.springframework.jdbc.core.RowMapper;
import java.sql.Timestamp;
import java.time.Instant;
import org.hamcrest.Matchers;

@WebMvcTest({CVController.class, AuthController.class})
public class ApiApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private BCryptPasswordEncoder passwordEncoder;

    // --- Direct controller unit tests (moved from AuthControllerTest) ---

    private AuthController authController;

    @BeforeEach
    void setUp() {
        authController = new AuthController();
        authController.setJdbcTemplate(jdbcTemplate);
        authController.setPasswordEncoder(new BCryptPasswordEncoder());

        // Default stubs for MockMvc-auth paths that call encoder
        org.mockito.Mockito.when(passwordEncoder.encode(anyString()))
                .thenReturn("$2a$10$dummyhash");
        org.mockito.Mockito.when(passwordEncoder.matches(anyString(), anyString()))
                .thenReturn(true);
    }

    @Test
    void changePassword_missingFields_returnsBadRequest() {
        Map<String, String> payload = new HashMap<>();
        ResponseEntity<?> response = authController.changePassword(payload);
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().toString().contains("Missing required fields"));
    }

    @Test
    void changePassword_userNotFound_returnsBadRequest() {
        Map<String, String> payload = new HashMap<>();
        payload.put("email", "test@example.com");
        payload.put("currentPassword", "oldpass");
        payload.put("newPassword", "newpass");

        when(jdbcTemplate.queryForMap(anyString(), any())).thenThrow(new RuntimeException("User not found"));

        ResponseEntity<?> response = authController.changePassword(payload);
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().toString().contains("User not found"));
    }

    @Test
    void changePassword_wrongCurrentPassword_returnsError() {
        Map<String, String> payload = new HashMap<>();
        payload.put("email", "test@example.com");
        payload.put("currentPassword", "wrongpass");
        payload.put("newPassword", "newpass");

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode("correctpass");
        Map<String, Object> user = new HashMap<>();
        user.put("password_hash", hash);

        when(jdbcTemplate.queryForMap(anyString(), any())).thenReturn(user);

        AuthController localController = new AuthController();
        localController.setJdbcTemplate(jdbcTemplate);
        localController.setPasswordEncoder(encoder);

        ResponseEntity<?> response = localController.changePassword(payload);
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().toString().contains("Current password is incorrect"));
    }

    // --- WebMvc (integration-style) tests for endpoints ---

    @Test
    void register_success() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Integer.class), any(), any()))
                .thenReturn(0);
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(1);

        String json = """
        {
            "username": "testuser",
            "password": "testpass",
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User",
            "role": "user",
            "is_active": true
        }
        """;

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully"));
    }

    @Test
    void register_missing_fields() throws Exception {
        String json = """
        {
            "username": "testuser"
        }
        """;

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("All fields are required."));
    }

    @Test
    void register_username_exists() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Integer.class), any(), any()))
                .thenReturn(1);

        String json = """
        {
            "username": "testuser",
            "password": "testpass",
            "email": "test@example.com"
        }
        """;

        mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username or email already exists."));
    }

    @Test
    void login_missing_fields() throws Exception {
        String json = """
        {
            "email": "test@example.com"
        }
        """;

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email and password are required."));
    }

    @Test
    void login_invalid_credentials() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(String.class), any()))
                .thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        String json = """
        {
            "email": "wrong@example.com",
            "password": "wrongpass"
        }
        """;

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    void getCurrentUser_success() throws Exception {
        var userMap = new HashMap<String, Object>();
        userMap.put("username", "testuser");
        userMap.put("email", "test@example.com");
        userMap.put("first_name", "Test");
        userMap.put("last_name", "User");
        userMap.put("role", "user");

        when(jdbcTemplate.queryForMap(anyString(), org.mockito.ArgumentMatchers.eq("test@example.com")))
                .thenReturn(userMap);

        mockMvc.perform(get("/auth/me")
                .param("email", "test@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.first_name").value("Test"))
                .andExpect(jsonPath("$.last_name").value("User"))
                .andExpect(jsonPath("$.role").value("user"));
    }

    @Test
    void getCurrentUser_notFound() throws Exception {
        when(jdbcTemplate.queryForMap(anyString(), org.mockito.ArgumentMatchers.eq("notfound@example.com")))
                .thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        mockMvc.perform(get("/auth/me")
                .param("email", "notfound@example.com"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found."));
    }

    @Test
    void getAllUsers_success() throws Exception {
        List<Map<String, Object>> users = new ArrayList<>();
        Map<String, Object> user1 = new HashMap<>();
        user1.put("username", "user1");
        user1.put("email", "user1@example.com");
        user1.put("first_name", "User");
        user1.put("last_name", "One");
        user1.put("role", "Admin");
        user1.put("lastActive", "2024-06-23 12:00:00");
        users.add(user1);

        Map<String, Object> user2 = new HashMap<>();
        user2.put("username", "user2");
        user2.put("email", "user2@example.com");
        user2.put("first_name", "User");
        user2.put("last_name", "Two");
        user2.put("role", "Editor");
        user2.put("lastActive", "2024-06-23 13:00:00");
        users.add(user2);

        when(jdbcTemplate.queryForList(anyString()))
                .thenReturn(users);

        mockMvc.perform(get("/auth/all-users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("user1"))
                .andExpect(jsonPath("$[1].username").value("user2"))
                .andExpect(jsonPath("$[0].role").value("Admin"))
                .andExpect(jsonPath("$[1].role").value("Editor"));
    }

    @Test
    void getAllUsers_failure() throws Exception {
        when(jdbcTemplate.queryForList(anyString()))
                .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/auth/all-users"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Failed to fetch users."));
    }

    @Test
    void deleteUser_success() throws Exception {
        when(jdbcTemplate.update(anyString(), org.mockito.ArgumentMatchers.<Object[]>any()))
                .thenReturn(1);

        mockMvc.perform(delete("/auth/delete-user")
                .param("email", "user1@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User deleted successfully."));
    }

    @Test
    void deleteUser_notFound() throws Exception {
        when(jdbcTemplate.update(anyString(), org.mockito.ArgumentMatchers.<Object[]>any()))
                .thenReturn(0);

        mockMvc.perform(delete("/auth/delete-user")
                .param("email", "notfound@example.com"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found."));
    }

    @Test
    void deleteUser_failure() throws Exception {
        when(jdbcTemplate.update(anyString(), org.mockito.ArgumentMatchers.<Object[]>any()))
                .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(delete("/auth/delete-user")
                .param("email", "user1@example.com"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Failed to delete user."));
    }

    @Test
    void addUser_success() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "User");
        user.put("password", "securePassword123");

        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString(), anyInt(), anyString()))
                .thenReturn(1);

        mockMvc.perform(post("/auth/add-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User added successfully."));
    }

    @Test
    void addUser_failure() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "User");
        user.put("password", "securePassword123");

        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString(), anyInt(), anyString()))
                .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(post("/auth/add-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Failed to add user.")));
    }

    @Test
    void editUser_success() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString()))
                .thenReturn(1);

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User updated successfully."));
    }

    @Test
    void editUser_notFound() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString()))
                .thenReturn(0);

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found."));
    }

    @Test
    void editUser_failure() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString(),
                anyString(), anyString()))
                .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Failed to update user.")));
    }

    @Test
    void updateProfile_success() throws Exception {
        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(1);

        String json = """
        {
            "email": "test@example.com",
            "firstName": "Updated",
            "lastName": "User"
        }
        """;

        mockMvc.perform(post("/auth/update-profile")
                .contentType("application/json")
                .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Profile updated successfully"));
    }

    @Test
    void updateProfile_userNotFound() throws Exception {
        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString()))
                .thenReturn(0);

        String json = """
        {
            "email": "notfound@example.com",
            "firstName": "Updated",
            "lastName": "User"
        }
        """;

        mockMvc.perform(post("/auth/update-profile")
                .contentType("application/json")
                .content(json))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found."));
    }

    @Test
    void updateProfile_missingFields() throws Exception {
        String json = """
        {
            "email": "test@example.com"
        }
        """;

        mockMvc.perform(post("/auth/update-profile")
                .contentType("application/json")
                .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Missing required fields."));
    }

    @Test
    void updateProfile_failure() throws Exception {
        when(jdbcTemplate.update(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new RuntimeException("DB error"));

        String json = """
        {
            "email": "test@example.com",
            "firstName": "Updated",
            "lastName": "User"
        }
        """;

        mockMvc.perform(post("/auth/update-profile")
                .contentType("application/json")
                .content(json))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Failed to update profile")));
    }

    private static void setPrivateField(Object target, String fieldName, Object value) {
        try {
            var f = target.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            f.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void getCategories_direct_success() throws Exception {
        Path temp = Files.createTempFile("categories-", ".json");
        String json = """
        {
          "Skills": ["Writer", "Coder"],
          "Education": ["Bachelor"],
          "Experience": ["Junior"]
        }
        """;
        Files.writeString(temp, json, StandardCharsets.UTF_8);

        AuthController controller = new AuthController();
        setPrivateField(controller, "categoriesPath", temp);

        ResponseEntity<?> resp = controller.getCategories();

        assertEquals(200, resp.getStatusCodeValue());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) resp.getBody();
        assertTrue(body.containsKey("Skills"));
        assertTrue(body.containsKey("Education"));
        assertTrue(body.containsKey("Experience"));
    }

    @Test
    void getCategories_direct_notFound() throws Exception {
        Path tempDir = Files.createTempDirectory("cats-dir");
        Path missing = tempDir.resolve("categories.json");

        AuthController controller = new AuthController();
        setPrivateField(controller, "categoriesPath", missing);

        ResponseEntity<?> resp = controller.getCategories();
        assertEquals(404, resp.getStatusCodeValue());
        assertTrue(resp.getBody().toString().contains("categories.json not found"));
    }

    @Test
    void updateCategories_direct_success() throws Exception {
        Path tempDir = Files.createTempDirectory("cats-update");
        Path file = tempDir.resolve("categories.json");

        AuthController controller = new AuthController();
        setPrivateField(controller, "categoriesPath", file);

        Map<String, Object> payload = new HashMap<>();
        payload.put("Skills", List.of("Backend", "DevOps"));
        payload.put("Education", List.of("Matric", "Diploma"));
        payload.put("Experience", List.of("Intern", "Senior"));

        ResponseEntity<?> resp = controller.updateCategories(payload);
        assertEquals(200, resp.getStatusCodeValue());
        String saved = Files.readString(file, StandardCharsets.UTF_8);
        Map<?, ?> savedMap = new ObjectMapper().readValue(saved, Map.class);
        assertEquals(List.of("Backend", "DevOps"), savedMap.get("Skills"));
        assertEquals(List.of("Matric", "Diploma"), savedMap.get("Education"));
        assertEquals(List.of("Intern", "Senior"), savedMap.get("Experience"));
    }

    @Test
    void updateCategories_direct_validationError() throws Exception {
        Path tempDir = Files.createTempDirectory("cats-bad");
        Path file = tempDir.resolve("categories.json");

        AuthController controller = new AuthController();
        setPrivateField(controller, "categoriesPath", file);

        Map<String, Object> badPayload = new HashMap<>();
        badPayload.put("Skills", List.of("Writer", 42));

        ResponseEntity<?> resp = controller.updateCategories(badPayload);

        assertEquals(400, resp.getStatusCodeValue());
        assertTrue(resp.getBody().toString().contains("must be strings"));
    }

    // --------- CVController: /cv/save tests ---------

    @Test
    void cv_save_missing_email_returnsBadRequest() throws Exception {
        String json = """
        {
          "candidate": { "firstName": "Jane", "lastName": "Doe" },
          "fileUrl": "https://example.com/cv.pdf",
          "normalized": { "skills": "Backend" },
          "aiResult": { "status": "success" },
          "raw": { "Skills": { "labels": ["Backend"] } },
          "receivedAt": "2025-08-18T20:30:00Z"
        }
        """;

        mockMvc.perform(post("/cv/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isBadRequest());
    }

    @Test
    void cv_save_existing_candidate_success() throws Exception {
        // Candidate exists path
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Long.class), any()))
            .thenReturn(100L);

        // Update candidate names
        when(jdbcTemplate.update(anyString(), anyString(), anyString(), any()))
            .thenReturn(1);

        // Insert CV scan
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any()))
            .thenReturn(1);

        String json = """
        {
          "candidate": { "firstName": "Jane", "lastName": "Doe", "email": "jane.doe@example.com" },
          "fileUrl": "https://example.com/cv.pdf",
          "normalized": { "skills": "Backend" },
          "aiResult": { "status": "success", "top_k": 3 },
          "raw": { "Skills": { "labels": ["Backend","Writer","Coder"] } },
          "receivedAt": "2025-08-18T20:30:00Z"
        }
        """;

        mockMvc.perform(post("/cv/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk());
    }

    @Test
    void cv_save_db_error_returnsServerError() throws Exception {
        // Make "candidate exists" path to avoid insert-with-KeyHolder complexity
        when(jdbcTemplate.query(anyString(), any(Object[].class), any(RowMapper.class)))
                .thenReturn(java.util.List.of(123L));
        // Force any update to fail (candidate update or parsed CV insert)
        org.mockito.Mockito.doThrow(new RuntimeException("Simulated DB failure"))
                .when(jdbcTemplate).update(anyString(), any(Object[].class));

        Map<String, Object> payload = new HashMap<>();
        Map<String, Object> candidate = new HashMap<>();
        candidate.put("firstName", "Test");
        candidate.put("lastName", "User");
        candidate.put("email", "test@example.com");
        payload.put("candidate", candidate);
        payload.put("fileUrl", "blob:test");
        payload.put("aiResult", Map.of("status", "success"));
        payload.put("receivedAt", Instant.now().toString());
        // minimal parsed fields (top-level or under "result" both supported)
        payload.put("result", Map.of(
                "summary", "Hello",
                "personal_info", Map.of("name", "X"),
                "sections", Map.of("education", "Y"),
                "skills", java.util.List.of("A", "B")
        ));

        String json = objectMapper.writeValueAsString(payload);

        mockMvc.perform(post("/cv/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().is5xxServerError());
    }

    // Optional: insert-path success (mock generated key)
    @Test
    void cv_save_inserts_new_candidate_success() throws Exception {
        // Force "not found" path -> insert candidate
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Long.class), any()))
            .thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        // Mock insert candidate with KeyHolder (simulate generated key = 555)
        doAnswer(invocation -> {
            Object khObj = invocation.getArgument(1);
            if (khObj instanceof org.springframework.jdbc.support.GeneratedKeyHolder kh) {
                // GeneratedKeyHolder reads the first key from keyList[0]["GENERATED_KEY"]
                java.util.Map<String, Object> m = new java.util.HashMap<>();
                m.put("GENERATED_KEY", 555L);
                kh.getKeyList().add(m);
            }
            return 1;
        }).when(jdbcTemplate).update(
            any(org.springframework.jdbc.core.PreparedStatementCreator.class),
            any(org.springframework.jdbc.support.KeyHolder.class)
        );

        // Insert CV scan
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any()))
            .thenReturn(1);

        String json = """
        {
          "candidate": { "firstName": "Alice", "lastName": "Brown", "email": "alice.brown@example.com" },
          "fileUrl": "https://example.com/alice.pdf",
          "normalized": { "skills": "Fullstack" },
          "aiResult": { "status": "success" },
          "raw": { "Skills": { "labels": ["Fullstack"] } },
          "receivedAt": "2025-08-18T22:00:00Z"
        }
        """;

        mockMvc.perform(post("/cv/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk());
    }

    // --------- CVController: /cv/candidates tests ---------

    @Test
    @SuppressWarnings("unchecked")
    void cv_candidates_success_mapsSkills_and_allFields() throws Exception {
        // Mock jdbcTemplate.query to use the provided RowMapper with two rows
        doAnswer(invocation -> {
            RowMapper<CVController.CandidateSummary> rm =
                (RowMapper<CVController.CandidateSummary>) invocation.getArgument(1);

            // Row 1: normalized JSON provides skills as multiline string
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getLong("Id")).thenReturn(10L);
            when(rs1.getString("FirstName")).thenReturn("Jane");
            when(rs1.getString("LastName")).thenReturn("Doe");
            when(rs1.getString("Email")).thenReturn("jane.doe@example.com");
            when(rs1.getString("FileUrl")).thenReturn("https://example.com/files/jane.pdf");
            when(rs1.getString("Normalized")).thenReturn("{\"skills\":\"Backend\\nCoder\"}");
            when(rs1.getString("AiResult")).thenReturn(null);
            when(rs1.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-01-01T10:00:00Z")));

            // Row 2: fallback to aiResult.applied.Skills array
            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getLong("Id")).thenReturn(11L);
            when(rs2.getString("FirstName")).thenReturn("Alice");
            when(rs2.getString("LastName")).thenReturn("Brown");
            when(rs2.getString("Email")).thenReturn("alice.brown@example.com");
            when(rs2.getString("FileUrl")).thenReturn("https://example.com/files/alice.pdf");
            when(rs2.getString("Normalized")).thenReturn(null);
            when(rs2.getString("AiResult")).thenReturn("{\"applied\":{\"Skills\":[\"React\",\"Angular\"]}}");
            when(rs2.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-02-02T12:00:00Z")));

            var list = new ArrayList<CVController.CandidateSummary>();
            list.add(rm.mapRow(rs1, 0));
            list.add(rm.mapRow(rs2, 1));
            return list;
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class));

        mockMvc.perform(get("/cv/candidates"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(10))
            .andExpect(jsonPath("$[0].firstName").value("Jane"))
            .andExpect(jsonPath("$[0].lastName").value("Doe"))
            .andExpect(jsonPath("$[0].email").value("jane.doe@example.com"))
            .andExpect(jsonPath("$[0].project").value("jane.pdf"))
            .andExpect(jsonPath("$[0].skills[0]").value("Backend"))
            .andExpect(jsonPath("$[0].skills[1]").value("Coder"))
            .andExpect(jsonPath("$[0].receivedAt").value("2025-01-01T10:00:00Z"))
            .andExpect(jsonPath("$[1].id").value(11))
            .andExpect(jsonPath("$[1].firstName").value("Alice"))
            .andExpect(jsonPath("$[1].skills[0]").value("React"))
            .andExpect(jsonPath("$[1].skills[1]").value("Angular"));

        verify(jdbcTemplate).query(anyString(), any(RowMapper.class));
        verifyNoMoreInteractions(jdbcTemplate);
    }


   
    @Test
    @DisplayName("cv/candidates - DB error -> 500")
    void cv_candidates_db_error_returns_500() throws Exception {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenThrow(new RuntimeException("Simulated DB failure"));

        mockMvc.perform(get("/cv/candidates"))
                .andExpect(status().is5xxServerError());
    }

    // --------- CVController: /cv/recent tests ---------

    @Test
    @SuppressWarnings("unchecked")
    void cv_recent_success_returnsRows() throws Exception {
        doAnswer(invocation -> {
            RowMapper<CVController.RecentRow> rm =
                (RowMapper<CVController.RecentRow>) invocation.getArgument(1);

            // Row 1
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getLong("Id")).thenReturn(1L);
            when(rs1.getString("FirstName")).thenReturn("Jane");
            when(rs1.getString("LastName")).thenReturn("Doe");
            when(rs1.getString("Email")).thenReturn("jane@example.com");
            when(rs1.getString("Normalized")).thenReturn("{\"skills\":\"React\\nAngular\\nNode\"}");
            when(rs1.getString("AiResult")).thenReturn(null);
            when(rs1.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-01-01T00:00:00Z")));

            // Row 2
            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getLong("Id")).thenReturn(2L);
            when(rs2.getString("FirstName")).thenReturn(null);
            when(rs2.getString("LastName")).thenReturn(null);
            when(rs2.getString("Email")).thenReturn("alice@example.com");
            when(rs2.getString("Normalized")).thenReturn(null);
            when(rs2.getString("AiResult")).thenReturn("{\"applied\":{\"Skills\":[\"Java\",\"Spring\",\"SQL\",\"Docker\"]}}");
            when(rs2.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-02-02T12:00:00Z")));

            var list = new ArrayList<CVController.RecentRow>();
            list.add(rm.mapRow(rs1, 0));
            list.add(rm.mapRow(rs2, 1));
            return list;
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class));

        mockMvc.perform(get("/cv/recent").param("limit", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value(1))
            .andExpect(jsonPath("$[0].name").value("Jane Doe"))
            .andExpect(jsonPath("$[0].skills").value("React, Angular, Node"))
            .andExpect(jsonPath("$[0].fit").value("N/A"))
            .andExpect(jsonPath("$[1].id").value(2))
            .andExpect(jsonPath("$[1].name").value("alice@example.com"))
            .andExpect(jsonPath("$[1].skills").value("Java, Spring, SQL"))
            .andExpect(jsonPath("$[1].fit").value("N/A"));
    }

    @Test
    @DisplayName("cv/recent - success extracts top skills from ResumeResult JSON")
    @SuppressWarnings("unchecked")
    void cv_recent_success_extracts_skills_from_resume() throws Exception {
        // Make the 2-arg overload match: query(String sql, RowMapper<T> rm)
        doAnswer(invocation -> {
            RowMapper<CVController.RecentRow> rm =
                (RowMapper<CVController.RecentRow>) invocation.getArgument(1);

            java.sql.ResultSet rs = mock(java.sql.ResultSet.class);
            when(rs.getLong("Id")).thenReturn(18L);
            when(rs.getString("FirstName")).thenReturn("Talhah");
            when(rs.getString("LastName")).thenReturn("Karodia");
            when(rs.getString("Email")).thenReturn("t@example.com");
            when(rs.getString("ResumeResult"))
                .thenReturn("{\"skills\":[\"JavaScript\",\"Python\",\"C#\",\"SQL\"]}");
            when(rs.getString("AiResult")).thenReturn("{}");
            when(rs.getString("Normalized")).thenReturn(null);
            when(rs.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.now()));

            return java.util.List.of(rm.mapRow(rs, 0));
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class));

        mockMvc.perform(get("/cv/recent").param("limit", "3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(18))
                .andExpect(jsonPath("$[0].name").value("Talhah Karodia"))
                .andExpect(jsonPath("$[0].skills", Matchers.containsString("JavaScript")))
                .andExpect(jsonPath("$[0].skills", Matchers.containsString("Python")))
                .andExpect(jsonPath("$[0].skills", Matchers.containsString("C#")));
    }

    @Test
    @DisplayName("cv/recent - DB error -> 500")
    void cv_recent_db_error_returns_500() throws Exception {
        org.mockito.Mockito.when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenThrow(new RuntimeException("Simulated DB failure"));

        mockMvc.perform(get("/cv/recent").param("limit", "5"))
                .andExpect(status().is5xxServerError());
    }

    // --------- CVController: /cv/stats tests ---------

    @Test
    void cv_stats_success_returnsCount() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Long.class)))
            .thenReturn(42L);

        mockMvc.perform(get("/cv/stats"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalCandidates").value(42));
    }

    @Test
    void cv_stats_db_error_returnsServerError() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), org.mockito.ArgumentMatchers.eq(Long.class)))
            .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/cv/stats"))
            .andExpect(status().is5xxServerError());
    }

    @Test
    @DisplayName("cv/save - success persists parsed resume fields")
    void cv_save_success_insertsParsedFields() throws Exception {
        // Candidate not found -> insert with KeyHolder
        when(jdbcTemplate.query(anyString(), any(Object[].class), any(RowMapper.class)))
                .thenReturn(java.util.Collections.emptyList());

        // Simulate INSERT into Candidates returning new Id = 18
        doAnswer(invocation -> {
            org.springframework.jdbc.support.KeyHolder kh = (org.springframework.jdbc.support.KeyHolder) invocation.getArgument(1);
            // Provide a generated key
            var map = new java.util.HashMap<String, Object>();
            map.put("GENERATED_KEY", 18L);
            kh.getKeyList().add(map);
            return 1;
        }).when(jdbcTemplate).update(any(), any(org.springframework.jdbc.support.KeyHolder.class));

        // Intercept final INSERT into dbo.CandidateParsedCv and assert parameters
        doAnswer((Answer<Integer>) invocation -> {
            String sql = invocation.getArgument(0, String.class);
            Object[] args = invocation.getArgument(1, Object[].class); // varargs captured as array

            // Ensure we hit the right INSERT
            org.junit.jupiter.api.Assertions.assertTrue(sql.contains("INSERT INTO dbo.CandidateParsedCv"));

            // Column order:
            // 0: CandidateId, 1: FileUrl, 2: Filename, 3: Status, 4: Summary,
            // 5: PersonalInfo, 6: Sections, 7: Skills,
            // 8: AiResult, 9: RawResult, 10: Normalized, 11: ResumeResult, 12: ReceivedAt
            org.junit.jupiter.api.Assertions.assertEquals(18L, args[0]);
            org.junit.jupiter.api.Assertions.assertEquals("blob:test", args[1]);
            org.junit.jupiter.api.Assertions.assertEquals("CV.pdf", args[2]);
            org.junit.jupiter.api.Assertions.assertEquals("parsed", args[3]);
            org.junit.jupiter.api.Assertions.assertEquals("summary text", args[4]);

            String personalInfoJson = (String) args[5];
            org.junit.jupiter.api.Assertions.assertTrue(personalInfoJson.contains("\"name\":\"Talhah\""));
            org.junit.jupiter.api.Assertions.assertTrue(personalInfoJson.contains("\"email\":\"t@example.com\""));

            String sectionsJson = (String) args[6];
            org.junit.jupiter.api.Assertions.assertTrue(sectionsJson.contains("\"education\":\"Bachelor\""));
            org.junit.jupiter.api.Assertions.assertTrue(sectionsJson.contains("\"experience\":\"Intern\""));

            String skillsJson = (String) args[7];
            org.junit.jupiter.api.Assertions.assertTrue(skillsJson.contains("JavaScript"));
            org.junit.jupiter.api.Assertions.assertTrue(skillsJson.contains("Python"));

            String aiJson = (String) args[8];
            org.junit.jupiter.api.Assertions.assertTrue(aiJson.contains("\"status\":\"success\""));

            String rawJson = (String) args[9];
            org.junit.jupiter.api.Assertions.assertTrue(rawJson.contains("\"foo\":\"bar\""));

            String normalizedJson = (String) args[10];
            org.junit.jupiter.api.Assertions.assertTrue(normalizedJson.contains("\"skills\""));

            String resumeJson = (String) args[11];
            org.junit.jupiter.api.Assertions.assertTrue(resumeJson.contains("\"personal_info\""));
            org.junit.jupiter.api.Assertions.assertTrue(resumeJson.contains("\"sections\""));

            org.junit.jupiter.api.Assertions.assertTrue(args[12] instanceof Timestamp);

            return 1;
        }).when(jdbcTemplate).update(anyString(), (Object[]) any());

        // Build request payload
        Map<String, Object> candidate = new HashMap<>();
        candidate.put("firstName", "Talhah");
        candidate.put("lastName", "Karodia");
        candidate.put("email", "t@example.com");

        Map<String, Object> personalInfo = new HashMap<>();
        personalInfo.put("name", "Talhah");
        personalInfo.put("email", "t@example.com");
        personalInfo.put("phone", "123");

        Map<String, Object> sections = new HashMap<>();
        sections.put("education", "Bachelor");
        sections.put("experience", "Intern");
        sections.put("projects", List.of(Map.of("name", "Project A", "url", "http://example.com")));

        Map<String, Object> skills = new HashMap<>();
        skills.put("programming_languages", List.of("JavaScript", "Python"));
        skills.put("frameworks", List.of("React", "Node.js"));

        Map<String, Object> aiResult = new HashMap<>();
        aiResult.put("status", "success");
        aiResult.put("top_k", 3);
        aiResult.put("applied", Map.of("Skills", List.of("JavaScript", "Python")));

        Map<String, Object> raw = new HashMap<>();
        raw.put("foo", "bar");

        Map<String, Object> normalized = new HashMap<>();
        normalized.put("skills", List.of("JavaScript", "Python"));

        Map<String, Object> resumeResult = new HashMap<>();
        resumeResult.put("personal_info", personalInfo);
        resumeResult.put("sections", sections);

        Map<String, Object> payload = new HashMap<>();
        payload.put("candidate", candidate);
        payload.put("fileUrl", "blob:test");
        payload.put("aiResult", aiResult);
        payload.put("receivedAt", Instant.now().toString());
        payload.put("result", Map.of("summary", "summary text", "skills", List.of("JavaScript", "Python")));
        payload.put("raw", raw);
        payload.put("normalized", normalized);
        payload.put("resumeResult", resumeResult);

        String json = objectMapper.writeValueAsString(payload);

        mockMvc.perform(post("/cv/save")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
            .andExpect(status().isOk());
    }

    // --------- CVController: /cv/summaries & /cv/{id}/summary tests ---------

    @Test
    @DisplayName("cv/summaries - success returns list with extracted summary from resume.result.summary")
    @SuppressWarnings("unchecked")
    void cv_summaries_success_returns_list() throws Exception {
        // Mock the query(String, RowMapper) overload used in listCandidateSummaries
        doAnswer(invocation -> {
            RowMapper<CVController.CandidateResumeSummary> rm =
                (RowMapper<CVController.CandidateResumeSummary>) invocation.getArgument(1);

            // Row 1: resume.result.summary present
            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getLong("Id")).thenReturn(14L);
            when(rs1.getString("FirstName")).thenReturn("Talhah");
            when(rs1.getString("LastName")).thenReturn("Karodia");
            when(rs1.getString("Email")).thenReturn("talhah@example.com");
            when(rs1.getString("ResumeResult")).thenReturn("""
                {"status":"success","result":{"summary":"Talhah summary text","skills":["java","sql"]}}
                """);
            when(rs1.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-03-01T10:00:00Z")));

            // Row 2: no summary in resume JSON -> summary null
            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getLong("Id")).thenReturn(15L);
            when(rs2.getString("FirstName")).thenReturn("Alice");
            when(rs2.getString("LastName")).thenReturn("Smith");
            when(rs2.getString("Email")).thenReturn("alice@example.com");
            when(rs2.getString("ResumeResult")).thenReturn("{\"status\":\"success\",\"result\":{}}");
            when(rs2.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-02-01T09:00:00Z")));

            return List.of(rm.mapRow(rs1, 0), rm.mapRow(rs2, 1));
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class));

        mockMvc.perform(get("/cv/summaries").param("limit", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].id").value(14))
            .andExpect(jsonPath("$[0].summary").value("Talhah summary text"))
            .andExpect(jsonPath("$[1].id").value(15))
            .andExpect(jsonPath("$[1].summary").doesNotExist());
    }

    @Test
    @DisplayName("cv/summaries - q filter narrows results")
    @SuppressWarnings("unchecked")
    void cv_summaries_filter_q() throws Exception {
        doAnswer(invocation -> {
            RowMapper<CVController.CandidateResumeSummary> rm =
                (RowMapper<CVController.CandidateResumeSummary>) invocation.getArgument(1);

            ResultSet rs1 = mock(ResultSet.class);
            when(rs1.getLong("Id")).thenReturn(1L);
            when(rs1.getString("FirstName")).thenReturn("Jane");
            when(rs1.getString("LastName")).thenReturn("Doe");
            when(rs1.getString("Email")).thenReturn("jane@example.com");
            when(rs1.getString("ResumeResult")).thenReturn("""
              {"result":{"summary":"Expert React developer"}}
              """);
            when(rs1.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.now()));

            ResultSet rs2 = mock(ResultSet.class);
            when(rs2.getLong("Id")).thenReturn(2L);
            when(rs2.getString("FirstName")).thenReturn("Bob");
            when(rs2.getString("LastName")).thenReturn("Jones");
            when(rs2.getString("Email")).thenReturn("bob@example.com");
            when(rs2.getString("ResumeResult")).thenReturn("""
              {"result":{"summary":"Skilled Java backend engineer"}}
              """);
            when(rs2.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.now()));

            return List.of(rm.mapRow(rs1, 0), rm.mapRow(rs2, 1));
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class));

        // Filter by 'react' -> only Jane
        mockMvc.perform(get("/cv/summaries").param("q", "react"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", Matchers.hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(1));

        // Filter by 'java' -> only Bob
        mockMvc.perform(get("/cv/summaries").param("q", "java"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", Matchers.hasSize(1)))
            .andExpect(jsonPath("$[0].id").value(2));
    }

    @Test
    @DisplayName("cv/summaries - DB error -> 500")
    void cv_summaries_db_error() throws Exception {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
            .thenThrow(new RuntimeException("DB fail"));

        mockMvc.perform(get("/cv/summaries"))
            .andExpect(status().is5xxServerError())
            .andExpect(jsonPath("$.message", Matchers.containsString("Failed to load summaries")));
    }

    @Test
    @DisplayName("cv/{id}/summary - success extracts summary from nested resume.result")
    @SuppressWarnings("unchecked")
    void cv_single_summary_success() throws Exception {
        // Mock overload query(String, Object[], RowMapper)
        doAnswer(invocation -> {
            RowMapper<CVController.CandidateResumeSummary> rm =
                (RowMapper<CVController.CandidateResumeSummary>) invocation.getArgument(2);

            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("Id")).thenReturn(42L);
            when(rs.getString("FirstName")).thenReturn("Sarah");
            when(rs.getString("LastName")).thenReturn("Lee");
            when(rs.getString("Email")).thenReturn("sarah.lee@example.com");
            when(rs.getString("ResumeResult")).thenReturn("""
              {"status":"success","result":{"summary":"Seasoned data analyst with BI focus"}}
              """);
            when(rs.getString("Normalized")).thenReturn(null);
            when(rs.getString("AiResult")).thenReturn(null);
            when(rs.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.parse("2025-04-01T08:00:00Z")));

            return List.of(rm.mapRow(rs, 0));
        }).when(jdbcTemplate).query(anyString(), any(Object[].class), any(RowMapper.class));

        mockMvc.perform(get("/cv/42/summary"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(42))
            .andExpect(jsonPath("$.summary").value("Seasoned data analyst with BI focus"))
            .andExpect(jsonPath("$.email").value("sarah.lee@example.com"));
    }

    @Test
    @DisplayName("cv/{id}/summaries alias path works")
    @SuppressWarnings("unchecked")
    void cv_single_summaries_alias_success() throws Exception {
        doAnswer(invocation -> {
            RowMapper<CVController.CandidateResumeSummary> rm =
                (RowMapper<CVController.CandidateResumeSummary>) invocation.getArgument(2);

            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("Id")).thenReturn(50L);
            when(rs.getString("FirstName")).thenReturn("Mark");
            when(rs.getString("LastName")).thenReturn("Twin");
            when(rs.getString("Email")).thenReturn("mark.twin@example.com");
            when(rs.getString("ResumeResult")).thenReturn("""
              {"result":{"summary":"Creative technical writer"}}
              """);
            when(rs.getString("Normalized")).thenReturn(null);
            when(rs.getString("AiResult")).thenReturn(null);
            when(rs.getTimestamp("ReceivedAt")).thenReturn(Timestamp.from(Instant.now()));

            return List.of(rm.mapRow(rs, 0));
        }).when(jdbcTemplate).query(anyString(), any(Object[].class), any(RowMapper.class));

        mockMvc.perform(get("/cv/50/summaries"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(50))
            .andExpect(jsonPath("$.summary").value("Creative technical writer"));
    }

    @Test
    @DisplayName("cv/{id}/summary - not found -> 404")
    void cv_single_summary_not_found() throws Exception {
        when(jdbcTemplate.query(anyString(), any(Object[].class), any(RowMapper.class)))
            .thenReturn(List.of());

        mockMvc.perform(get("/cv/9999/summary"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Candidate not found"));
    }

    @Test
    @DisplayName("cv/{id}/summary - DB error -> 500")
    void cv_single_summary_db_error() throws Exception {
        when(jdbcTemplate.query(anyString(), any(Object[].class), any(RowMapper.class)))
            .thenThrow(new RuntimeException("DB explode"));

        mockMvc.perform(get("/cv/10/summary"))
            .andExpect(status().is5xxServerError())
            .andExpect(jsonPath("$.message", Matchers.containsString("Failed to load summary")));
    }
}