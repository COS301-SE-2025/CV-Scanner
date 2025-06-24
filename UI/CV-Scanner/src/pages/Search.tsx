import {
  Box,
  Typography,
  Paper,
  Button,
  InputBase,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Avatar,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Popover,
  Fade,
  Tooltip,
} from "@mui/material";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo2 from "../assets/logo2.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";

export default function Search() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedFits, setSelectedFits] = useState([]);
  const [selectedDetails, setSelectedDetails] = useState([]);
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const location = useLocation();

  const candidates = [
    {
      name: "Jane Smith",
      skills: [".NET", "Azure", "SQL"],
      project: ".NET Aam S2L CD",
      uploaded: "2 days ago",
      match: "99% technical",
      initials: "JS",
      details: ["My Uploads"],
      fit: "Technical",
    },
    {
      name: "Mike Johnson",
      skills: ["React", "Node.js", "JavaScript"],
      project: "Sarah Khabad (Amberly)",
      uploaded: "1 week ago",
      match: "95% collaborative",
      initials: "MJ",
      details: ["Last 7 Days"],
      fit: "Collaborative",
    },
    {
      name: "Sarah Lee",
      skills: ["Java", "Spring Boot", "SQL"],
      project: "BizFin Project X",
      uploaded: "3 days ago",
      match: "93% business",
      initials: "SL",
      details: ["My Uploads", "Last 7 Days"],
      fit: "Business",
    },
  ];

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const text = searchText.toLowerCase();
      const matchesText =
        c.name.toLowerCase().includes(text) ||
        c.project.toLowerCase().includes(text) ||
        c.skills.some((s) => s.toLowerCase().includes(text));

      const matchesSkills =
        selectedSkills.length === 0 ||
        selectedSkills.some((skill) => c.skills.includes(skill));
      const matchesFit =
        selectedFits.length === 0 || selectedFits.includes(c.fit);
      const matchesDetails =
        selectedDetails.length === 0 ||
        selectedDetails.some((d) => c.details.includes(d));

      return matchesText && matchesSkills && matchesFit && matchesDetails;
    });
  }, [searchText, selectedSkills, selectedFits, selectedDetails]);

  const handleCheckboxChange = (type, value) => {
    const setFunc = {
      skill: setSelectedSkills,
      fit: setSelectedFits,
      detail: setSelectedDetails,
    }[type];

    const currentValues = {
      skill: selectedSkills,
      fit: selectedFits,
      detail: selectedDetails,
    }[type];

    if (currentValues.includes(value)) {
      setFunc(currentValues.filter((v) => v !== value));
    } else {
      setFunc([...currentValues, value]);
    }
  };

  useEffect(() => {

    document.title = "Search Candidates";
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched user:", data);
        setUser(data);
      })
      .catch(() => setUser(null));
  }, []);

  const searchBarRef = useRef<HTMLInputElement>(null);
  const checkboxesRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && searchBarRef.current)
      setAnchorEl(searchBarRef.current);
    else if (tutorialStep === 1 && checkboxesRef.current)
      setAnchorEl(checkboxesRef.current);
    else if (tutorialStep === 2 && resultsRef.current)
      setAnchorEl(resultsRef.current);
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
            bgcolor: "#5a88ad",
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
            <img src={logo2} alt="Team Logo" style={{ width: 120 }} />
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
            sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
            className={location.pathname === "/search" ? "active" : ""}
            startIcon={<SearchIcon />}
            onClick={() => navigate("/search")}
          >
            Search
          </Button>
          {/* Only show User Management if user is Admin */}
          {user?.role === "Admin" && (
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
        <Box
          sx={{
            width: 40,
            bgcolor: "#5a88ad",
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" fill="currentColor" />
            </svg>
          </IconButton>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top Bar */}
          <AppBar
                   position="static"
                   sx={{ bgcolor: "#5a88ad", boxShadow: "none" }}
                 >
                   <Toolbar sx={{ justifyContent: "flex-end" }}>
           {/* Tutorial icon */}
           <Tooltip title="Run Tutorial" arrow>
             <IconButton
               onClick={() => {
                 setShowTutorial(true);
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
               color="inherit"
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

        {/* Page Content */}
        <Box sx={{ p: 3 }}>
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, backgroundColor: "#bce4ff" }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#0073c1", mb: 3 }}
            >
              Search Candidates
            </Typography>

            {/* Search Bar */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mb: 4,
                bgcolor: "#fff",
                borderRadius: 1,
                px: 2,
                py: 1,
              }}
              ref={searchBarRef}
            >
              <SearchIcon color="action" />
              <InputBase
                placeholder="Search by name, skills, or project type..."
                sx={{ ml: 1, flex: 1 }}
                fullWidth
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </Box>

            {/* Filters */}
            <Box sx={{ display: "flex", gap: 6, mb: 4 }} ref={checkboxesRef}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 2 }}
                >
                  Primary Skills
                </Typography>
                <FormGroup>
                  {[".NET", "Java", "React", "Azure"].map((skill) => (
                    <FormControlLabel
                      key={skill}
                      control={
                        <Checkbox
                          checked={selectedSkills.includes(skill)}
                          onChange={() => handleCheckboxChange("skill", skill)}
                          sx={{
                            color: "#0073c1",
                            "&.Mui-checked": { color: "#0073c1" },
                          }}
                        />
                      }
                      label={skill}
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 2 }}
                >
                  Project Fit
                </Typography>
                <FormGroup>
                  {["Technical", "Collaborative", "Business"].map((fit) => (
                    <FormControlLabel
                      key={fit}
                      control={
                        <Checkbox
                          checked={selectedFits.includes(fit)}
                          onChange={() => handleCheckboxChange("fit", fit)}
                          sx={{
                            color: "#0073c1",
                            "&.Mui-checked": { color: "#0073c1" },
                          }}
                        />
                      }
                      label={fit}
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: "bold", mb: 2 }}
                >
                  Upload Details
                </Typography>
                <FormGroup>
                  {["My Uploads", "Last 7 Days"].map((detail) => (
                    <FormControlLabel
                      key={detail}
                      control={
                        <Checkbox
                          checked={selectedDetails.includes(detail)}
                          onChange={() =>
                            handleCheckboxChange("detail", detail)
                          }
                          sx={{
                            color: "#0073c1",
                            "&.Mui-checked": { color: "#0073c1" },
                          }}
                        />
                      }
                      label={detail}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Results Count */}
            <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: "bold" }}>
              Showing {filteredCandidates.length} of {candidates.length}{" "}
              candidates
            </Typography>

            {/* Candidate Cards */}
            <div ref={resultsRef}>
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((candidate, idx) => (
                  <Paper
                    key={idx}
                    elevation={3}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 3,
                      backgroundColor: "#e1f4ff",
                      cursor: "pointer", // Shows it's clickable
                      "&:hover": {
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)", // Visual feedback

                        transform: "translateY(-2px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => navigate("/candidate-review")} // Correct placement
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: "#0073c1",
                          width: 56,
                          height: 56,
                          fontSize: "1.5rem",
                        }}
                      >
                        {candidate.initials}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{ fontWeight: "bold", mb: 0.5 }}
                        >
                          {candidate.name}
                        </Typography>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {candidate.project}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ mb: 1.5, color: "#555" }}
                        >
                          Uploaded: {candidate.uploaded}
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexWrap: "wrap",
                            mb: 1.5,
                          }}
                        >
                          {candidate.skills.map((skill, i) => (
                            <Chip
                              key={i}
                              label={skill}
                              size="small"
                              sx={{ backgroundColor: "#d0e8ff" }}
                            />
                          ))}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "#0073c1", fontWeight: "bold" }}
                        >
                          Match: {candidate.match}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))
              ) : (
                <Typography
                  variant="body1"
                  sx={{ mt: 2, fontStyle: "italic", color: "#555" }}
                >
                  No results found. Try adjusting your search or filters.
                </Typography>
              )}
            </div>

            {/* Pagination ... */}

          </Paper>
        </Box>
      </Box>

      {/* Tutorial Popover */}
      <Popover
        open={tutorialStep >= 0 && tutorialStep <= 2 && Boolean(anchorEl)}
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
                  Search Bar
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Use this bar to search for candidates by <b>name</b>,{" "}
                  <b>skills</b>, or <b>project type</b>.
                </Typography>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Filters
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Use these checkboxes to filter candidates by <b>skills</b>,{" "}
                  <b>project fit</b>, or <b>upload details</b>.
                </Typography>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Results
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Here you’ll see the candidates that match your search and
                  filters.
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
                {tutorialStep < 2 ? (
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
