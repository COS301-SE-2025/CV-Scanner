package com.example.api;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;


public class AuthControllerTest {

    private AuthController authController;
    private JdbcTemplate jdbcTemplate;
    private BCryptPasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        jdbcTemplate = mock(JdbcTemplate.class);
        passwordEncoder = new BCryptPasswordEncoder();
        authController = new AuthController();
        authController.setJdbcTemplate(jdbcTemplate);
        authController.setPasswordEncoder(passwordEncoder);
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

        String hash = passwordEncoder.encode("correctpass");
        Map<String, Object> user = new HashMap<>();
        user.put("password_hash", hash);

        when(jdbcTemplate.queryForMap(anyString(), any())).thenReturn(user);

        ResponseEntity<?> response = authController.changePassword(payload);
        assertEquals(400, response.getStatusCodeValue());
        assertTrue(response.getBody().toString().contains("Current password is incorrect"));
    }

}