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
import { useLocation } from 'react-router-dom';
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import logo2 from "../assets/logo2.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export default function CandidateReviewSummary() {
  const navigate = useNavigate();

   const location = useLocation();

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
      <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
                <img src={logo2} alt="Team Logo" style={{ width: 120 }} />
              </Box>
           <Button
        fullWidth
        sx={navButtonStyle}
        className={location.pathname === '/dashboard' ? 'active' : ''}
        startIcon={<DashboardIcon />}
        onClick={() => navigate('/dashboard')}
      >
        Dashboard
      </Button>
      
      <Button
        fullWidth
        sx={navButtonStyle}
        className={location.pathname === '/upload' ? 'active' : ''}
        startIcon={<UploadFileIcon />}
        onClick={() => navigate('/upload')}
      >
        Upload CV
      </Button>
      
      <Button
        fullWidth
        sx={{
          ...navButtonStyle,
          ...(location.pathname.startsWith('/candidate') || location.pathname === '/candidates') 
            ? { bgcolor: "#d8f0ff", color: "#000" } 
            : {}
        }}
        className={
          location.pathname.startsWith('/candidate') || location.pathname === '/candidates' 
            ? 'active' 
            : ''
        }
        startIcon={<PeopleIcon />}
        onClick={() => navigate('/candidates')}
      >
        Candidates
      </Button>
      
      <Button
        fullWidth
        sx={navButtonStyle}
        className={location.pathname === '/search' ? 'active' : ''}
        startIcon={<SearchIcon />}
        onClick={() => navigate('/search')}
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
            <Box
  sx={{
    display: 'flex',
    alignItems: 'center',
    ml: 2,
    cursor: 'pointer',
    '&:hover': { opacity: 0.8 },
  }}
  onClick={() => navigate('/settings')}
>
  <AccountCircleIcon sx={{ mr: 1 }} />
  <Typography variant="subtitle1">Admin User</Typography>
</Box>

            <IconButton
              color="inherit"
              onClick={() => {
                // Perform logout logic here
                navigate("/login"); // Redirect to login page
              }}
            >
              <ExitToAppIcon />
            </IconButton>
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
            {["Summary", "Skills", "Experience", "Recruiters Notes"].map(
              (tab, idx) => (
                <Typography
                  key={idx}
                  variant="body1"
                  sx={{
                    cursor: "pointer",
                    color: idx === 0 ? "#0073c1" : "#b0b8c1", // Highlight the active tab
                    fontWeight: idx === 0 ? "bold" : "normal",
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

          {/* Project Fit Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#e1f4ff" }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Project Fit
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 3,
              }}
            >
              {/* Technical Projects */}
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
                  Technical Projects
                </Typography>
                <Typography variant="body2" sx={{ color: "#555", mb: 1 }}>
                  High proficiency in complex technical environments
                </Typography>
                <Box
                  sx={{
                    position: "relative",
                    height: 20,
                    bgcolor: "#ccc",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: "80%", // Adjust percentage here
                      bgcolor: "#4caf50",
                      height: "100%",
                      borderRadius: 10,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    80%
                  </Typography>
                </Box>
              </Box>

              {/* Collaborative Projects */}
              <Box>
                <Typography variant="body1" sx={{ fontWeight: "bold", mb: 1 }}>
                  Collaborative Projects
                </Typography>
                <Typography variant="body2" sx={{ color: "#555", mb: 1 }}>
                  Works well in team settings
                </Typography>
                <Box
                  sx={{
                    position: "relative",
                    height: 20,
                    bgcolor: "#ccc",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: "60%", // Adjust percentage here
                      bgcolor: "#4caf50",
                      height: "100%",
                      borderRadius: 10,
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  >
                    60%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          {/* Key Technologies Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#e1f4ff" }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Key Technologies
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[".NET", "Azure", "SQL", "C#"].map((tech, idx) => (
                <Chip
                  key={idx}
                  label={tech}
                  sx={{ bgcolor: "#0073c1", color: "#fff" }}
                />
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
   '&.active': {
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      height: '100%',
      width: '4px',
      backgroundColor: 'black',
      borderRadius: '0 4px 4px 0'
    }
  }
};
