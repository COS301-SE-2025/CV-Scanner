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
import logo3 from "../assets/logoNavbar.png"; // Update path as needed

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
    // Try to get user from API, fallback to devUser if fails
    const email = localStorage.getItem("userEmail") || devUser.email;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(devUser));
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

  // Local state for blacklist and whitelist
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blackInput, setBlackInput] = useState("");
  const [whiteInput, setWhiteInput] = useState("");
  const [blackSearch, setBlackSearch] = useState("");
  const [whiteSearch, setWhiteSearch] = useState("");

  // Placeholder: fetch lists from API when implemented
  useEffect(() => {
    // Example: fetch("/api/blacklist").then(...)
    // For now, use localStorage for demo
    const bl = JSON.parse(localStorage.getItem("blacklist") || "[]");
    const wl = JSON.parse(localStorage.getItem("whitelist") || "[]");
    setBlacklist(bl);
    setWhitelist(wl);
  }, []);

  // Add to blacklist
  const handleAddBlacklist = () => {
    if (blackInput.trim() && !blacklist.includes(blackInput.trim())) {
      const updated = [...blacklist, blackInput.trim()];
      setBlacklist(updated);
      localStorage.setItem("blacklist", JSON.stringify(updated)); // Replace with API call
      setBlackInput("");
    }
  };

  // Add to whitelist
  const handleAddWhitelist = () => {
    if (whiteInput.trim() && !whitelist.includes(whiteInput.trim())) {
      const updated = [...whitelist, whiteInput.trim()];
      setWhitelist(updated);
      localStorage.setItem("whitelist", JSON.stringify(updated)); // Replace with API call
      setWhiteInput("");
    }
  };

  // Remove from blacklist
  const handleRemoveBlacklist = (item: string) => {
    const updated = blacklist.filter((i) => i !== item);
    setBlacklist(updated);
    localStorage.setItem("blacklist", JSON.stringify(updated)); // Replace with API call
  };

  // Remove from whitelist
  const handleRemoveWhitelist = (item: string) => {
    const updated = whitelist.filter((i) => i !== item);
    setWhitelist(updated);
    localStorage.setItem("whitelist", JSON.stringify(updated)); // Replace with API call
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#121436ff",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      {!collapsed ? (
        <Box
          sx={{
            width: 220,
            bgcolor: "#0A2540",
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
            <img
              src={logo3}
              alt="Team Logo"
              style={{ width: 36, height: 36 }}
            />
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
            bgcolor: "#0A2540",
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
          sx={{ bgcolor: "#0A2540", boxShadow: "none" }}
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

          {/* Search bars OUTSIDE the blacklist/whitelist boxes */}
          <Box sx={{ display: "flex", gap: 4, mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              <input
                type="text"
                value={blackSearch}
                onChange={(e) => setBlackSearch(e.target.value)}
                placeholder="Search blacklist"
                style={{
                  width: "98%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#181c2f",
                  color: "#fff",
                  marginBottom: "8px",
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <input
                type="text"
                value={whiteSearch}
                onChange={(e) => setWhiteSearch(e.target.value)}
                placeholder="Search whitelist"
                style={{
                  width: "98%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#181c2f",
                  color: "#fff",
                  marginBottom: "8px",
                }}
              />
            </Box>
          </Box>

          {/* Blacklist and Whitelist Section */}
          <Box sx={{ display: "flex", gap: 4, mt: 2 }}>
            {/* Blacklist */}
            <Box sx={{ flex: 1, bgcolor: "#2b3a55", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#fff" }}>
                Blacklist
              </Typography>
              <Box sx={{ mb: 2 }}>
                {blacklist.filter((item) =>
                  item.toLowerCase().includes(blackSearch.toLowerCase())
                ).length === 0 ? (
                  <Typography sx={{ color: "#aaa" }}>
                    No blacklisted items.
                  </Typography>
                ) : (
                  blacklist
                    .filter((item) =>
                      item.toLowerCase().includes(blackSearch.toLowerCase())
                    )
                    .map((item) => (
                      <Box
                        key={item}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 1,
                          bgcolor: "#2c3446",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography sx={{ flex: 1 }}>{item}</Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRemoveBlacklist(item)}
                          sx={{ ml: 2 }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <input
                  type="text"
                  value={blackInput}
                  onChange={(e) => setBlackInput(e.target.value)}
                  placeholder="Add to blacklist"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    background: "#181c2f",
                    color: "#fff",
                  }}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleAddBlacklist}
                  sx={{ minWidth: 0, px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>
            {/* Whitelist */}
            <Box sx={{ flex: 1, bgcolor: "#2b3a55", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#fff" }}>
                Whitelist
              </Typography>
              <Box sx={{ mb: 2 }}>
                {whitelist.filter((item) =>
                  item.toLowerCase().includes(whiteSearch.toLowerCase())
                ).length === 0 ? (
                  <Typography sx={{ color: "#aaa" }}>
                    No whitelisted items.
                  </Typography>
                ) : (
                  whitelist
                    .filter((item) =>
                      item.toLowerCase().includes(whiteSearch.toLowerCase())
                    )
                    .map((item) => (
                      <Box
                        key={item}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 1,
                          bgcolor: "#2c3446",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography sx={{ flex: 1 }}>{item}</Typography>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleRemoveWhitelist(item)}
                          sx={{ ml: 2 }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <input
                  type="text"
                  value={whiteInput}
                  onChange={(e) => setWhiteInput(e.target.value)}
                  placeholder="Add to whitelist"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    background: "#181c2f",
                    color: "#fff",
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddWhitelist}
                  sx={{ minWidth: 0, px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>
          </Box>
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
