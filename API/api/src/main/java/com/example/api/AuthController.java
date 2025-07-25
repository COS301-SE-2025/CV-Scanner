package com.example.api;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
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

@RestController
@CrossOrigin(origins = "*")
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<String> register(@RequestBody RegisterRequest request) {
        if (request.username == null || request.password == null || request.email == null) {
            return ResponseEntity.badRequest().body("All fields are required.");
        }
        
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE username = ? OR email = ?",
            Integer.class, request.username, request.email
        );
        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body("Username or email already exists.");
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
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequest request) {
    if (request.email == null || request.password == null) {
        return ResponseEntity.badRequest().body("Email and password are required.");
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
            return ResponseEntity.ok("Login successful");
        } else {
            return ResponseEntity.status(401).body("Invalid email or password.");
        }
    } catch (EmptyResultDataAccessException e) {
        return ResponseEntity.status(401).body("Invalid email or password.");
    }
}

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestParam String email) {
    try {
        // Query user info by email (you can use session/JWT in production)
        var user = jdbcTemplate.queryForMap(
            "SELECT username, email, first_name, last_name, role FROM users WHERE email = ? AND is_active = 1",
            email
        );
        return ResponseEntity.ok(user);
    } catch (Exception e) {
        return ResponseEntity.status(404).body("User not found.");
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
        return ResponseEntity.status(500).body("Failed to fetch users.");
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
        return ResponseEntity.status(500).body("Failed to search users.");
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
            return ResponseEntity.status(500).body("Failed to filter users.");
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
                return ResponseEntity.ok("User deleted successfully.");
            } else {
                return ResponseEntity.status(404).body("User not found.");
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to delete user.");
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
                return ResponseEntity.ok("User added successfully.");
            } else {
                return ResponseEntity.status(400).body("Failed to add user.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to add user. Exception: " + e.getMessage());
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
                return ResponseEntity.ok("User updated successfully.");
            } else {
                return ResponseEntity.status(404).body("User not found.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to update user. Exception: " + e.getMessage());
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