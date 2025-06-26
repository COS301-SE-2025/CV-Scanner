package com.example.api;
import java.io.File;
import java.io.FileInputStream;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.mock.web.MockMultipartFile;

import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@WebMvcTest({AuthController.class, CVController.class})
public class ApiApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @MockBean
    private BCryptPasswordEncoder passwordEncoder;

    // --- AuthController Tests ---

    @Test
    void register_success() throws Exception {
        Mockito.when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any()))
                .thenReturn(0);
        Mockito.when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any(), any(), any()))
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
                .andExpect(content().string("User registered successfully"));
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
                .andExpect(content().string("All fields are required."));
    }

    @Test
    void register_username_exists() throws Exception {
        Mockito.when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class), any(), any()))
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
                .andExpect(content().string("Username or email already exists."));
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
                .andExpect(content().string("Email and password are required."));
    }

    @Test
    void login_invalid_credentials() throws Exception {
        Mockito.when(jdbcTemplate.queryForObject(anyString(), eq(String.class), any()))
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
                .andExpect(content().string("Invalid email or password."));
    }

    
    @Test
    void getCurrentUser_success() throws Exception {
        // Mock user data returned from the database
        var userMap = new java.util.HashMap<String, Object>();
        userMap.put("username", "testuser");
        userMap.put("email", "test@example.com");
        userMap.put("first_name", "Test");
        userMap.put("last_name", "User");
        userMap.put("role", "user");

        Mockito.when(jdbcTemplate.queryForMap(
                anyString(),
                eq("test@example.com")
        )).thenReturn(userMap);

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
        Mockito.when(jdbcTemplate.queryForMap(
                anyString(),
                eq("notfound@example.com")
        )).thenThrow(new org.springframework.dao.EmptyResultDataAccessException(1));

        mockMvc.perform(get("/auth/me")
                .param("email", "notfound@example.com"))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User not found."));
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

        Mockito.when(jdbcTemplate.queryForList(anyString()))
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
        Mockito.when(jdbcTemplate.queryForList(anyString()))
                .thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(get("/auth/all-users"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string("Failed to fetch users."));
    }

                @Test
        void deleteUser_success() throws Exception {
            Mockito.when(jdbcTemplate.update(
                    Mockito.anyString(),
                    Mockito.<Object[]>any()
            )).thenReturn(1);

            mockMvc.perform(delete("/auth/delete-user")
                    .param("email", "user1@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("User deleted successfully."));
        }

        @Test
        void deleteUser_notFound() throws Exception {
            Mockito.when(jdbcTemplate.update(
                    Mockito.anyString(),
                    Mockito.<Object[]>any()
            )).thenReturn(0);

            mockMvc.perform(delete("/auth/delete-user")
                    .param("email", "notfound@example.com"))
                    .andExpect(status().isNotFound())
                    .andExpect(content().string("User not found."));
        }

        @Test
        void deleteUser_failure() throws Exception {
            Mockito.when(jdbcTemplate.update(
                    Mockito.anyString(),
                    Mockito.<Object[]>any()
            )).thenThrow(new RuntimeException("DB error"));

            mockMvc.perform(delete("/auth/delete-user")
                    .param("email", "user1@example.com"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(content().string("Failed to delete user."));
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

        Mockito.when(jdbcTemplate.update(
                Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyInt(), Mockito.anyString()
        )).thenReturn(1);

        mockMvc.perform(post("/auth/add-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isOk())
                .andExpect(content().string("User added successfully."));
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

        Mockito.when(jdbcTemplate.update(
                Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyInt(), Mockito.anyString()
        )).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(post("/auth/add-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Failed to add user.")));
        }

        // Test for /auth/edit-user
        @Test
        void editUser_success() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        Mockito.when(jdbcTemplate.update(
                Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString()
        )).thenReturn(1);

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isOk())
                .andExpect(content().string("User updated successfully."));
        }

        @Test
        void editUser_notFound() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        Mockito.when(jdbcTemplate.update(
                Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString()
        )).thenReturn(0);

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("User not found."));
        }

        @Test
        void editUser_failure() throws Exception {
        Map<String, Object> user = new HashMap<>();
        user.put("username", "janedoe");
        user.put("email", "jane.doe@example.com");
        user.put("first_name", "Jane");
        user.put("last_name", "Doe");
        user.put("role", "Admin");

        Mockito.when(jdbcTemplate.update(
                Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyString()
        )).thenThrow(new RuntimeException("DB error"));

        mockMvc.perform(put("/auth/edit-user")
                .contentType("application/json")
                .content(new ObjectMapper().writeValueAsString(user)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Failed to update user.")));
        }

}