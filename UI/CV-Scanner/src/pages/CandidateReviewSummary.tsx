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
import CircularProgress from "@mui/material/CircularProgress";

export default function CandidateReviewSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId, section } = useParams();
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

  // Determine active section
  const activeSection = (section || "summary").toLowerCase();

  // Persist resolved id
  useEffect(() => {
    if (candidateId) localStorage.setItem("lastCandidateId", candidateId);
  }, [candidateId]);

  // ✅ FIXED: User info state with apiFetch
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
        const res = await apiFetch(`/auth/me?email=${encodeURIComponent(email)}`);
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

  // ✅ FIXED: Candidate state - now dynamic
  const [candidate, setCandidate] = useState({
    name: "Loading...",
    title: "",
    email: "",
    phone: "",
  });

  // ✅ FIXED: Project fit state with correct endpoint
  const [projectFitData, setProjectFitData] = useState<{
    projectType?: string;
    projectFit?: number;
    projectFitPercent?: number;
    projectFitLabel?: string;
  } | null>(null);
  const [fitLoading, setFitLoading] = useState<boolean>(true);
  const [fitError, setFitError] = useState<string | null>(null);

  // ✅ FIXED: Summary state
  const [summaryData, setSummaryData] = useState<{
    summary?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
    receivedAt?: string | null;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // ✅ FIXED: Skills state
  const [skillsData, setSkillsData] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState<boolean>(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  // ✅ FIXED: Experience state
  const [experienceData, setExperienceData] = useState<string[]>([]);
  const [experienceLoading, setExperienceLoading] = useState<boolean>(true);
  const [experienceError, setExperienceError] = useState<string | null>(null);

  // ✅ NEW: Fetch candidate basic info
  useEffect(() => {
    if (!candidateId) return;
    
    (async () => {
      try {
        const res = await apiFetch(`/cv/${candidateId}/summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        setCandidate((prev) => ({
          ...prev,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown",
          email: data.email || "",
        }));
      } catch (e) {
        console.error("Failed to load candidate info:", e);
      }
    })();
  }, [candidateId]);

  // ✅ FIXED: Fetch project fit with correct endpoint path
  useEffect(() => {
    if (activeSection !== "summary" || !candidateId) {
      setFitLoading(false);
      return;
    }

    let aborted = false;
    (async () => {
      setFitLoading(true);
      setFitError(null);
      try {
        // ✅ FIXED: Use /cv/{id}/project-type instead of /cv/{id}/project-fit
        const res = await apiFetch(`/cv/${candidateId}/project-type`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const data = await res.json();
        
        if (!aborted) {
          setProjectFitData(data);
          
          // Extract contact info from project-type response
          if (data.firstName || data.lastName) {
            setCandidate((prev) => ({
              ...prev,
              name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || prev.name,
              email: data.email || prev.email,
            }));
          }
        }
      } catch (e: any) {
        if (!aborted) setFitError(e.message || "Failed to load project fit");
      } finally {
        if (!aborted) setFitLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [candidateId, activeSection]);

  // Fetch summary
  useEffect(() => {
    if (activeSection !== "summary" || !candidateId) {
      setSummaryLoading(false);
      return;
    }

    let aborted = false;
    const ctrl = new AbortController();
    setSummaryLoading(true);
    setSummaryError(null);

    (async () => {
      try {
        const res = await apiFetch(`/cv/${candidateId}/summary`, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const data = await res.json();
        if (aborted) return;
        setSummaryData(data);
        setCandidate((prev) => ({
          ...prev,
          name: `${data.firstName || ""} ${data.lastName || ""}`.trim() || prev.name,
          email: data.email || prev.email,
        }));
      } catch (e: any) {
        if (!aborted) setSummaryError(e.message || "Failed to load summary");
      } finally {
        if (!aborted) setSummaryLoading(false);
      }
    })();

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [candidateId, activeSection]);

  // Fetch skills
  useEffect(() => {
    if (activeSection !== "skills" || !candidateId) {
      setSkillsLoading(false);
      return;
    }

    let aborted = false;
    (async () => {
      setSkillsLoading(true);
      setSkillsError(null);
      try {
        const res = await apiFetch(`/cv/${candidateId}/skills`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const json = await res.json();

        let skills: any;
        if (Array.isArray(json)) {
          const match = json.find((c: any) => String(c.id) === String(candidateId));
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

        if (!aborted) setSkillsData(unique);
      } catch (e: any) {
        if (!aborted) setSkillsError(e.message || "Failed to load skills");
      } finally {
        if (!aborted) setSkillsLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [candidateId, activeSection]);

  // Fetch experience
  useEffect(() => {
    if (activeSection !== "experience" || !candidateId) {
      setExperienceLoading(false);
      return;
    }

    let aborted = false;
    (async () => {
      setExperienceLoading(true);
      setExperienceError(null);
      try {
        const res = await apiFetch(`/cv/${candidateId}/experience`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const json = await res.json();

        let exp: any;
        if (Array.isArray(json)) {
          const match = json.find((c: any) => String(c.id) === String(candidateId));
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
        if (!aborted) setExperienceData(cleaned);
      } catch (e: any) {
        if (!aborted) setExperienceError(e.message || "Failed to load experience");
      } finally {
        if (!aborted) setExperienceLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [candidateId, activeSection]);

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const techRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((tutorialStep === 0 || tutorialStep === 1) && techRef.current)
      setAnchorEl(techRef.current);
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

  const [snack, setSnack] = useState({ open: false, msg: "" });

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#1E1E1E", color: "#fff" }}>
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar position="static" sx={{ bgcolor: "#232A3B", boxShadow: "none" }}>
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
              <Typography variant="h6" sx={{ ml: 2, fontWeight: "bold" }}>
                Candidate Summary
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
                <IconButton onClick={() => navigate("/help")} sx={{ ml: 1, color: "#90ee90" }}>
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
                      ? `${user.first_name} ${user.last_name || ""} (${user.role || "User"})`
                      : (user.username || user.email) + (user.role ? ` (${user.role})` : "")
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
                {tutorialStep === 0 ? "Project Fit" : "Key Technologies"}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {tutorialStep === 0
                  ? "This section shows how well the candidate fits technical projects."
                  : "Here you can see the candidate's key technologies and skills."}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between", mt: 3, gap: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCloseTutorial}
                  sx={{ color: "#888", fontSize: "0.85rem", textTransform: "none" }}
                >
                  End Tutorial
                </Button>
                <Box sx={{ display: "flex", gap: 2 }}>
                  {tutorialStep > 0 && (
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      sx={{ color: "#0073c1", borderColor: "#0073c1", fontWeight: "bold", textTransform: "none" }}
                    >
                      Back
                    </Button>
                  )}
                  {tutorialStep < 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ bgcolor: "#5a88ad", color: "#fff", fontWeight: "bold", textTransform: "none" }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleCloseTutorial}
                      sx={{ bgcolor: "#5a88ad", color: "#fff", fontWeight: "bold", textTransform: "none" }}
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
          
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
            {candidate.name}
            {candidateId ? ` (ID ${candidateId})` : ""}
          </Typography>

          {/* Tabs */}
          <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
            {[
              {
                label: "Summary",
                key: "summary",
              },
              {
                label: "Skills",
                key: "skills",
              },
              {
                label: "Experience",
                key: "experience",
              },
            ].map((t) => (
              <Typography
                key={t.key}
                variant="body1"
                sx={{
                  cursor: "pointer",
                  color: activeSection === t.key ? "#0073c1" : "#b0b8c1",
                  fontWeight: activeSection === t.key ? "bold" : "normal",
                }}
                onClick={() => {
                  if (!candidateId) return;
                  navigate(`/candidate/${candidateId}/${t.key}`);
                }}
              >
                {t.label}
              </Typography>
            ))}
          </Box>

          {/* Summary Tab */}
          {activeSection === "summary" && (
            <>
              <Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  Project Fit & Contact Info
                </Typography>
                {fitLoading ? (
                  <CircularProgress size={24} />
                ) : fitError ? (
                  <Typography color="error">{fitError}</Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {projectFitData?.projectType && (
                      <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                        Best Fit: {projectFitData.projectFitLabel || projectFitData.projectType}
                      </Typography>
                    )}
                    <Divider />
                    <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                      Contact Details
                    </Typography>
                    <Typography variant="body2">Name: {candidate.name}</Typography>
                    <Typography variant="body2">Email: {candidate.email || "-"}</Typography>
                    <Typography variant="body2">Phone: {candidate.phone || "-"}</Typography>
                  </Box>
                )}
              </Paper>

              <Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  CV Summary
                </Typography>
                <TextField
                  value={
                    summaryLoading
                      ? "Loading summary..."
                      : summaryError
                      ? `Error: ${summaryError}`
                      : summaryData?.summary || "No summary available."
                  }
                  multiline
                  minRows={6}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#edededff" } }}
                />
              </Paper>
            </>
          )}

          {/* Skills Tab */}
          {activeSection === "skills" && (
            <Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }} ref={techRef}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Key Technologies
              </Typography>
              {skillsLoading ? (
                <CircularProgress size={24} />
              ) : skillsError ? (
                <Typography color="error">{skillsError}</Typography>
              ) : skillsData.length === 0 ? (
                <Typography>No skills found.</Typography>
              ) : (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {skillsData.map((tech, idx) => (
                    <Chip key={idx} label={tech} sx={{ bgcolor: "#08726aff", color: "#fff", fontWeight: "bold" }} />
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* Experience Tab */}
          {activeSection === "experience" && (
            <Paper elevation={6} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                Experience
              </Typography>
              {experienceLoading ? (
                <CircularProgress size={24} />
              ) : experienceError ? (
                <Typography color="error">{experienceError}</Typography>
              ) : experienceData.length === 0 ? (
                <Typography>No experience entries found.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {experienceData.map((line, idx) => (
                    <Paper key={idx} elevation={0} sx={{ p: 1.2, bgcolor: "#ffffff", borderRadius: 2, display: "flex", gap: 1.5 }}>
                      <Chip label={idx + 1} size="small" sx={{ bgcolor: "#08726a", color: "#fff", fontWeight: "bold", height: 22 }} />
                      <Typography variant="body2" sx={{ color: "#333", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                        {line}
                      </Typography>
                    </Paper>
                  ))}
                </Box>
              )}
            </Paper>
          )}
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