import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import logo from "../assets/logo.png"; // Update path as needed


export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);

  // For dev fallback user
  const devUser = {
    email: "dev@example.com",
    password: "Password123",
    first_name: "John",
    last_name: "Doe",
    role: "Admin",
  };

  useEffect(() => {
    // Try to get user from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Only allow admin users (loaded user or devUser)
    const isAdmin =
      (user && user.role && user.role.toLowerCase() === "admin") ||
      devUser.role === "Admin";
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#181c2f",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      {!collapsed ? (
        <Box
          sx={{
            width: 220,
            bgcolor: "#1A82AE",
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" fill="currentColor" />
            </svg>
          </IconButton>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 3,
              mt: 2,
              gap: 1,
            }}
          >
            <img src={logo} alt="Team Logo" style={{ width: 36, height: 36 }} />
            <Typography variant="h6" sx={{ color: "#fff", fontWeight: "bold" }}>
              Quantum Stack
            </Typography>
          </Box>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/dashboard" ? "active" : ""}
            startIcon={<DashboardIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/upload" ? "active" : ""}
            startIcon={<UploadFileIcon />}
            onClick={() => navigate("/upload")}
          >
            Upload CV
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/candidates" ? "active" : ""}
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/candidates")}
          >
            Candidates
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/search" ? "active" : ""}
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
              sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
              className={
                location.pathname === "/system-settings" ? "active" : ""
              }
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/system-settings")}
            >
              System Settings
            </Button>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            width: 40,
            bgcolor: "#1A82AE",
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
        <AppBar
          position="static"
          sx={{ bgcolor: "#1A82AE", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
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

        {/* System Settings Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
            System Settings
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Only admin users can access this page. Add your system settings
            components here.
          </Typography>
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
  position: "relative",
  "&.active": {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      height: "100%",
      width: "4px",
      backgroundColor: "black",
      borderRadius: "0 4px 4px 0",
    },
  },
};
