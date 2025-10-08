import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppBar, Toolbar } from "@mui/material";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import logo3 from "../assets/logoNavbar.png";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  IconButton,
  InputAdornment,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { apiFetch } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Default dev user
    const devUser = {
      email: "dev@example.com",
      password: "Password123",
      first_name: "John",
      last_name: "Doe",
      role: "Admin",
    };

    // If dev credentials, log in offline
    if (email === devUser.email && password === devUser.password) {
      localStorage.setItem("userEmail", devUser.email);
      localStorage.setItem("user", JSON.stringify(devUser));
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // try JSON first, fallback to text
      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = await res.text().catch(() => null);
      }

      if (res.ok) {
        localStorage.setItem("userEmail", email);
        // Save token if API returned it
        if (body && typeof body === "object" && body.token) {
          localStorage.setItem("token", String(body.token));
        }
        if (body && typeof body === "object") {
          localStorage.setItem("user", JSON.stringify(body));
        }
        navigate("/dashboard");
      } else {
        const errMsg =
          (body && (body.message || body.error)) ||
          (typeof body === "string" ? body : null) ||
          `Login failed (${res.status})`;
        setError(errMsg);
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <AppBar position="fixed" sx={{ bgcolor: "#0A2540", boxShadow: "none" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img src={logo3} alt="Logo" style={{ width: 80 }} />
            <Typography
              variant="h6"
              sx={{ ml: 2, fontWeight: "bold", color: "#fff" }}
            >
              CV Scanner
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)", // Adjust height to account for the header
          color: "#fff",
          mt: 10,
          bgcolor: "transparent",
          background: "linear-gradient(to bottom right, #0f172a, #1e293b)",
        }}
      >
        {/* Login Form */}
        <Paper
          elevation={10}
          sx={{
            p: 4,
            width: "100%",
            maxWidth: 420,
            borderRadius: 3,
            bgcolor: "#1e2539",
            background: "linear-gradient(145deg, #1e2539, #2a314b)",
            boxShadow: "0px 8px 20px rgba(0,0,0,0.4)",
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              fontFamily: "Inter, sans-serif",
              background: "linear-gradient(to right, #6ddf6d, #b0e0ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Welcome Back
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
                  "& .MuiFilledInput-underline:before": {
                    borderBottom: "1px solid #4bb34b",
                  },
                  "&:hover:not(.Mui-disabled):before": {
                    borderBottom: "2px solid #6ddf6d",
                  },
                },
              }}
              InputLabelProps={{
                sx: { color: "#b0b8c1" },
              }}
            />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
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
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((show) => !show)}
                      edge="end"
                      sx={{ color: "#b0e0ff" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
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
