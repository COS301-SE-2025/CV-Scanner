import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Popover,
  Fade,
  Box as MuiBox,
  Tooltip,
} from "@mui/material";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo2 from "../assets/logo2.png";
import logo from "../assets/logo.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import SettingsIcon from "@mui/icons-material/Settings";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function CandidatesPage() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const devUser = {
      email: "dev@example.com",
      password: "Password123",
      first_name: "John",
      last_name: "Doe",
      role: "Admin",
    };

  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string; // <-- add this
    email?: string; // <-- and this
  } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing

  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const reviewBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = "Candidates";
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (tutorialStep === 0 && searchRef.current) setAnchorEl(searchRef.current);
    else if (tutorialStep === 1 && reviewBtnRef.current)
      setAnchorEl(reviewBtnRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);

  const candidates = [
    {
      name: "Jane Smith",
      skills: ".NET, Azure, SQL",
      experience: "5 Years",
      fit: "Technical (92%)",
    },
    {
      name: "Mike Johnson",
      skills: "React, Node.js",
      experience: "3 Years",
      fit: "Collaborative (85%)",
    },
    {
      name: "Peter Griffin",
      skills: "C++, C, Python",
      experience: "4 Years",
      fit: "Technical (64%)",
    },
  ];

  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.skills.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.fit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setTutorialStep(-1);

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

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3, mt: 5 }}>
            <img src={logo} alt="Team Logo" style={{ width: 120 }} />
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
            sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
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
              className={location.pathname === "/user-management" ? "active" : ""}
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/user-management")}
            >
              User Management
            </Button>
          )}
        </Box>
      ) : (
        // Expand Icon when sidebar is collapsed
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
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top App Bar */}

         <AppBar
                  position="static"
                  sx={{ bgcolor: "#1A82AE", boxShadow: "none" }}
                >
                  <Toolbar sx={{ justifyContent: "flex-end" }}>
          {/* Tutorial icon */}
          <Tooltip title="Run Tutorial" arrow>
            <IconButton
              onClick={() => {
                setTutorialStep(0);
                setFadeIn(true);
              }}
                 sx={{ml: 1, color: '#FFEB3B'}}
            >
              <LightbulbRoundedIcon />
            </IconButton>
          </Tooltip>
        
          {/* Help / FAQ icon */}
          <Tooltip title="Go to Help Page" arrow>
            <IconButton
              onClick={() => navigate("/help")}
              sx={{ ml: 1, color: '#90ee90' }}
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
                  ? `${user.first_name} ${user.last_name || ""} (${user.role || "User"})`
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

        {/* Main Page Content */}
        <Box sx={{ p: 3 }}>
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, backgroundColor: "#d0f0ff" }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#0073c1", mb: 2 }}
            >
              Candidate Directory
            </Typography>

            {/* Search Controls */}
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by name, skills, or project type..."
                variant="outlined"
                size="small"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                sx={{ backgroundColor: "#fff", borderRadius: 1 }}
                inputRef={searchRef}
              />
              <Button
                variant="contained"
                sx={{ backgroundColor: "#4cb0ff", color: "#fff" }}
                onClick={() => setSearchTerm(searchInput)}
              >
                Search
              </Button>
              <Button
                variant="contained"
                sx={{ backgroundColor: "#d0d0d0", color: "#000" }}
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                }}
              >
                Clear
              </Button>
            </Box>

            {/* Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <b>Candidate</b>
                    </TableCell>
                    <TableCell>
                      <b>Top Skills</b>
                    </TableCell>
                    <TableCell>
                      <b>Experience</b>
                    </TableCell>
                    <TableCell>
                      <b>Project Fits</b>
                    </TableCell>
                    <TableCell>
                      <b>Actions</b>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCandidates.length > 0 ? (
                    filteredCandidates.map((c, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.skills}</TableCell>
                        <TableCell>{c.experience}</TableCell>
                        <TableCell>{c.fit}</TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            sx={reviewButtonStyle}
                            onClick={() => navigate("/candidate-review")}
                            ref={idx === 0 ? reviewBtnRef : null}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No matching candidates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination
                count={1}
                page={1}
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          </Paper>
        </Box>
      </Box>

      {/* Tutorial Popover */}
      <Popover
        open={tutorialStep >= 0 && tutorialStep <= 1 && Boolean(anchorEl)}
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
            {tutorialStep === 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Search Candidates
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Use this search bar to find candidates by <b>name</b>,{" "}
                  <b>skills</b>, or <b>project fit</b>.
                </Typography>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Review a Candidate
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Click <b>Review</b> to view and assess this candidate's CV and
                  fit.
                </Typography>
              </>
            )}
            {/* Shared navigation buttons */}
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
                }}
              >
                End Tutorial
              </Button>
              <Box sx={{ display: "flex", gap: 2 }}>
                {tutorialStep > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => handleStepChange(tutorialStep - 1)}
                    sx={{
                      color: "#5a88ad",
                      borderColor: "#5a88ad",
                      fontWeight: "bold",
                      textTransform: "none",
                      "&:hover": { borderColor: "#487DA6", color: "#487DA6" },
                    }}
                  >
                    Previous
                  </Button>
                )}
                {tutorialStep < 1 ? (
                  <Button
                    variant="contained"
                    onClick={() => handleStepChange(tutorialStep + 1)}
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
    </Box>
  );
}

// Sidebar button style
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
      backgroundColor: "black",
      borderRadius: "0 4px 4px 0",
    },
  },
};

// Review button style
const reviewButtonStyle = {
  background: "linear-gradient(45deg, #0a1172 0%, #00b300 100%)",
  color: "white",
  fontWeight: "bold",
  padding: "6px 16px",
  borderRadius: "4px",
  textTransform: "none",
  "&:hover": {
    background: "linear-gradient(45deg, #081158 0%, #009a00 100%)",
  },
};
