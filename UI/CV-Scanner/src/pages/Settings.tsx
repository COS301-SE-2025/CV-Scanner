import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Avatar,
  Divider,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Tooltip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockResetIcon from "@mui/icons-material/LockReset";
import logo2 from "../assets/logo2.png";
import logoNavbar from "../assets/logoNavbar.png";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import logo from "../assets/logo.png";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  const devUser = {
    email: "dev@example.com",
    password: "Password123",
    first_name: "John",
    last_name: "Doe",
    role: "Admin",
  };

  const [profileForm, setProfileForm] = useState({
    firstName: "Admin",
    lastName: "User",
    email: "admin@entelect.co.za",
  });

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const location = useLocation();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        setProfileForm({
          firstName: data.first_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
        });
      });
  }, []);

  // Handle profile updates
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "http://localhost:8081/auth/update-profile",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profileForm),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess("Profile updated successfully");
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Ensure email is always set
    const email =
      profileForm.email || user?.email || localStorage.getItem("userEmail");

    if (!email) {
      setError("Email is required to change password.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8081/auth/change-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear any user data from storage
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  // Handle form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChangeInput = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      {!collapsed ? (
        <Box
          sx={{
            width: 220,
            bgcolor: "#232A3B",
            display: "flex",
            flexDirection: "column",
            p: 2,
            position: "relative",
          }}
        >
          {/* Collapse Button */}
          <IconButton
            onClick={() => setCollapsed(true)}
            sx={{
              color: "#fff",
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 1,
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3, mt: 5 }}>
            <img src={logoNavbar} alt="Team Logo" style={{ width: 120 }} />
          </Box>
          <Button
            fullWidth
            sx={navButtonStyle}
            startIcon={<DashboardIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>
          <Button
            fullWidth
            sx={navButtonStyle}
            startIcon={<UploadFileIcon />}
            onClick={() => navigate("/upload")}
          >
            Upload CV
          </Button>
          <Button
            fullWidth
            sx={navButtonStyle}
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/candidates")}
          >
            Candidates
          </Button>
          <Button
            fullWidth
            sx={navButtonStyle}
            startIcon={<SearchIcon />}
            onClick={() => navigate("/search")}
          >
            Search
          </Button>
          {/* Only show User Management if user is Admin */}
          {(user?.role === "Admin" || devUser.role === "Admin") && (
            <Button
              fullWidth
              sx={navButtonStyle}
              className={
                location.pathname === "/user-management" ? "active" : ""
              }
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/user-management")}
            >
              User Management
            </Button>
          )}
          {(user?.role === "Admin" || devUser.role === "Admin") && (
            <Button
              fullWidth
              sx={navButtonStyle}
              className={
                location.pathname === "/system-settings" ? "active" : ""
              }
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/system-settings")}
            >
              System Settings
            </Button>
          )}
          <Box sx={{ flexGrow: 1 }} />
        </Box>
      ) : (
        <Box
          sx={{
            width: 40,
            bgcolor: "#232A3B",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 1,
          }}
        >
          <IconButton
            onClick={() => setCollapsed(false)}
            sx={{ color: "#fff" }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            {/* Help / FAQ icon */}
            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            {/* User Info */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                ml: 2,
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
              onClick={() => navigate("/settings")}
            >
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                {user
                  ? user.first_name
                    ? `${user.first_name} ${user.last_name || ""} (${
                        user.role || "User"
                      })`
                    : (user.username || user.email) +
                      (user.role ? ` (${user.role})` : "")
                  : "User"}
              </Typography>
            </Box>

            {/* Logout */}
            <IconButton
              color="inherit"
              onClick={() => navigate("/login")}
              sx={{ ml: 1 }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Settings Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3, fontFamily: "Buda, sans-serif" }}>
            User Settings
          </Typography>

          <Paper
            elevation={6}
            sx={{ p: 4, borderRadius: 3, bgcolor: "#DEDDEE", maxWidth: 800 }}
          >
            {/* Error/Success Alerts */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* Profile Section */}
            <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#0073c1", mb: 2, fontFamily: "Buda, sans-serif" }}
              >
                Profile Information
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: "#0073c1",
                    fontSize: "2rem",
                    mr: 3,
                    fontFamily: "Buda, sans-serif",
                    fontWeight: "bold",
                  }}
                >
                  {profileForm.firstName[0]}
                  {profileForm.lastName[0]}
                </Avatar>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3}}
              >
                <TextField
                  name="firstName"
                  label="First Name"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif",fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem","&.Mui-focused": { color: "#487DA6" },  }}}
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif",fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem"  }}}
                />
                <TextField
                  name="email"
                  label="Email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif", fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem"  }}}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mt: 2,
                  background:
                    "linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)",
                  color: "#fff",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)",
                  },
                }}
              >
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Password Section */}
            <Box
              component="form"
              onSubmit={handlePasswordChange}
              sx={{ mb: 4 }}
            >
              <Typography
                variant="h5"
                sx={{ fontWeight: "bold", color: "#0073c1", mb: 2, fontFamily: "Buda, sans-serif" }}
              >
                Change Password
              </Typography>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}
              >
                <TextField
                  name="currentPassword"
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif", fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem"  }}}
                />
                <Box></Box>
                <TextField
                  name="newPassword"
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif", fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem"  }}}
                />
                <TextField
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: "#cbd5e0", borderRadius: 1, fontFamily: "Buda, sans-serif", fontSize: "1.2rem" } }}
                  InputLabelProps={{ sx: { fontFamily: "Buda, sans-serif", fontSize: "1.2rem"  }}}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<LockResetIcon />}
                sx={{
                  mt: 2,
                  background:
                    "linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)",
                  color: "#fff",
                  "&:hover": {
                    background:
                      "linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)",
                  },
                }}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Danger Zone */}
            <Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  sx={{
                    bgcolor: "#f44336",
                    color: "#fff",
                    "&:hover": { bgcolor: "#d32f2f" },
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

const navButtonStyle = {
  justifyContent: "flex-start",
  mb: 1,
  color: "#fff",
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: "#487DA6",
  },
  textTransform: "none",
  fontWeight: "bold",
  "&.active": {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      height: "100%",
      width: "4px",
      backgroundColor: "#0073c1",
      borderRadius: "0 4px 4px 0",
    },
  },
};
