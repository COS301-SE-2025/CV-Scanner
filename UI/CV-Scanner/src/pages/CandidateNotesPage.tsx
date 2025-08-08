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
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  // Collapsing sidebar
  const [collapsed, setCollapsed] = useState(false);

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const notesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && notesRef.current) setAnchorEl(notesRef.current);
    else if (tutorialStep === 1 && saveButtonRef.current)
      setAnchorEl(saveButtonRef.current);
    else if (tutorialStep === 2 && notesListRef.current)
      setAnchorEl(notesListRef.current);
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
          sx={{ bgcolor: "#0A2540 ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            {/* Left: Logo and heading */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logo} alt="Logo" style={{ width: 80 }} />
              <Typography variant="h6" sx={{ fontFamily: 'Buda, sans-serif',ml: 2, fontWeight: "bold" }}>
                Candidate Notes
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
              <Typography variant="h6" sx={{fontFamily: 'Buda, sans-serif', fontWeight: "bold", mb: 1 }}>
                {tutorialStep === 0
                  ? "Recruiter Notes"
                  : tutorialStep === 1
                  ? "Save Notes"
                  : "Saved Notes"}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {tutorialStep === 0
                  ? "Here you can add and view private notes about the candidate. These notes are only visible to recruiters."
                  : tutorialStep === 1
                  ? "Click this button to save your note for this candidate."
                  : "Your saved notes will appear here below, with the newest at the top."}
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
                <Box sx={{ display: "flex", gap: 2 }}>
                  {tutorialStep > 0 && (
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      sx={{
                        color: "#0073c1",
                        borderColor: "#0073c1",
                        fontWeight: "bold",
                        textTransform: "none",
                      }}
                    >
                      Back
                    </Button>
                  )}
                  {tutorialStep < 2 ? (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{
                        bgcolor: "#5a88ad",
                        color: "#fff",
                        fontWeight: "bold",
                        textTransform: "none",
                        "&:hover": { bgcolor: "#487DA6" },
                      }}
                    >
                      Next
                    </Button>
                  ) : (
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
                  )}
                </Box>
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
          <Typography variant="h4" sx={{ fontFamily: 'Buda, sans-serif',fontWeight: "bold", mb: 2 }}>
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
            sx={{ p: 3, borderRadius: 3, bgcolor: "#75a29dff" }}
            ref={notesRef}
          >
            <Typography variant="h6" sx={{fontFamily: 'Buda, sans-serif', fontWeight: "bold", mb: 2 }}>
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
              sx={{ bgcolor: "#08726aff" }}
              ref={saveButtonRef}
            >
              Save Notes
            </Button>
            <Box sx={{ mt: 3 }} ref={notesListRef}>
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
