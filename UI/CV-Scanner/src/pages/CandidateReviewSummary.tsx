import React from "react";
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
import logo from "../assets/logo.png"; // Adjust the path as necessary

export default function CandidateReviewSummary() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#181c2f", color: "#fff" }}>
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
        <AppBar position="static" sx={{ bgcolor: "#5a88ad", boxShadow: "none" }}>
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
          </Toolbar>
        </AppBar>

        {/* Candidate Details */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
            Jane Smith
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 4 }}>
            Senior Software Engineer | 5 years experience
          </Typography>

          {/* Tabs Section */}
          <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
            {["Summary", "Skills", "Experience", "Recruiters Notes"].map((tab, idx) => (
              <Typography
                key={idx}
                variant="body1"
                sx={{
                  cursor: "pointer",
                  color: idx === 0 ? "#0073c1" : "#b0b8c1",
                  fontWeight: idx === 0 ? "bold" : "normal",
                }}
              >
                {tab}
              </Typography>
            ))}
          </Box>

          {/* Project Fit Section */}
          <Paper elevation={6} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#e1f4ff" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Project Fit
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  Technical Projects
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  High proficiency in complex technical environments
                </Typography>
              </Box>
              <Box sx={{ width: "50%", bgcolor: "#ccc", borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ width: "80%", bgcolor: "#4caf50", height: 10 }} />
              </Box>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                  Collaborative Projects
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  Works well in team settings
                </Typography>
              </Box>
              <Box sx={{ width: "50%", bgcolor: "#ccc", borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ width: "60%", bgcolor: "#4caf50", height: 10 }} />
              </Box>
            </Box>
          </Paper>

          {/* Key Technologies Section */}
          <Paper elevation={6} sx={{ p: 3, borderRadius: 3, bgcolor: "#e1f4ff" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Key Technologies
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[".NET", "Azure", "SQL", "C#"].map((tech, idx) => (
                <Chip key={idx} label={tech} sx={{ bgcolor: "#0073c1", color: "#fff" }} />
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