package com.example.api;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.nio.file.Files;
import java.nio.file.Path;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({AuthController.class, CVController.class})
public class ApiApplicationTests {

    @Autowired
    private MockMvc mockMvc;

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

}