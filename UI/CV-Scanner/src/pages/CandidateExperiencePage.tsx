import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Badge,
  TextField,
  Chip,
  Tooltip,
  Fade,
  Popover,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import logo2 from "../assets/logo2.png";
import logo from "../assets/logo.png";
import logoNavbar from "../assets/logoNavbar.png";
import { apiFetch } from "../lib/api";

export default function CandidateExperiencePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // User info state and fetch
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    (async () => {
      try {
        const res = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json().catch(() => null);
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  // Collapsing sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Refs for tutorial steps
  const workHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && workHistoryRef.current)
      setAnchorEl(workHistoryRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);

  const handleNext = () => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep((s) => s + 1);
      setFadeIn(true);
    }, 250);
  };
  const handleBack = () => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep((s) => s - 1);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setTutorialStep(-1);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            {/* Left: Logo and heading */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  ml: 2,
                  fontWeight: "bold",
                }}
              >
                Candidate Experience
              </Typography>
            </Box>
            {/* Right: Icons */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {/* Tutorial icon */}
              <Tooltip title="Run Tutorial" arrow>
                <IconButton
                  onClick={() => {
                    setTutorialStep(0);
                    setFadeIn(true);
                  }}
                  sx={{ ml: 1, color: "#FFEB3B" }}
                >
                  <LightbulbRoundedIcon />
                </IconButton>
              </Tooltip>
              {/* Help icon */}
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
            </Box>
          </Toolbar>
        </AppBar>

        {/* Tutorial Popover */}
        <Popover
          open={tutorialStep >= 0 && Boolean(anchorEl)}
          anchorEl={anchorEl}
          onClose={handleCloseTutorial}
          anchorOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          PaperProps={{
            sx: {
              p: 2,
              bgcolor: "#fff",
              color: "#181c2f",
              borderRadius: 2,
              boxShadow: 6,
              minWidth: 320,
              zIndex: 1500,
              textAlign: "center",
            },
          }}
        >
          <Fade in={fadeIn} timeout={250}>
            <Box sx={{ position: "relative" }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  mb: 1,
                }}
              >
                Work History
              </Typography>
              <Typography sx={{ mb: 2 }}>
                This section shows the candidate's previous work experience and
                roles.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 3,
                  gap: 2,
                }}
              >
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCloseTutorial}
                  sx={{
                    color: "#888",
                    fontSize: "0.85rem",
                    textTransform: "none",
                    minWidth: "auto",
                    p: 0,
                    mr: "auto", // move to left
                  }}
                >
                  End Tutorial
                </Button>
                <Button
                  variant="contained"
                  onClick={handleCloseTutorial}
                  sx={{
                    bgcolor: "#5a88ad",
                    color: "#fff",
                    fontWeight: "bold",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#487DA6" },
                  }}
                >
                  Finish
                </Button>
              </Box>
            </Box>
          </Fade>
        </Popover>

        {/* Experience Content */}
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/search")}
            sx={{
              mb: 2,
              color: "#0073c1",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(0, 115, 193, 0.1)",
              },
            }}
          >
            Back to Candidates
          </Button>
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Helvetica, sans-serif",
              fontWeight: "bold",
              mb: 2,
            }}
          >
            Jane Smith
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 4 }}>
            Senior Software Engineer | 5 years experience
          </Typography>

          {/* Tabs Section */}
          <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
            {["Summary", "Skills", "Experience", "Recruiters Notes"].map(
              (tab, idx) => (
                <Typography
                  key={idx}
                  variant="body1"
                  sx={{
                    cursor: "pointer",
                    color: idx === 2 ? "#0073c1" : "#b0b8c1", // Highlight "Experience" tab
                    fontWeight: idx === 2 ? "bold" : "normal",
                  }}
                  onClick={() => {
                    if (tab === "Summary") navigate("/candidate-review");
                    if (tab === "Skills") navigate("/candidate-skills");
                    if (tab === "Experience") navigate("/candidate-experience");
                    if (tab === "Recruiters Notes")
                      navigate("/candidate-notes");
                  }}
                >
                  {tab}
                </Typography>
              )
            )}
          </Box>

          {/* Work History Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
            ref={workHistoryRef}
          >
            <Typography
              variant="h6"
              sx={{ fontFamily: ", sans-serif", fontWeight: "bold", mb: 2 }}
            >
              Work History
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body1"
                sx={{ fontFamily: "Helvetica, sans-serif", fontWeight: "bold" }}
              >
                Tech Solutions Inc. | Senior Developer
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                2020 - 2025
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                Led team in migrating legacy systems to .NET Core
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="body1"
                sx={{ fontFamily: "Helvetica, sans-serif", fontWeight: "bold" }}
              >
                Digital Innovations | Software Developer
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                2018 - 2020
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                Developed Azure-based SaaS solutions
              </Typography>
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
