import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Stack,
  Divider,
  Link,
  TextField,
  Snackbar,
  Alert,
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  AppBar,
  Toolbar,
  Badge,
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
import logoNavbar from "../assets/logoNavbar.png";
import logo from "../assets/logo.png";

export default function CandidateReviewSummary() {
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

  // Candidate meta (replace with real data from your API later)
const [candidate, setCandidate] = useState({
  name: "Jane Smith",
  title: "Senior Software Engineer",
  yoe: 5,
  location: "Pretoria (Hybrid)",
  availability: "Employed",
  workAuth: "SA Citizen",
  salaryBand: "R600k–R720k",
  lastUpdated: "2025-08-28",
  email: "jane.smith@example.com",
  phone: "+27 82 123 4567",
  links: {
    cv: "/files/jane-smith-cv.pdf",
    github: "https://github.com/jane-smith",
    linkedin: "https://www.linkedin.com/in/jane-smith",
    portfolio: "https://janesmith.dev",
  },
  experience: [
    {
      company: "Entelect",
      title: "Senior Software Engineer",
      dates: "2023-01 → Present",
      impact:
        "Owned payment microservice (.NET 8, Azure Service Bus); chargebacks ↓ 18%.",
    },
    {
      company: "Quantum Stack",
      title: "Software Engineer",
      dates: "2021-01 → 2022-12",
      impact:
        "Built parsing pipeline; throughput ↑ 2.3× via SQL tuning + caching.",
    },
    {
      company: "Acme Tech",
      title: "Junior Developer",
      dates: "2019-01 → 2020-12",
      impact: "Maintained monolith APIs; added integration tests; outages ↓.",
    },
  ],
});

// Contact popover
const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
const openContact = (e: React.MouseEvent<HTMLElement>) =>
  setContactAnchor(e.currentTarget);
const closeContact = () => setContactAnchor(null);

// Summary attach + AI summary
const [summaryFileName, setSummaryFileName] = useState<string>("");
//const [aiSummary, setAiSummary] = useState<string>("");
const [snack, setSnack] = useState({ open: false, msg: "" });

const handleAttachSummary = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSummaryFileName(file.name);
    setSnack({ open: true, msg: "Summary attached." });
  }
};

/*const handleAutoSummarize = () => {
  // Stub: replace with your backend/AI call
  const text = `Summary for ${candidate.name}: Strong .NET/Azure engineer (${candidate.yoe}y) with proven impact on performance and reliability. Led projects, mentored juniors, and improved deployment velocity. Best fit for backend/microservices roles with cloud exposure.`;
  setAiSummary(text);
  setSnack({ open: true, msg: "AI summary generated." });
};*/


  // Tutorial logic (copied from UserManagementPage)
  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Refs for tutorial steps
  const projectFitRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && projectFitRef.current) setAnchorEl(projectFitRef.current);
    else if (tutorialStep === 1 && techRef.current) setAnchorEl(techRef.current);
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

  function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
      <Typography variant="caption" sx={{ color: "#6b7280" }}>{label}</Typography>
      <Typography variant="body1" sx={{ fontWeight: "bold" }}>{value}</Typography>
    </Box>
  );
}


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

        <AppBar position="static" sx={{ bgcolor: "#232A3B ", boxShadow: "none" }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            {/* Left: Logo */}
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
      {/* Optional title next to logo */}
      <Typography variant="h6" sx={{fontFamily: 'Helvetica, sans-serif', ml: 2, fontWeight: 'bold' }}>Candidate Summary</Typography> 
    </Box>
            {/* Right: Icons */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
            {/* Help / FAQ icon */}
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
                    ? `${user.first_name} ${user.last_name || ""} (${user.role || "User"})`
                    : (user.username || user.email) + (user.role ? ` (${user.role})` : "")
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
              <Typography variant="h6" sx={{fontFamily: 'Helvetica, sans-serif', fontWeight: "bold", mb: 1 }}>
                {tutorialStep === 0 ? "Project Fit" : "Key Technologies"}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {tutorialStep === 0
                  ? "This section shows how well the candidate fits technical and collaborative projects."
                  : "Here you can see the candidate's key technologies and skills."}
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
                  {tutorialStep < 1 ? (
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

        {/* Candidate Details */}
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
          <Typography variant="h4" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: "bold", mb: 2 }}>
            Jane Smith
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
 {/* HEADER STRIP */}
<Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}>
  {/* Top row: avatar + title + quick actions */}
  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
    <Avatar sx={{ width: 56, height: 56, bgcolor: "#08726a" }}>
      {candidate.name.split(" ").map(n => n[0]).join("").slice(0,2)}
    </Avatar>
    <Box sx={{ flex: 1 }}>

      <Typography variant="body2" sx={{ color: "#555" }}>
        {candidate.title} • {candidate.yoe} years • {candidate.location}
      </Typography>
    </Box>

    {/* Ready-to-act toolbar (quick actions) */}
    <Stack direction="row" spacing={3}>
      <Button
        size="small"
         variant="contained"
      sx={reviewButtonStyle}
        onClick={openContact}
       
      >
        Contact Details
      </Button>
      
    </Stack>
  </Box>

  {/* Quick facts grid */}
  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
    <Fact label="Availability" value={candidate.availability} />
    <Fact label="Work Auth" value={candidate.workAuth} />
    <Fact label="Salary Band" value={candidate.salaryBand} />
    <Fact label="Last Updated" value={candidate.lastUpdated} />
  </Box>
</Paper>

{/* Contact popover */}
<Popover
  open={Boolean(contactAnchor)}
  anchorEl={contactAnchor}
  onClose={closeContact}
  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
  transformOrigin={{ vertical: "top", horizontal: "right" }}
  PaperProps={{ sx: { p: 2, borderRadius: 2 } }}
>
  <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
    Contact Details
  </Typography>
  <Typography variant="body2">Email: <Link href={`mailto:${candidate.email}`}>{candidate.email}</Link></Typography>
  <Typography variant="body2">Phone: <Link href={`tel:${candidate.phone}`}>{candidate.phone}</Link></Typography>
</Popover>

          {/* Project Fit Section */}
          <Paper
            elevation={6}
            sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: "#DEDDEE" }}
            ref={projectFitRef}
          >
            <Typography variant="h6" sx={{fontFamily: 'Helvetica, sans-serif', fontWeight: "bold", mb: 2 }}>
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
                <Typography variant="body1" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: "bold", mb: 1 }}>
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
                      bgcolor: "#19a056ff",
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
                <Typography variant="body1" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: "bold", mb: 1 }}>
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
                      bgcolor: "#19a056ff",
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
            sx={{ p: 3,mb:3, borderRadius: 3, bgcolor: "#DEDDEE" }}
            ref={techRef}
          >
            <Typography variant="h6" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: "bold", mb: 2 }}>
              Key Technologies
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[".NET", "Azure", "SQL", "C#"].map((tech, idx) => (
                <Chip
                  key={idx}
                  label={tech}
                  sx={{ bgcolor: "#08726aff", color: "#fff" }}
                />
              ))}
            </Box>
          </Paper>
              {/* LINKS & ATTACHMENTS (hard-coded AI summary) */}
<Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}>
  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
    Resume & Links
  </Typography>

  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", mb: 2 }}>
    <Button
       variant="contained"
      sx={reviewButtonStyle}
      onClick={() => window.open(candidate.links.cv, "_blank")}
     
    >
      View CV (PDF)
    </Button>
    <Button
      variant="contained"
      sx={reviewButtonStyle}
      onClick={() => window.open(candidate.links.github, "_blank")}
      
    >
      GitHub
    </Button>
    <Button
       variant="contained"
      sx={reviewButtonStyle}
      onClick={() => window.open(candidate.links.linkedin, "_blank")}
    
    >
      LinkedIn
    </Button>
   
  </Stack>

  {/* Attach actual summary (your own write-up) + hard-coded AI summary */}
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
      gap: 2,
      alignItems: "start",
    }}
  >
    {/* Attach actual summary (your own write-up) */}
    <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
        Attach Recruiter Summary
      </Typography>
      <Button
        variant="contained"
      sx={reviewButtonStyle}
        component="label"
      
      >
        Choose File
        <input type="file" hidden onChange={handleAttachSummary} />
      </Button>
      {summaryFileName && (
        <Chip
          label={summaryFileName}
          sx={{ ml: 1, mt: { xs: 1, md: 0 }, bgcolor: "#08726aff", color: "#fff" }}
        />
      )}
      <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#6b7280" }}>
        Upload your written summary; it will be stored with the candidate.
      </Typography>
    </Box>

    {/* Hard-coded AI summary (read-only) + link to full CV */}
    <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
        AI Summary
      </Typography>

      <TextField
        value={
`Strong .NET/Azure engineer (5y) with proven backend impact: 
- Led .NET 8 upgrade and microservice hardening, p95 latency ↓ ~30%.
- Built Azure CI/CD and observability; deployment time ↓, incidents triaged faster.
- Mentors juniors and drives code review quality. 
Best fit: backend/microservices roles with cloud exposure.`
        }
        multiline
        minRows={6}
        fullWidth
        InputProps={{ readOnly: true }}
        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#F9FAFB" } }}
      />

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
           variant="contained"
      sx={reviewButtonStyle}
          onClick={() => window.open(candidate.links.cv, "_blank")}
       
        >
          View Full CV
        </Button>
      </Stack>
    </Box>
  </Box>
</Paper>

{/* Snackbar (keep INSIDE the Candidate Details box) */}
<Snackbar
  open={snack.open}
  autoHideDuration={2500}
  onClose={() => setSnack({ open: false, msg: "" })}
  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <Alert severity="success" variant="filled" sx={{ bgcolor: "#08726a" }}>
    {snack.msg}
  </Alert>
</Snackbar>

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

const reviewButtonStyle = {
  background: "#232A3B",
  color: "DEDDEE",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background:
      "linear-gradient(45deg, #081158 0%, #022028 50%, #003cbdff 100%)",
    transform: "translateY(-1px)",
  },
  textTransform: "none",
  transition: "all 0.3s ease",
  position: "relative",
  overflow: "hidden",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)",
  },
};