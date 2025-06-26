package com.example.api;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserEndpointsIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    private String baseUrl() {
        return "http://localhost:" + port + "/auth";
    }

    
    private static final String UNIQUE_ID = String.valueOf(System.currentTimeMillis());
    private static final String TEST_USERNAME = "integrationuser_" + UNIQUE_ID;
    private static final String TEST_EMAIL = "integration.user+" + UNIQUE_ID + "@example.com";

    @Test
    @Order(1)
    void addUser_success() {
        Map<String, Object> user = new HashMap<>();
        user.put("username", TEST_USERNAME);
        user.put("email", TEST_EMAIL);
        user.put("first_name", "Integration");
        user.put("last_name", "User");
        user.put("role", "User");
        user.put("password", "testpass123");

        ResponseEntity<String> response = restTemplate.postForEntity(baseUrl() + "/add-user", user, String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("User added successfully"));
    }

    @Test
    @Order(2)
    void editUser_success() {
        Map<String, Object> editUser = new HashMap<>();
        editUser.put("username", TEST_USERNAME);
        editUser.put("email", TEST_EMAIL);
        editUser.put("first_name", "IntegrationEdited");
        editUser.put("last_name", "UserEdited");
        editUser.put("role", "Admin");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> request = new HttpEntity<>(editUser, headers);

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl() + "/edit-user", HttpMethod.PUT, request, String.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().contains("User updated successfully"));
    }

    @Test
    @Order(3)
    void getAllUsers_success() {
        ResponseEntity<List> response = restTemplate.getForEntity(baseUrl() + "/all-users", List.class);
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertFalse(response.getBody().isEmpty());
    }


}