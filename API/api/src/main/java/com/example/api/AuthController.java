package com.example.api;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.nio.file.Files;
import java.util.Collections;
import java.util.Map;
import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private String categoriesFilePathProp = null; 
    private java.nio.file.Path categoriesPath;
    private com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

    public void setJdbcTemplate(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    public void setPasswordEncoder(BCryptPasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.username == null || request.password == null || request.email == null) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "All fields are required."));
        }
        
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE username = ? OR email = ?",
            Integer.class, request.username, request.email
        );
        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Username or email already exists."));
        }
        
        String passwordHash = passwordEncoder.encode(request.password);
        
        jdbcTemplate.update(
            "INSERT INTO users (username, email, password_hash, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            request.username,
            request.email,
            passwordHash,
            request.first_name,
            request.last_name,
            request.role != null ? request.role : "user",
            request.is_active != null ? request.is_active : true
        );
        return ResponseEntity.ok(Collections.singletonMap("message", "User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(HttpServletRequest httpRequest) {
        LoginRequest request = new LoginRequest();
        try {
            String contentType = httpRequest.getContentType() == null ? "" : httpRequest.getContentType().toLowerCase();
            if (contentType.contains(org.springframework.http.MediaType.APPLICATION_JSON_VALUE)) {
                // parse JSON body
                try {
                    request = mapper.readValue(httpRequest.getInputStream(), LoginRequest.class);
                } catch (IOException ex) {
                    return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Invalid JSON body."));
                }
            } else if (contentType.contains(org.springframework.http.MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    || contentType.contains(org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
                    || contentType.contains("application/x-www-form-urlencoded")) {
                // form data
                request.email = httpRequest.getParameter("email");
                request.password = httpRequest.getParameter("password");
            } else {
                // try JSON fallback (some clients omit content-type)
                try {
                    request = mapper.readValue(httpRequest.getInputStream(), LoginRequest.class);
                } catch (Exception ex) {
                    // fallback to parameters
                    request.email = httpRequest.getParameter("email");
                    request.password = httpRequest.getParameter("password");
                }
            }

            if (request.email == null || request.password == null) {
                return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Email and password are required."));
            }

            try {
                String passwordHash = jdbcTemplate.queryForObject(
                    "SELECT password_hash FROM users WHERE email = ? AND is_active = 1",
                    String.class, request.email
                );
                if (passwordEncoder.matches(request.password, passwordHash)) {
                    jdbcTemplate.update(
                        "UPDATE users SET last_login = GETDATE() WHERE email = ?",
                        request.email
                    );
                    HttpSession session = httpRequest.getSession(true);
                    session.setAttribute("email", request.email);
                    return ResponseEntity.ok(Collections.singletonMap("message", "Login successful"));
                } else {
                    return ResponseEntity.status(401).body(Collections.singletonMap("message", "Invalid email or password."));
                }
            } catch (EmptyResultDataAccessException e) {
                return ResponseEntity.status(401).body(Collections.singletonMap("message", "Invalid email or password."));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Internal server error."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest) {
        try {
            HttpSession session = httpRequest.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            return ResponseEntity.ok(Collections.singletonMap("message", "Logged out"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("message", "Failed to logout"));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestParam(required = false) String email, HttpServletRequest httpRequest) {
        String emailToUse = email;
        // If no email param, try session
        if (emailToUse == null) {
            HttpSession session = httpRequest.getSession(false);
            if (session != null) {
                Object e = session.getAttribute("email");
                if (e != null) emailToUse = e.toString();
            }
        }

        if (emailToUse == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("message", "Unauthenticated"));
        }

        try {
            System.out.println("Fetching user data for email: " + emailToUse);
            
            // Fixed: Use lowercase column names with square brackets for SQL Server
            String sql = """
                SELECT 
                    [username] as username,
                    [email] as email,
                    [first_name] as first_name,
                    [last_name] as last_name,
                    [role] as role
                FROM [users] 
                WHERE [email] = ? AND [is_active] = 1
            """;
            
            var user = jdbcTemplate.queryForMap(sql, emailToUse);
            
            System.out.println("User data retrieved: " + user);
            
            return ResponseEntity.ok(user);
        } catch (EmptyResultDataAccessException e) {
            System.err.println("User not found for email: " + emailToUse);
            return ResponseEntity.status(404)
                .body(Collections.singletonMap("message", "User not found."));
        } catch (Exception e) {
            System.err.println("Error fetching user: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                .body(Collections.singletonMap("message", "Internal server error: " + e.getMessage()));
        }
    }

    @GetMapping("/all-users")
    public ResponseEntity<?> getAllUsers() {
        try {
            var users = jdbcTemplate.queryForList(
                "SELECT username, email, first_name, last_name, role, last_login as lastActive FROM users WHERE is_active = 1"
            );
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to fetch users."));
        }
    }

    @GetMapping("/search-users")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        try {
            String sql = """
                SELECT username, email, first_name, last_name, role, last_login as lastActive
                FROM users
                WHERE is_active = 1 AND (
                    LOWER(username) LIKE ? OR
                    LOWER(email) LIKE ? OR
                    LOWER(first_name) LIKE ? OR
                    LOWER(last_name) LIKE ? OR
                    LOWER(role) LIKE ?
                )
            """;
            String likeQuery = "%" + query.toLowerCase() + "%";
            var users = jdbcTemplate.queryForList(sql, likeQuery, likeQuery, likeQuery, likeQuery, likeQuery);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to search users."));
        }
    }

    @GetMapping("/filter-users")
    public ResponseEntity<?> filterUsers(@RequestParam String role) {
        try {
            String sql = """
                SELECT username, email, first_name, last_name, role, last_login as lastActive
                FROM users
                WHERE is_active = 1 AND LOWER(role) = ?
            """;
            var users = jdbcTemplate.queryForList(sql, role.toLowerCase());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to filter users."));
        }
    }

    @DeleteMapping("/delete-user")
    public ResponseEntity<?> deleteUser(@RequestParam String email) {
        try {
            int deleted = jdbcTemplate.update(
                "DELETE FROM users WHERE email = ?",
                email
            );
            if (deleted > 0) {
                return ResponseEntity.ok(Collections.singletonMap("message", "User deleted successfully."));
            } else {
                return ResponseEntity.status(404).body(Collections.singletonMap("message", "User not found."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to delete user."));
        }
    }

    @PostMapping("/add-user")
    public ResponseEntity<?> addUser(@RequestBody Map<String, Object> user) {
        try {
            System.out.println("Received add-user request: " + user);

            String username = (String) user.get("username");
            String email = (String) user.get("email");
            String firstName = (String) user.get("first_name");
            String lastName = (String) user.get("last_name");
            String role = (String) user.get("role");
            String password = (String) user.get("password");

            System.out.println("Parsed fields - username: " + username + ", email: " + email + ", first_name: " + firstName + ", last_name: " + lastName + ", role: " + role + ", password: " + (password != null ? "[PROVIDED]" : "[NULL]"));

            int inserted = jdbcTemplate.update(
                "INSERT INTO users (username, email, first_name, last_name, role, is_active, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
                username,
                email,
                firstName,
                lastName,
                role,
                1, // is_active
                passwordEncoder.encode(password)
            );
            System.out.println("Insert result: " + inserted);

            if (inserted > 0) {
                return ResponseEntity.ok(Collections.singletonMap("message", "User added successfully."));
            } else {
                return ResponseEntity.status(400).body(Collections.singletonMap("message", "Failed to add user."));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to add user. Exception: " + e.getMessage()));
        }
    }

    @PutMapping("/edit-user")
    public ResponseEntity<?> editUser(@RequestBody Map<String, Object> user) {
        try {
            String username = (String) user.get("username");
            String email = (String) user.get("email");
            String firstName = (String) user.get("first_name");
            String lastName = (String) user.get("last_name");
            String role = (String) user.get("role");

            int updated = jdbcTemplate.update(
                "UPDATE users SET username = ?, first_name = ?, last_name = ?, role = ? WHERE email = ? AND is_active = 1",
                username,
                firstName,
                lastName,
                role,
                email
            );
            if (updated > 0) {
                return ResponseEntity.ok(Collections.singletonMap("message", "User updated successfully."));
            } else {
                return ResponseEntity.status(404).body(Collections.singletonMap("message", "User not found."));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to update user. Exception: " + e.getMessage()));
        }
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");

        if (email == null || currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Missing required fields."));
        }

        try {
            Map<String, Object> user = jdbcTemplate.queryForMap(
                "SELECT password_hash FROM users WHERE email = ?", email
            );
            String dbPasswordHash = (String) user.get("password_hash");

            if (!passwordEncoder.matches(currentPassword, dbPasswordHash)) {
                return ResponseEntity.status(400).body(Collections.singletonMap("message", "Current password is incorrect."));
            }

            String newPasswordHash = passwordEncoder.encode(newPassword);
            int updated = jdbcTemplate.update(
                "UPDATE users SET password_hash = ? WHERE email = ?",
                newPasswordHash, email
            );
            if (updated > 0) {
                return ResponseEntity.ok(Collections.singletonMap("message", "Password changed successfully."));
            } else {
                return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to update password."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Collections.singletonMap("message", "User not found or error occurred."));
        }
    }

    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String firstName = payload.get("firstName");
        String lastName = payload.get("lastName");

        if (email == null || firstName == null || lastName == null) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("message", "Missing required fields."));
        }

        try {
            int updated = jdbcTemplate.update(
                "UPDATE users SET first_name = ?, last_name = ? WHERE email = ?",
                firstName, lastName, email
            );
            if (updated > 0) {
                return ResponseEntity.ok(Collections.singletonMap("message", "Profile updated successfully"));
            } else {
                return ResponseEntity.status(404).body(Collections.singletonMap("message", "User not found."));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Failed to update profile."));
        }
    }

    @PostConstruct
    public void initCategoriesPath() throws IOException {
        if (categoriesFilePathProp != null && !categoriesFilePathProp.isBlank()) {
            categoriesPath = Paths.get(categoriesFilePathProp).toAbsolutePath().normalize();
        } else {
            // Fallback: <repo root>\AI\categories.json
            Path userDir = Paths.get(System.getProperty("user.dir")).toAbsolutePath();
            // user.dir ≈ ...\CV-Scanner\API\api → go up 2 to CV-Scanner
            Path projectRoot = userDir.getParent() != null && userDir.getParent().getParent() != null
                ? userDir.getParent().getParent()
                : userDir;
            categoriesPath = projectRoot.resolve("AI").resolve("categories.json");
        }

        if (Files.notExists(categoriesPath)) {
            Files.createDirectories(categoriesPath.getParent());
            // Seed default structure if missing
            Map<String, List<String>> seed = Map.of(
                "Skills", List.of("Writer", "Coder", "Backend", "Manager", "HR Supervisor"),
                "Education", List.of("Matric", "Diploma", "Bachelor", "Honours", "Masters", "PhD"),
                "Experience", List.of("Intern", "Junior", "Mid", "Senior", "Lead")
            );
            writeJson(seed);
        }
    }

    @GetMapping("/config/categories")
    public ResponseEntity<?> getCategories() {
        try {
            Map<String, Object> data = readJson();
            return ResponseEntity.ok(data);
        } catch (NoSuchFileException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("detail", "categories.json not found"));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("detail", "Failed to parse categories.json: " + e.getMessage()));
        }
    }

    @PutMapping("/config/categories")
    public ResponseEntity<?> updateCategories(@RequestBody Map<String, Object> payload) {
        try {
            validatePayload(payload);
            writeJson(payload);
            return ResponseEntity.ok(Map.of("status", "ok", "message", "categories.json updated"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("detail", ex.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("detail", "Failed to write categories.json: " + e.getMessage()));
        }
    }

    // ----- helpers -----
    private Map<String, Object> readJson() throws IOException {
        byte[] bytes = Files.readAllBytes(categoriesPath);
        return mapper.readValue(bytes, new TypeReference<Map<String, Object>>() {});
    }

    private void writeJson(Object obj) throws IOException {
        byte[] bytes = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(obj);
        Files.writeString(
            categoriesPath,
            new String(bytes, StandardCharsets.UTF_8),
            StandardOpenOption.CREATE,
            StandardOpenOption.TRUNCATE_EXISTING
        );
    }

    private void validatePayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty())
            throw new IllegalArgumentException("Body must be a non-empty JSON object.");

        for (Map.Entry<String, Object> e : payload.entrySet()) {
            Object v = e.getValue();
            if (!(v instanceof List<?> list))
                throw new IllegalArgumentException("Key '" + e.getKey() + "' must be an array.");
            for (Object item : list) {
                if (!(item instanceof String))
                    throw new IllegalArgumentException("All entries under '" + e.getKey() + "' must be strings.");
            }
        }
    }
}

class RegisterRequest {
    public String username;
    public String password;
    public String email;
    public String first_name;
    public String last_name;
    public String role;
    public Boolean is_active;
}


class LoginRequest {
    public String email;
    public String password;
}