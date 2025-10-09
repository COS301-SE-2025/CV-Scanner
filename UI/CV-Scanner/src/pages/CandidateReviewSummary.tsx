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
import CircularProgress from "@mui/material/CircularProgress";

export default function CandidateReviewSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeId, section } = useParams();
  const [searchParams] = useSearchParams();

  const passedCandidate = (location.state as any)?.candidate;
  const [projectFit, setProjectFit] = useState<{
    type?: string;
    confidence?: number;
    basis?: string[];
    personal_info?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  } | null>(null);
  const [fitLoading, setFitLoading] = useState<boolean>(true);
  const [fitError, setFitError] = useState<string | null>(null);
  
  // Fallback chain: route param -> navigation state -> ?id= query -> localStorage
  const queryId = searchParams.get("id") || undefined;
  const storedId = localStorage.getItem("lastCandidateId") || undefined;

  const candidateId =
    routeId ||
    (passedCandidate?.id ? String(passedCandidate.id) : undefined) ||
    queryId ||
    storedId;

  // Determine active section early (needed by effects below)
  const activeSection = (section || "summary").toLowerCase();

  // Persist resolved id (once) for refresh support
  useEffect(() => {
    if (candidateId) localStorage.setItem("lastCandidateId", candidateId);
  }, [candidateId]);

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
    (async () => {
      try {
        const res = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json().catch(() => null);
        setUser(data);
      } catch {
        setUser(null);
      }
    })();
  }, []);

  // Logout handler
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore network errors
    }
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  // Candidate meta data
  const [candidate, setCandidate] = useState({
    name: "Jane Smith",
    title: "Senior Software Engineer",
    yoe: 5,
    location: "Pretoria (Hybrid)",
    availability: "Employed",
    workAuth: "SA Citizen",
    salaryBand: "R600k–R720k",
    qualifications: "BSc Computer Science",
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

  // Summary fetch state
  const [summaryData, setSummaryData] = useState<{
    summary?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
    receivedAt?: string | null;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Fetch dynamic summary
  useEffect(() => {
    if (activeSection !== "summary") return;
    if (!candidateId) {
      const last = localStorage.getItem("lastCandidateId");
      if (last) {
        navigate(`/candidate/${last}/summary`, { replace: true });
        return;
      }
      setSummaryLoading(false);
      setSummaryError("No candidate selected. Open a candidate from the list.");
      return;
    }

    localStorage.setItem("lastCandidateId", candidateId);

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
        if (!res.ok)
          throw new Error((await res.text()) || `HTTP ${res.status}`);
        const data = await res.json();
        if (aborted) return;
        setSummaryData(data);
        setCandidate((prev) => ({
          ...prev,
          name:
            `${data.firstName || ""} ${data.lastName || ""}`.trim() ||
            prev.name,
          email: data.email || prev.email,
          lastUpdated: data.receivedAt
            ? data.receivedAt.substring(0, 10)
            : prev.lastUpdated,
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
  }, [candidateId, navigate, activeSection]);

  // Project fit fetch
  useEffect(() => {
    if (activeSection !== "summary") return;
    if (!candidateId) {
      setFitLoading(false);
      setFitError("No candidate id.");
      return;
    }

    let aborted = false;
    (async () => {
      setFitLoading(true);
      setFitError(null);
      try {
        const res = await apiFetch(`/cv/${candidateId}/project-fit`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok)
          throw new Error((await res.text()) || `HTTP ${res.status}`);
        const data = await res.json();
        if (!aborted) setProjectFit(data);
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

  // Skills fetch state
  const [skillsData, setSkillsData] = useState<string[]>([]);
  const [skillsLoading, setSkillsLoading] = useState<boolean>(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection !== "skills") return;
    if (!candidateId) {
      setSkillsLoading(false);
      setSkillsError("No candidate id.");
      return;
    }
    let aborted = false;
    const load = async () => {
      setSkillsLoading(true);
      setSkillsError(null);
      try {
        const res = await apiFetch(`/cv/${candidateId}/skills`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok)
          throw new Error((await res.text()) || `HTTP ${res.status}`);
        const json = await res.json();

        let skills: any;
        if (Array.isArray(json)) {
          let match: any = null;
          for (const c of json as any[]) {
            if (String((c as any).id) === String(candidateId)) {
              match = c;
              break;
            }
          }
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
    };
    load();
    return () => {
      aborted = true;
    };
  }, [candidateId, activeSection]);

  // Experience fetch state
  const [experienceData, setExperienceData] = useState<string[]>([]);
  const [experienceLoading, setExperienceLoading] = useState<boolean>(true);
  const [experienceError, setExperienceError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection !== "experience") return;
    if (!candidateId) {
      setExperienceLoading(false);
      setExperienceError("No candidate id.");
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
        if (!res.ok)
          throw new Error((await res.text()) || `HTTP ${res.status}`);
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
        if (!aborted) setExperienceData(cleaned);
      } catch (e: any) {
        if (!aborted)
          setExperienceError(e.message || "Failed to load experience");
      } finally {
        if (!aborted) setExperienceLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [candidateId, activeSection]);

  // Skills management (from CandidateSkillsPage)
  const [newSkill, setNewSkill] = useState<string>("");
  const [manualSkills, setManualSkills] = useState<string[]>([]);

  const handleAddSkill = () => {
    if (newSkill.trim() && ![...skillsData, ...manualSkills].includes(newSkill)) {
      setManualSkills([...manualSkills, newSkill]);
      setNewSkill("");
    }
  };

  const handleDeleteSkill = (skillToDelete: string) => {
    if (manualSkills.includes(skillToDelete)) {
      setManualSkills(manualSkills.filter((skill) => skill !== skillToDelete));
    }
    // Note: Can't delete API-loaded skills, only manually added ones
  };

  // Contact popover
  const [contactAnchor, setContactAnchor] = useState<HTMLElement | null>(null);
  const openContact = (e: React.MouseEvent<HTMLElement>) =>
    setContactAnchor(e.currentTarget);
  const closeContact = () => setContactAnchor(null);

  // Snackbar state
  const [snack, setSnack] = useState({ open: false, msg: "" });

  // Tutorial logic
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Refs for tutorial steps
  const techRef = useRef<HTMLDivElement>(null);
  const skillsListRef = useRef<HTMLDivElement>(null);
  const addSkillRef = useRef<HTMLDivElement>(null);
  const workHistoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tutorialStep === 0 && techRef.current) setAnchorEl(techRef.current);
    else if (tutorialStep === 1 && skillsListRef.current) setAnchorEl(skillsListRef.current);
    else if (tutorialStep === 2 && addSkillRef.current) setAnchorEl(addSkillRef.current);
    else if (tutorialStep === 3 && workHistoryRef.current) setAnchorEl(workHistoryRef.current);
    else setAnchorEl(null);
  }, [tutorialStep, activeSection]);

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

  // Start tutorial based on active section
  const startTutorial = () => {
    setTutorialStep(0);
    setFadeIn(true);
  };

  // Helper component for facts
  function Fact({ label, value }: { label: string; value: string }) {
    return (
      <Box sx={{ p: 2, bgcolor: "#fff", borderRadius: 2 }}>
        <Typography variant="caption" sx={{ color: "#6b7280" }}>
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: "bold" }}>
          {value}
        </Typography>
      </Box>
    );
  }

  // Get page title based on active section
  const getPageTitle = () => {
    switch (activeSection) {
      case "skills": return "Candidate Skills";
      case "experience": return "Candidate Experience";
      default: return "Candidate Summary";
    }
  };

  // Get tutorial steps based on active section
  const getTutorialContent = () => {
    const steps = {
      summary: [
        {
          title: "Project Fit",
          content: "This section shows how well the candidate fits technical and collaborative projects."
        },
        {
          title: "Key Technologies", 
          content: "Here you can see the candidate's key technologies and skills."
        }
      ],
      skills: [
        {
          title: "Skills List",
          content: "This section shows the candidate's technical skills. You can remove manually added skills by clicking the X."
        },
        {
          title: "Add Skill",
          content: "Use this input to add a new skill to the candidate's profile."
        }
      ],
      experience: [
        {
          title: "Work History",
          content: "This section shows the candidate's previous work experience and roles."
        }
      ]
    };

    return steps[activeSection as keyof typeof steps] || steps.summary;
  };

  const tutorialContent = getTutorialContent();

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
          sx={{ bgcolor: "#232A3B ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            {/* Left: Logo */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  ml: 2,
                  fontWeight: "bold",
                }}
              >
                {getPageTitle()}
              </Typography>
            </Box>
            {/* Right: Icons */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {/* Tutorial icon */}
              <Tooltip title="Run Tutorial" arrow>
                <IconButton
                  onClick={startTutorial}
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
                      ? `${user.first_name} ${user.last_name || ""} (${
                          user.role || "User"
                        })`
                      : (user.username || user.email) +
                        (user.role ? ` (${user.role})` : "")
                    : "User"}
                </Typography>
              </Box>
              {/* Logout */}
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
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  mb: 1,
                }}
              >
                {tutorialStep < tutorialContent.length ? tutorialContent[tutorialStep].title : "Tutorial Complete"}
              </Typography>
              <Typography sx={{ mb: 2 }}>
                {tutorialStep < tutorialContent.length ? tutorialContent[tutorialStep].content : "You've completed the tutorial for this section."}
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
                  {tutorialStep < tutorialContent.length - 1 ? (
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
          <Typography
            variant="h4"
            sx={{
              fontFamily: "Helvetica, sans-serif",
              fontWeight: "bold",
              mb: 2,
            }}
          >
            {candidate.name}
            {candidateId ? ` (ID ${candidateId})` : ""}
          </Typography>

          {/* Tabs Section */}
          <Box sx={{ display: "flex", gap: 3, mb: 4 }}>
            {[
              { label: "Summary", key: "summary" },
              { label: "Skills", key: "skills" },
              { label: "Experience", key: "experience" },
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
            <Typography variant="body2">
              Email:{" "}
              <Link href={`mailto:${candidate.email}`}>{candidate.email}</Link>
            </Typography>
            <Typography variant="body2">
              Phone:{" "}
              <Link href={`tel:${candidate.phone}`}>{candidate.phone}</Link>
            </Typography>
          </Popover>

          {/* Summary Section */}
          {activeSection === "summary" && (
            <>
              {/* Project Fit & Contact Info */}
              <Paper
                elevation={6}
                sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
                ref={techRef}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  Project Fit & Contact Info
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {fitLoading && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" sx={{ color: "#555" }}>
                        Loading project fit...
                      </Typography>
                    </Box>
                  )}
                  {!fitLoading && fitError && (
                    <Typography variant="body2" sx={{ color: "#b00020" }}>
                      Error: {fitError}
                    </Typography>
                  )}
                  {!fitLoading && !fitError && projectFit?.type && (
                    <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                      Best Fit Project Type: {projectFit.type}
                      {projectFit.confidence && (
                        <span
                          style={{
                            color: "#08726a",
                            fontWeight: "normal",
                            marginLeft: 8,
                          }}
                        >
                          ({Math.round(projectFit.confidence * 100)}%
                          confidence)
                        </span>
                      )}
                    </Typography>
                  )}
                  {!fitLoading && !fitError && projectFit?.basis && projectFit.basis.length > 0 && (
                    <Typography variant="body2" sx={{ color: "#555" }}>
                      Basis: {projectFit.basis.join(", ")}
                    </Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: "bold", mb: 1 }}
                  >
                    Contact Details
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <Fact
                      label="Name"
                      value={
                        projectFit?.personal_info?.name || candidate.name || "-"
                      }
                    />
                    <Fact
                      label="Email"
                      value={
                        projectFit?.personal_info?.email ||
                        candidate.email ||
                        "-"
                      }
                    />
                    <Fact
                      label="Phone"
                      value={
                        projectFit?.personal_info?.phone ||
                        candidate.phone ||
                        "-"
                      }
                    />
                  </Box>
                </Box>
              </Paper>

              {/* CV Summary Section */}
              <Paper
                elevation={6}
                sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  CV Summary
                </Typography>
                <TextField
                  value={
                    summaryLoading
                      ? "Loading summary..."
                      : summaryError
                      ? `Error: ${summaryError}`
                      : summaryData?.summary
                      ? summaryData.summary
                      : "No summary available."
                  }
                  multiline
                  minRows={6}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  sx={{
                    "& .MuiOutlinedInput-root": { bgcolor: "#edededff" },
                  }}
                />
              </Paper>
            </>
          )}

          {/* Skills Section */}
          {activeSection === "skills" && (
            <Paper
              elevation={6}
              sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  mb: 2,
                }}
              >
                Technical Skills
              </Typography>

              {skillsLoading && (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, pb: 1 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ color: "#555" }}>
                    Loading skills...
                  </Typography>
                </Box>
              )}

              {!skillsLoading && skillsError && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ color: "#b00020", mb: 1 }}>
                    Error: {skillsError}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSkillsLoading(true);
                      setSkillsError(null);
                      // Retry logic would go here
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Retry
                  </Button>
                </Box>
              )}

              {/* Skills List */}
              <Box
                ref={skillsListRef}
                sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 3 }}
              >
                {[...skillsData, ...manualSkills].map((tech, idx) => (
                  <Chip
                    key={idx}
                    label={tech}
                    onDelete={
                      manualSkills.includes(tech) 
                        ? () => handleDeleteSkill(tech)
                        : undefined
                    }
                    size="small"
                    sx={{
                      bgcolor: "#08726aff",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  />
                ))}
                {!skillsLoading && !skillsError && skillsData.length === 0 && manualSkills.length === 0 && (
                  <Typography variant="body2" sx={{ color: "#555" }}>
                    No skills found.
                  </Typography>
                )}
              </Box>

              {/* Add Skill Section */}
              <Box ref={addSkillRef} sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Add new skill"
                  variant="outlined"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  sx={{ flexGrow: 1 }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSkill();
                    }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddSkill}
                  sx={{ bgcolor: "#08726aff" }}
                >
                  Add
                </Button>
              </Box>
            </Paper>
          )}

          {/* Experience Section */}
          {activeSection === "experience" && (
            <Paper
              elevation={6}
              sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
              ref={workHistoryRef}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  mb: 2,
                }}
              >
                Experience
              </Typography>

              {experienceLoading && (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ color: "#555" }}>
                    Loading experience...
                  </Typography>
                </Box>
              )}

              {!experienceLoading && experienceError && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ color: "#b00020", mb: 1 }}>
                    Error: {experienceError}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ textTransform: "none" }}
                    onClick={() => {
                      // Retry logic would go here
                    }}
                  >
                    Retry
                  </Button>
                </Box>
              )}

              {!experienceLoading &&
                !experienceError &&
                experienceData.length === 0 && (
                  <Typography variant="body2" sx={{ color: "#555" }}>
                    No experience entries found.
                  </Typography>
                )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {experienceData.map((line, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 1.2,
                      bgcolor: "#ffffff",
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    <Chip
                      label={idx + 1}
                      size="small"
                      sx={{
                        bgcolor: "#08726a",
                        color: "#fff",
                        fontWeight: "bold",
                        height: 22,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#333",
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {line}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>
          )}

          {/* Snackbar */}
          <Snackbar
            open={snack.open}
            autoHideDuration={2500}
            onClose={() => setSnack({ open: false, msg: "" })}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              severity="success"
              variant="filled"
              sx={{ bgcolor: "#08726a" }}
            >
              {snack.msg}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
    </Box>
  );
}