package com.example.api;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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