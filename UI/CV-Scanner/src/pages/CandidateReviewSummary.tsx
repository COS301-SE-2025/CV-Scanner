import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../lib/api";
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
  CircularProgress,
} from "@mui/material";
import {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import logoNavbar from "../assets/logoNavbar.png";

export default function CandidateReviewSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();

  const passedCandidate = (location.state as any)?.candidate;

  // Fallback chain: route param -> navigation state -> ?id= query -> localStorage
  const queryId = searchParams.get("id") || undefined;
  const storedId = localStorage.getItem("lastCandidateId") || undefined;

  const candidateId =
    routeId ||
    (passedCandidate?.id ? String(passedCandidate.id) : undefined) ||
    queryId ||
    storedId;

  // Persist resolved id
  useEffect(() => {
    if (candidateId) localStorage.setItem("lastCandidateId", candidateId);
  }, [candidateId]);

  // User info state with apiFetch
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) {
      console.warn("No userEmail in localStorage");
      return;
    }

    (async () => {
      try {
        const res = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (res.status === 401) {
          console.warn("Session expired - redirecting to login");
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json().catch(() => null);
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch user:", err);
        setUser(null);
      }
    })();
  }, [navigate]);

  // Logout handler
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {}
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("lastCandidateId");
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  // Candidate basic info
  const [candidate, setCandidate] = useState({
    name: "Loading...",
    email: "",
    phone: "",
  });

  // Project fit state
  const [projectFitData, setProjectFitData] = useState<{
    projectType?: string;
    projectFit?: number;
    projectFitPercent?: number;
    projectFitLabel?: string;
  } | null>(null);
  const [fitLoading, setFitLoading] = useState<boolean>(true);

  // Summary state
  const [summaryData, setSummaryData] = useState<{
    summary?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
    receivedAt?: string | null;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);

  // Skills state
  const [skillsData, setSkillsData] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState<boolean>(true);

  // Experience state
  const [experienceData, setExperienceData] = useState<string[]>([]);
  const [experienceLoading, setExperienceLoading] = useState<boolean>(true);

  // CV Score state
  const [cvScore, setCvScore] = useState<number | null>(null);
  const [cvScoreLoading, setCvScoreLoading] = useState<boolean>(true);

  // ✅ NEW: Phone number state
  const [phoneLoading, setPhoneLoading] = useState<boolean>(true);

  // Fetch all data on mount
  useEffect(() => {
    if (!candidateId) return;

    // Fetch phone number
    (async () => {
      setPhoneLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/phone`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setCandidate((prev) => ({
          ...prev,
          phone: data.phone || "N/A",
        }));

        console.log(`Phone loaded from ${data.source}:`, data.phone);
      } catch (e: any) {
        console.error("Failed to load phone:", e);
        setCandidate((prev) => ({
          ...prev,
          phone: "N/A",
        }));
      } finally {
        setPhoneLoading(false);
      }
    })();

    // Fetch project fit
    (async () => {
      setFitLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/project-type`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProjectFitData(data);

        // Update candidate info from project-type response
        if (data.firstName || data.lastName) {
          setCandidate((prev) => ({
            ...prev,
            name:
              `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
              prev.name,
            email: data.email || prev.email,
          }));
        }
      } catch (e: any) {
        console.error("Failed to load project fit:", e);
      } finally {
        setFitLoading(false);
      }
    })();

    // Fetch summary
    (async () => {
      setSummaryLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/summary`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSummaryData(data);
        setCandidate((prev) => ({
          ...prev,
          name:
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            prev.name,
          email: data.email || prev.email,
        }));
      } catch (e: any) {
        console.error("Failed to load summary:", e);
      } finally {
        setSummaryLoading(false);
      }
    })();

    // Fetch skills
    (async () => {
      setSkillsLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/skills`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        let skills: any;
        if (Array.isArray(json)) {
          const match = json.find(
            (c: any) => String(c.id) === String(candidateId)
          );
          skills = match?.skills;
        } else {
          skills = json.skills;
        }

        if (!Array.isArray(skills)) skills = [];
        const unique: string[] = [];
        for (const raw of skills) {
          const v = raw == null ? "" : String(raw).trim();
          if (v && unique.indexOf(v) === -1) {
            unique.push(v);
            if (unique.length >= 100) break;
          }
        }
        setSkillsData(unique);
      } catch (e: any) {
        console.error("Failed to load skills:", e);
      } finally {
        setSkillsLoading(false);
      }
    })();

    // Fetch experience
    (async () => {
      setExperienceLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/experience`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        let exp: any;
        if (Array.isArray(json)) {
          const match = json.find(
            (c: any) => String(c.id) === String(candidateId)
          );
          exp = match?.experience;
        } else {
          exp = json.experience;
        }

        if (!Array.isArray(exp)) exp = [];
        const cleaned: string[] = [];
        for (const item of exp) {
          const v = item == null ? "" : String(item).trim();
          if (v && cleaned.indexOf(v) === -1) {
            cleaned.push(v);
            if (cleaned.length >= 100) break;
          }
        }
        setExperienceData(cleaned);
      } catch (e: any) {
        console.error("Failed to load experience:", e);
      } finally {
        setExperienceLoading(false);
      }
    })();

    // Fetch CV score
    (async () => {
      setCvScoreLoading(true);
      try {
        const res = await apiFetch(`/cv/${candidateId}/cv-score`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCvScore(data.cvScore ?? null);
      } catch (e: any) {
        console.error("Failed to load CV score:", e);
      } finally {
        setCvScoreLoading(false);
      }
    })();
  }, [candidateId]);

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && summaryRef.current)
      setAnchorEl(summaryRef.current);
    else if (tutorialStep === 1 && skillsRef.current)
      setAnchorEl(skillsRef.current);
    else if (tutorialStep === 2 && experienceRef.current)
      setAnchorEl(experienceRef.current);
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
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
              <Typography variant="h6" sx={{ ml: 2, fontWeight: "bold" }}>
                Candidate Profile
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center" }}>
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
              <Tooltip title="Go to Help Page" arrow>
                <IconButton
                  onClick={() => navigate("/help")}
                  sx={{ ml: 1, color: "#90ee90" }}
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
              <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
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
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          transformOrigin={{ vertical: "bottom", horizontal: "center" }}
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
            <Box>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                {tutorialStep === 0 && "Candidate Summary"}
                {tutorialStep === 1 && "Key Technologies"}
                {tutorialStep === 2 && "Work Experience"}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {tutorialStep === 0 &&
                  "This section shows the candidate's CV summary and project fit."}
                {tutorialStep === 1 &&
                  "Here you can see the candidate's key technologies and skills."}
                {tutorialStep === 2 &&
                  "This displays the candidate's work experience and background."}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
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

        <Box sx={{ p: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/search")}
            sx={{
              mb: 2,
              color: "#0073c1",
              fontWeight: "bold",
              textTransform: "none",
              "&:hover": { backgroundColor: "rgba(0, 115, 193, 0.1)" },
            }}
          >
            Back to Candidates
          </Button>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: "bold" }}>
              {candidate.name}
              {candidateId && (
                <Typography
                  component="span"
                  variant="h6"
                  sx={{ ml: 2, color: "#888" }}
                >
                  ID: {candidateId}
                </Typography>
              )}
            </Typography>

            {/* CV Score Display */}
            {!cvScoreLoading && cvScore !== null && (
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="h3"
                  sx={{ fontWeight: "bold", color: "#0073c1" }}
                >
                  {cvScore.toFixed(1)}
                </Typography>
                <Typography variant="caption" sx={{ color: "#888" }}>
                  CV Score / 10
                </Typography>
              </Box>
            )}
          </Box>

          {/* SECTION 1: Summary & Project Fit - NO ICONS */}
          <Paper
            ref={summaryRef}
            elevation={6}
            sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", mb: 2, color: "#333" }}
            >
              Candidate Summary
            </Typography>

            {/* Project Fit */}
            {fitLoading ? (
              <CircularProgress size={24} />
            ) : projectFitData?.projectType ? (
              <Box sx={{ mb: 3, p: 2, bgcolor: "#08726a", borderRadius: 2 }}>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: "bold", color: "#fff" }}
                >
                  Best Fit:{" "}
                  {projectFitData.projectFitLabel || projectFitData.projectType}
                </Typography>
              </Box>
            ) : null}

            {/* Contact Info */}
            <Box sx={{ mb: 3, p: 2, bgcolor: "#ffffff", borderRadius: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 1, color: "#333" }}
              >
                Contact Information
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                <strong>Name:</strong> {candidate.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                <strong>Email:</strong> {candidate.email || "-"}
              </Typography>
              <Typography variant="body2" sx={{ color: "#555" }}>
                <strong>Phone:</strong>{" "}
                {phoneLoading ? "Loading..." : candidate.phone || "-"}
              </Typography>
            </Box>

            {/* CV Summary Text */}
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 1, color: "#333" }}
            >
              Summary
            </Typography>
            {summaryLoading ? (
              <CircularProgress size={24} />
            ) : (
              <TextField
                value={summaryData?.summary || "No summary available."}
                multiline
                minRows={6}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#edededff",
                    "& fieldset": { borderColor: "#ccc" },
                  },
                }}
              />
            )}
          </Paper>

          {/* SECTION 2: Skills - NO ICONS */}
          <Paper
            ref={skillsRef}
            elevation={6}
            sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", mb: 2, color: "#333" }}
            >
              Key Technologies & Skills
            </Typography>
            {skillsLoading ? (
              <CircularProgress size={24} />
            ) : skillsData.length === 0 ? (
              <Typography sx={{ color: "#666" }}>No skills found.</Typography>
            ) : (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {skillsData.map((tech, idx) => (
                  <Chip
                    key={idx}
                    label={tech}
                    sx={{
                      bgcolor: "#08726aff",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                    }}
                  />
                ))}
              </Box>
            )}
          </Paper>

          {/* SECTION 3: Experience - NO ICONS */}
          <Paper
            ref={experienceRef}
            elevation={6}
            sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
          >
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", mb: 2, color: "#333" }}
            >
              Work Experience
            </Typography>
            {experienceLoading ? (
              <CircularProgress size={24} />
            ) : experienceData.length === 0 ? (
              <Typography sx={{ color: "#666" }}>
                No experience entries found.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {experienceData.map((line, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 2,
                      bgcolor: "#ffffff",
                      borderRadius: 2,
                      display: "flex",
                      gap: 2,
                      alignItems: "flex-start",
                    }}
                  >
                    <Chip
                      label={idx + 1}
                      size="small"
                      sx={{
                        bgcolor: "#08726a",
                        color: "#fff",
                        fontWeight: "bold",
                        minWidth: 32,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#333",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        flex: 1,
                      }}
                    >
                      {line}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            )}
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
