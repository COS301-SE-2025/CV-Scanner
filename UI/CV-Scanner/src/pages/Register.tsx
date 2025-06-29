import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  MenuItem,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import logo from "../assets/logo.png";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.role
    ) {
      setError("Please fill all fields");
      setLoading(false);
      return;
    }

    fetch("http://localhost:8081/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.username,
        password: formData.password,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        is_active: formData.is_active,
      }),
    })
      .then((res) => res.text())
      .then((data) => {
        if (data.indexOf("successfully") !== -1) {
          navigate("/login");
        } else {
          setError(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Registration failed. Please try again.");
        setLoading(false);
      });
  };

  return (
    <>
      {/* Header */}
     {/* Header */}
<Box
  sx={{
    display: "flex",
    alignItems: "center",
    bgcolor: "#1A82AE",
    color: "#fff",
    px: 2,
    py: 2,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    position: "relative",
    overflow: "hidden",
    height: 80
  }}
>
  {/* Logo in left corner */}
  <Box 
    sx={{
      position: "absolute",
      left: 20,
      zIndex: 2,
      "&:hover": {
        transform: "rotate(-5deg)",
        transition: "transform 0.3s ease"
      }
    }}
  >
    <img 
      src={logo} 
      alt="Quantum Stack Logo" 
      style={{ 
        width: 75,
        height: "auto",
        filter: "none" // Removed shadow
      }} 
    />
  </Box>

  {/* Sliding Text Container - full width */}
  <Box 
    sx={{
      position: "absolute",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      left: 0,
      overflow: "hidden"
    }}
  >
    <Typography
      variant="h4"
      sx={{
        fontWeight: 800,
        letterSpacing: 4,
        textTransform: "uppercase",
        fontFamily: "'Orbitron', sans-serif",
        background: "linear-gradient(to right, #fff, #d1faff)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        whiteSpace: "nowrap",
        position: "absolute",
        left: "100%", // Start off-screen right
        animation: "slideText 20s linear infinite",
        "@keyframes slideText": {
          "0%": { 
            transform: "translateX(0)",
            left: "100%" 
          },
          "10%": { 
            left: "100%",
            transform: "translateX(0)" 
          },
          "100%": { 
            left: "0%",
            transform: "translateX(-100%)" 
          }
        }
      }}
    >
      QUANTUM STACK
    </Typography>
  </Box>

  {/* Subtle background shine animation */}
  <Box sx={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
    animation: "shine 15s infinite linear",
    "@keyframes shine": {
      "0%": { transform: "translateX(-100%)" },
      "100%": { transform: "translateX(100%)" }
    }
  }}/>
</Box>

      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: "#181c2f",
        }}
      >
        <Paper
          elevation={8}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 400,
            borderRadius: 4,
            background: "linear-gradient(135deg, #171058 0%, #487DA6 100%)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          }}
        >
          <Typography
            variant="h5"
            align="center"
            gutterBottom
            sx={{ fontWeight: "bold", color: "#fff" }}
          >
            Create Account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Username"
              name="username"
              fullWidth
              margin="normal"
              value={formData.username}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <TextField
              label="First Name"
              name="first_name"
              fullWidth
              margin="normal"
              value={formData.first_name}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <TextField
              label="Last Name"
              name="last_name"
              fullWidth
              margin="normal"
              value={formData.last_name}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <TextField
              label="Email"
              type="email"
              name="email"
              fullWidth
              margin="normal"
              value={formData.email}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <TextField
              select
              label="Role"
              name="role"
              fullWidth
              margin="normal"
              value={formData.role}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            >
              <MenuItem value="">Select a role</MenuItem>
              <MenuItem value="User">User</MenuItem>
              <MenuItem value="Editor">Editor</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </TextField>
            <TextField
              label="Password"
              type="password"
              name="password"
              fullWidth
              margin="normal"
              value={formData.password}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <TextField
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              fullWidth
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              variant="filled"
              InputProps={{
                sx: {
                  bgcolor: "#232a3b",
                  color: "#fff",
                  borderRadius: 2,
                  input: { color: "#fff" },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_active}
                  onChange={handleChange}
                  name="is_active"
                  sx={{ color: "#b0e0ff" }}
                />
              }
              label="Active"
              sx={{ color: "#fff", mt: 1 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                fontWeight: "bold",
                fontSize: "1.1rem",
                background: "linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)",
                color: "#fff",
                boxShadow: "none",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)",
                  boxShadow: "none",
                },
              }}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>

            <Typography align="center" color="#fff" sx={{ mt: 2 }}>
              Already have an account?{" "}
              <Link
                to="/login"
                style={{
                  textDecoration: "underline",
                  color: "#b0e0ff",
                  fontWeight: "bold",
                }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
}
