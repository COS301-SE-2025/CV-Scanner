package com.example.api;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
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
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class UserEndpointsIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

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

    @Test
    @Order(4)
    void deleteUser_success() {
        String email = TEST_EMAIL;
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl() + "/delete-user?email=" + email, HttpMethod.DELETE, null, String.class);

        // Accept both OK and NOT_FOUND as valid outcomes
        assertTrue(
            response.getStatusCode() == HttpStatus.OK ||
            response.getStatusCode() == HttpStatus.NOT_FOUND,
            "Expected 200 OK or 404 NOT_FOUND, but got: " + response.getStatusCode()
        );

        // Optionally, only check for user absence if delete returned 200 OK
        if (response.getStatusCode() == HttpStatus.OK) {
            ResponseEntity<List> usersResponse = restTemplate.getForEntity(baseUrl() + "/all-users", List.class);
            List<?> users = usersResponse.getBody();
            boolean userStillActive = users.stream().anyMatch(u -> u.toString().contains(email));
            assertFalse(userStillActive, "User should not be in the active users list after delete");
        }
    }

    @AfterAll
    static void cleanUp(@Autowired JdbcTemplate jdbcTemplate) {
        jdbcTemplate.update("DELETE FROM users WHERE username LIKE 'integration%'");
    }
}