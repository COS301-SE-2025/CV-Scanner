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

  // Logout handler: invalidate server session, clear local client state and notify other tabs
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore network errors
    }
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      // notify other tabs / ProtectedRoute to re-check auth
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  // Candidate meta (replace with real data from your API later)
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

  // --- summary fetch state (unchanged) ---
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
    // Auto-recover: if no id but we have a stored one, redirect
    if (!candidateId) {
      const last = localStorage.getItem("lastCandidateId");
      if (last) {
        navigate(`/candidate/${last}/summary`, { replace: true });
        return;
      }
      // No recovery path: stop loading, but don't spam a permanent error if user will click something else
      setSummaryLoading(false);
      setSummaryError("No candidate selected. Open a candidate from the list.");
      return;
    }
    // Persist resolved id
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

  // --- skills fetch state ---
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

        // Support both single object and accidental array fallback
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
        // Clean & dedupe
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

  // --- experience fetch state ---
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

        // Support object or accidental list
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
  const techRef = useRef<HTMLDivElement>(null);

  // both tutorial steps now anchor to the Key Technologies area
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

  // ---------- Main render ----------
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
              {/* Optional title next to logo */}
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  ml: 2,
                  fontWeight: "bold",
                }}
              >
                Candidate Summary
              </Typography>
            </Box>
            {/* Right: Icons */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
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
          {/* HEADER STRIP */}

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

          {/* Project Fit & Summary-only sections */}
          {activeSection === "summary" && (
            <>
              {/* Project Fit now displays contact info */}
              <Paper
                elevation={6}
                sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  Project Fit & Contact Info
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {projectFit?.type && (
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
                  {projectFit?.basis && projectFit.basis.length > 0 && (
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
              {/* Resume & Links / CV Summary Section */}
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

          {/* Skills Tab Section */}
          {activeSection === "skills" && (
            <Paper
              elevation={6}
              sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
              ref={techRef}
            >
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  mb: 2,
                }}
              >
                Key Technologies
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
                      (async () => {
                        try {
                          const res = await apiFetch(
                            `/cv/${candidateId}/skills`,
                            {
                              headers: { Accept: "application/json" },
                            }
                          );
                          if (!res.ok)
                            throw new Error(
                              (await res.text()) || `HTTP ${res.status}`
                            );
                          const json = await res.json();
                          let skills: any;
                          if (Array.isArray(json)) {
                            let match: any = null;
                            for (const c of json as any[]) {
                              if (
                                String((c as any).id) === String(candidateId)
                              ) {
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
                          setSkillsData(unique);
                        } catch (e: any) {
                          setSkillsError(e.message || "Failed to load skills");
                        } finally {
                          setSkillsLoading(false);
                        }
                      })();
                    }}
                    sx={{ textTransform: "none" }}
                  >
                    Retry
                  </Button>
                </Box>
              )}

              {!skillsLoading && !skillsError && skillsData.length === 0 && (
                <Typography variant="body2" sx={{ color: "#555" }}>
                  No skills found.
                </Typography>
              )}

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {skillsData.map((tech, idx) => (
                  <Chip
                    key={idx}
                    label={tech}
                    size="small"
                    sx={{
                      bgcolor: "#08726aff",
                      color: "#fff",
                      fontWeight: "bold",
                    }}
                  />
                ))}
              </Box>
            </Paper>
          )}

          {/* Experience Tab Section */}
          {activeSection === "experience" && (
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
                      // simple retry: force effect rerun by toggling section temporarily
                      setExperienceLoading(true);
                      setExperienceError(null);
                      (async () => {
                        try {
                          const res = await apiFetch(
                            `/cv/${candidateId}/experience`,
                            {
                              headers: { Accept: "application/json" },
                            }
                          );
                          if (!res.ok)
                            throw new Error(
                              (await res.text()) || `HTTP ${res.status}`
                            );
                          const json = await res.json();
                          let exp: any;
                          if (Array.isArray(json)) {
                            const match = json.find(
                              (c: any) => String(c.id) === String(candidateId)
                            );
                            exp = match?.experience;
                          } else exp = json.experience;
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
                          setExperienceError(
                            e.message || "Failed to load experience"
                          );
                        } finally {
                          setExperienceLoading(false);
                        }
                      })();
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

          {/* Snackbar (keep INSIDE the Candidate Details box) */}
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
