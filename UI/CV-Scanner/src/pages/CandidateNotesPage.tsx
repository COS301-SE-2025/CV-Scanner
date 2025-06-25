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

export default function CandidateNotesPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // User info state and fetch (like UserManagementPage)
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const helpIconRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && helpIconRef.current)
      setAnchorEl(helpIconRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setTutorialStep(-1);

  // Notes logic
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState([
    {
      recruiter: "Recruiter 1",
      date: "2023-05-15",
      content: "Strong technical skills, may need more business exposure",
    },
  ]);

  const handleSaveNote = () => {
    if (note.trim()) {
      const newNote = {
        recruiter: "Recruiter 1", // Replace with dynamic recruiter name if available
        date: new Date().toISOString().split("T")[0],
        content: note,
      };
      setNotes([newNote, ...notes]);
      setNote("");
    }
  };

  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#181c2f",
        color: "#fff",
      }}
    >

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}
          <AppBar position="static" sx={{ bgcolor: "#1A82AE", boxShadow: "none" }}>
  <Toolbar sx={{ justifyContent: "space-between" }}>
    {/* Left: Logo */}
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <img src={logo} alt="Logo" style={{ width: 80 }} />
      {/* Optional title next to logo */}
      <Typography variant="h6" sx={{ ml: 2, fontWeight: 'bold' }}>Candidate Notes</Typography> 
    </Box>

    {/* Right: Icons */}
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Tooltip title="Go to Help Page" arrow>
        <IconButton
          onClick={() => navigate("/help")}
          sx={{ ml: 1, color: '#90ee90' }}
        >
          <HelpOutlineIcon />
        </IconButton>
      </Tooltip>

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
          open={tutorialStep === 0 && Boolean(anchorEl)}
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
              minWidth: 280,
              zIndex: 1500,
              textAlign: "center",
            },
          }}
        >
          <Fade in={fadeIn} timeout={250}>
            <Box sx={{ position: "relative" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                Page Tutorial
              </Typography>
              <Typography sx={{ mb: 2 }}>
                This is the help/tutorial popover. Add more steps as needed.
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  mt: 3,
                  gap: 2,
                }}
              >
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

        {/* Notes Content */}
        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/candidates")}
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
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
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
                    color: idx === 3 ? "#0073c1" : "#b0b8c1", // Highlight "Recruiters Notes" tab
                    fontWeight: idx === 3 ? "bold" : "normal",
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

          {/* Recruiter Notes Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#e1f4ff" }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Recruiter Notes
            </Typography>
            <TextField
              label="Add private notes about this candidate..."
              variant="outlined"
              fullWidth
              multiline
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant="contained"
              onClick={handleSaveNote}
              sx={{ bgcolor: "#0073c1" }}
            >
              Save Notes
            </Button>
            <Box sx={{ mt: 3 }}>
              {notes.map((note, idx) => (
                <Box key={idx} sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {note.recruiter} on {note.date}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#555" }}>
                    {note.content}
                  </Typography>
                </Box>
              ))}
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
