import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png"; // Import the second logo if needed
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
} from "@mui/material";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    fetch("http://localhost:8081/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
      }),
    })
      .then((res) => res.text())
      .then((data) => {
        if (data.toLowerCase().includes("success")) {
          localStorage.setItem("userEmail", email); // <--- Add this line
          navigate("/dashboard"); // or wherever you want to redirect
        } else {
          setError(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Login failed. Please try again.");
        setLoading(false);
      });
  };

  return (
    <>
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
          minHeight: "calc(100vh - 64px)", // Adjust height to account for the header
          color: "#fff",
          bgcolor: "#181c2f",
        }}
      >
        {/* Login Form */}
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
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

            <Typography align="right" sx={{ mt: 1, mb: 1 }}>
              <Link
                to="/reset-password"
                style={{
                  textDecoration: "none",
                  fontSize: "0.95rem",
                  color: "#b0e0ff",
                }}
              >
                Forgot password?
              </Link>
            </Typography>

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
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            {/* Add this new temporary access button */}
            {/* <Button
              fullWidth
              variant="outlined"
              size="large"
              onClick={() => navigate("/dashboard")}
              sx={{
                mb: 2,
                py: 1.5,
                fontWeight: "bold",
                fontSize: "1.1rem",
                color: "#b0e0ff",
                borderColor: "#b0e0ff",
                "&:hover": {
                  borderColor: "#fff",
                  color: "#fff",
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                },
              }}
            >
              Temporary Dashboard Access
            </Button> */}

            <Typography align="center" sx={{ mt: 2 }}>
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{
                  textDecoration: "underline",
                  color: "#b0e0ff",
                  fontWeight: "bold",
                }}
              >
                Create one
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </>
  );
}
