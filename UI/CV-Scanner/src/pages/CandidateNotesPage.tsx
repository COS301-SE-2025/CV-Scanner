import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  AppBar,
  Toolbar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import logo from "../assets/logo.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export default function CandidateNotesPage() {
  const navigate = useNavigate();
  const [note, setNote] = useState(""); // State for the new note input
  const [notes, setNotes] = useState([
    {
      recruiter: "Recruiter 1",
      date: "2023-05-15",
      content: "Strong technical skills, may need more business exposure",
    },
  ]); // State for existing notes

  const handleSaveNote = () => {
    if (note.trim()) {
      const newNote = {
        recruiter: "Recruiter 1", // Replace with dynamic recruiter name if available
        date: new Date().toISOString().split("T")[0], // Current date
        content: note,
      };
      setNotes([newNote, ...notes]); // Add the new note to the top of the list
      setNote(""); // Clear the input field
    }
  };

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
      <Box
        sx={{
          width: 220,
          bgcolor: "#5a88ad",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <img src={logo} alt="Entelect Logo" style={{ width: 120 }} />
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
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#5a88ad", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">Admin User</Typography>
            </Box>
            <IconButton
              color="inherit"
              onClick={() => {
                navigate("/login"); // Redirect to login page
              }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Notes Content */}
        <Box sx={{ p: 3 }}>
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
                    if (tab === "Recruiters Notes")navigate("/candidate-notes");
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
};
