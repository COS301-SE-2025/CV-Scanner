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
  Tooltip,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
//import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";

export default function CandidateExperiencePage() {
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
           {/* Tutorial icon */}
           {/*<Tooltip title="Run Tutorial" arrow>
             <IconButton
               color="inherit"
               onClick={() => {
                 setShowTutorial(true);
                 setTutorialStep(0);
                 setFadeIn(true);
               }}
             >
               <LightbulbRoundedIcon />
             </IconButton>
           </Tooltip>*/}
         
           {/* Help / FAQ icon */}
           <Tooltip title="Go to Help Page" arrow>
             <IconButton
               color="inherit"
               onClick={() => navigate("/help")}
               sx={{ ml: 1 }}
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
               User
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

        {/* Experience Content */}
        <Box sx={{ p: 3 }}>
          <Button
                      startIcon={<ArrowBackIcon />}
                      onClick={() => navigate('/candidates')}
                      sx={{
                        mb: 2,
                        color: '#0073c1',
                        fontWeight: "bold",
                        textTransform: "none",
                        '&:hover': {
                          backgroundColor: 'rgba(0, 115, 193, 0.1)'
                        }
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
                    color: idx === 2 ? "#0073c1" : "#b0b8c1", // Highlight "Experience" tab
                    fontWeight: idx === 2 ? "bold" : "normal",
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

          {/* Work History Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#e1f4ff" }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
              Work History
            </Typography>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
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
