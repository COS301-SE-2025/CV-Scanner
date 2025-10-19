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
  Pagination,
  Alert,
  Snackbar,
  CircularProgress,
  Modal,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo2 from "../assets/logo2.png";
import logo from "../assets/logo.png";
import logoNavbar from "../assets/logoNavbar.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Sidebar from "./Sidebar";
import ConfigViewer from "./ConfigViewer";
import { apiFetch, aiFetch } from "../lib/api";

export default function Search() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [lastAppliedQuery, setLastAppliedQuery] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedFits, setSelectedFits] = useState<string[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<string[]>([]);
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [processingCandidates, setProcessingCandidates] = useState<string[]>(
    []
  );
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 5;
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Replace hard-coded candidates with data from API
  type ApiCandidate = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    project?: string;
    skills: string[];
    receivedAt?: string;
    match?: string;
    cvFileUrl?: string;
    cvFileType?: string;
  };

  // Add filename + id to card
  type CandidateCard = {
    id: number;
    name: string;
    email: string;
    skills: string[];
    project: string;
    uploaded: string;
    match: string;
    initials: string;
    details: string[];
    fit?: string;
    cvFileUrl?: string;
    cvFileType?: string;
    filename?: string | null;
    score: number;
    projectFit?: any;
    projectFitPercent?: number | null;
  };

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle helper for checkbox filters
  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function scoreColor(value: number) {
    const v = Math.max(0, Math.min(10, value));
    const hue = (v / 10) * 120;
    return `hsl(${hue} 70% 45%)`;
  }

  function ScoreRing({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(10, value));
    const pct = clamped * 10;
    const ringColor = scoreColor(clamped);
    const isPerfect = clamped === 10;

    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        {/* Track */}
        <CircularProgress
          variant="determinate"
          value={100}
          size={56}
          thickness={4}
          sx={{ color: "rgba(0,0,0,0.08)" }}
        />
        {/* Progress (colored ring) */}
        <CircularProgress
          variant="determinate"
          value={pct}
          size={56}
          thickness={4}
          sx={{
            color: ringColor,
            position: "absolute",
            left: 0,
            ...(isPerfect && {
              filter: "drop-shadow(0 0 6px rgba(0, 255, 0, 0.6))",
            }),
          }}
        />
        {/* Center label (black text) */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ lineHeight: 1, fontWeight: 800, color: "#000" }}
          >
            {clamped}/10
          </Typography>
          <Typography variant="caption" sx={{ color: "#000" }}>
            Score
          </Typography>
        </Box>
      </Box>
    );
  }

  // Handler for checkbox groups
  function handleCheckboxChange(
    kind: "skill" | "fit" | "detail",
    value: string
  ) {
    if (kind === "skill") setSelectedSkills((s) => toggle(s, value));
    else if (kind === "fit") setSelectedFits((s) => toggle(s, value));
    else setSelectedDetails((s) => toggle(s, value));
  }

  // Derived list used by render
  const filteredCandidates = useMemo(() => {
    const text = searchTerm.toLowerCase();
    return candidates.filter((c) => {
      const matchesText =
        c.name.toLowerCase().includes(text) ||
        c.email.toLowerCase().includes(text) ||
        c.skills.some((s) => s.toLowerCase().includes(text));

      const matchesSkills =
        selectedSkills.length === 0 ||
        selectedSkills.some((skill) =>
          c.skills.map((s) => s.toLowerCase()).includes(skill.toLowerCase())
        );

      const matchesFit =
        selectedFits.length === 0 ||
        (c.fit ? selectedFits.includes(c.fit) : true);

      const matchesDetails =
        selectedDetails.length === 0 ||
        selectedDetails.some((d) => c.details.includes(d));

      return matchesText && matchesSkills && matchesFit && matchesDetails;
    });
  }, [searchTerm, selectedSkills, selectedFits, selectedDetails, candidates]);

  // PAGINATION: slice filteredCandidates to only show 5 per page
  const paginatedCandidates = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE;
    return filteredCandidates.slice(start, start + USERS_PER_PAGE);
  }, [filteredCandidates, page]);

  function initialsOf(first?: string, last?: string) {
    const a = (first || "").trim();
    const b = (last || "").trim();
    const init = (a[0] || "") + (b[0] || "");
    return init.toUpperCase() || "NA";
  }
  function relativeFrom(iso?: string) {
    if (!iso) return "Unknown";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }
  function withinLast7Days(iso?: string) {
    if (!iso) return false;
    const then = new Date(iso).getTime();
    return Date.now() - then <= 7 * 24 * 60 * 60 * 1000;
  }

  const executeSearch = async (term: string) => {
    const query = term.trim();
    if (!query) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch(
        `/cv/search?query=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Search failed:", error);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Search failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlQuery = params.get("query")?.trim() || "";
    const stateQuery =
      (
        location.state as { presetQuery?: string } | undefined
      )?.presetQuery?.trim() || "";
    const nextQuery = stateQuery || urlQuery;

    if (nextQuery && nextQuery !== lastAppliedQuery) {
      setSearchTerm(nextQuery);
      setLastAppliedQuery(nextQuery);
      executeSearch(nextQuery);
    }
  }, [location.search, location.state, lastAppliedQuery]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    navigate(`/search${query ? `?query=${encodeURIComponent(query)}` : ""}`, {
      replace: true,
      state: query ? { presetQuery: query } : undefined,
    });
    if (query) executeSearch(query);
  };

  useEffect(() => {
    document.title = "Search Candidates";
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    (async () => {
      try {
        const meRes = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (meRes.ok) {
          const meData = await meRes.json().catch(() => null);
          setUser(meData);
        } else {
          setUser(null);
        }

        // Load candidates & filenames concurrently
        const [candRes, fnRes] = await Promise.all([
          apiFetch("/cv/candidates"),
          apiFetch("/cv/filenames").catch(() => null),
        ]);

        const list =
          candRes && candRes.ok ? await candRes.json().catch(() => []) : [];
        const filenames =
          fnRes && fnRes.ok ? await fnRes.json().catch(() => []) : [];

        const filenameMap = new Map<number, any>();
        if (Array.isArray(filenames)) {
          for (const f of filenames) {
            if (f && typeof f.id === "number") {
              filenameMap.set(f.id, f);
            }
          }
        }

        const mapped: CandidateCard[] = (list as ApiCandidate[]).map((c) => {
          const name =
            `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
            c.email ||
            "Unknown";
          const project = c.project || "CV";
          const uploaded = relativeFrom(c.receivedAt);
          const initials = initialsOf(c.firstName, c.lastName);
          const details: string[] = withinLast7Days(c.receivedAt)
            ? ["Last 7 Days"]
            : [];

          const fnRow = filenameMap.get(c.id);
          let filename: string | null = normalizeFilename(fnRow?.filename);
          if (!filename) filename = basenameFromUrl(fnRow?.fileUrl);
          if (!filename) filename = basenameFromUrl(c.cvFileUrl);
          if (filename && /https?:\/\//i.test(filename))
            filename = basenameFromUrl(filename);

          filename = makeFriendlyFilename(name, filename);

          return {
            id: c.id,
            name,
            email: c.email,
            skills: Array.isArray(c.skills) ? c.skills : [],
            project,
            uploaded,
            match: c.match || "N/A",
            initials,
            details,
            fit: undefined,
            cvFileUrl: c.cvFileUrl,
            cvFileType: c.cvFileType,
            filename,
            score: 0,
            projectFit: undefined,
            projectFitPercent: null,
          };
        });
        setCandidates(mapped);
        setLoading(false);

        // ✅ NEW: Fetch CV scores and project types individually for each candidate
        (async function fetchIndividualScoresAndProjectTypes() {
          try {
            // Fetch all scores and project types in parallel
            const scorePromises = mapped.map(async (cand) => {
              try {
                const scoreRes = await apiFetch(`/cv/${cand.id}/cv-score`);
                if (scoreRes.ok) {
                  const scoreData = await scoreRes.json();
                  return {
                    id: cand.id,
                    score: scoreData.cvScore ?? 0,
                  };
                }
              } catch (e) {
                console.warn(`Failed to fetch cv-score for ${cand.id}:`, e);
              }
              return { id: cand.id, score: 0 };
            });

            const projectTypePromises = mapped.map(async (cand) => {
              try {
                const ptRes = await apiFetch(`/cv/${cand.id}/project-type`);
                if (ptRes.ok) {
                  const ptData = await ptRes.json();
                  return {
                    id: cand.id,
                    projectType: ptData.projectType ?? null,
                    projectFit: ptData.projectFit ?? null,
                    projectFitPercent: ptData.projectFitPercent ?? null,
                    projectFitLabel: ptData.projectFitLabel ?? null,
                  };
                }
              } catch (e) {
                console.warn(`Failed to fetch project-type for ${cand.id}:`, e);
              }
              return {
                id: cand.id,
                projectType: null,
                projectFit: null,
                projectFitPercent: null,
                projectFitLabel: null,
              };
            });

            // Wait for all requests to complete
            const [scores, projectTypes] = await Promise.all([
              Promise.all(scorePromises),
              Promise.all(projectTypePromises),
            ]);

            // Create lookup maps
            const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
            const projectTypeMap = new Map(
              projectTypes.map((pt) => [pt.id, pt])
            );

            // Update candidates with fetched data
            setCandidates((prev) =>
              prev.map((cand) => {
                const score = scoreMap.get(cand.id) ?? cand.score;
                const pt = projectTypeMap.get(cand.id);

                // Build display label for match field
                let matchLabel = cand.match;
                if (pt) {
                  if (pt.projectFitLabel) {
                    // Use backend-provided label if available
                    matchLabel = pt.projectFitLabel;
                  } else if (pt.projectType && pt.projectFitPercent != null) {
                    // Build label: "Frontend Web App 87%"
                    matchLabel = `${pt.projectType} ${pt.projectFitPercent}%`;
                  } else if (pt.projectType) {
                    matchLabel = pt.projectType;
                  } else if (pt.projectFitPercent != null) {
                    matchLabel = `${pt.projectFitPercent}%`;
                  }
                }

                return {
                  ...cand,
                  score: Math.max(0, Math.min(10, score)),
                  fit: pt?.projectType ?? cand.fit,
                  match: matchLabel,
                  projectFit: pt?.projectFit ?? cand.projectFit,
                  projectFitPercent:
                    pt?.projectFitPercent ?? cand.projectFitPercent,
                };
              })
            );

            console.log(
              `✅ Fetched scores and project types for ${mapped.length} candidates`
            );
          } catch (e) {
            console.error(
              "Failed to fetch individual scores/project types:",
              e
            );
          }
        })();
      } catch {
        setUser(null);
        setCandidates([]);
        setLoading(false);
      }
    })();
    return;
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

  // Logout handler: invalidate server session, clear local state and notify other tabs
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

  const handleViewPdf = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    candidate: CandidateCard
  ) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/cv/${candidate.id}/pdf`, {
        headers: { Accept: "application/pdf" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `PDF fetch failed (${res.status})`);
      }
      const blob = await res.blob();
      const contentType =
        res.headers.get("content-type") || "application/octet-stream";
      const isPdf = contentType.toLowerCase().includes("pdf");
      const url = URL.createObjectURL(blob);
      if (isPdf) {
        window.open(url, "_blank", "noopener");
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = candidate.filename || "candidate-document";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      console.error("Failed to open PDF:", err);
      setSnackbar({
        open: true,
        severity: "error",
        message: err?.message || "Unable to open PDF",
      });
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      <Sidebar
        userRole={user?.role ?? "User"}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top Bar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
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
                color="inherit"
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
          </Toolbar>
        </AppBar>

        {/* Page Content */}
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              mb: 3,
              fontFamily: "Helvetica, sans-serif",
              color: "#fff",
            }}
          >
            Search Candidates
          </Typography>

          {/* Search Bar and Config Button Row */}
          <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 4 }}>
            {/* Search Bar */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
                bgcolor: "#DEDDEE",
                borderRadius: 1,
                px: 2,
                py: 1,
                fontFamily: "Helvetica, sans-serif",
              }}
              ref={searchBarRef}
            >
              <SearchIcon color="action" />
              <InputBase
                placeholder="Search by name, email, or skills..."
                sx={{
                  ml: 1,
                  flex: 1,
                  fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                }}
                fullWidth
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Box>

            {/* Config Button */}
            <Button
              variant="contained"
              onClick={() => setConfigModalOpen(true)}
              sx={{
                bgcolor: "#232A3B",
                color: "#DEDDEE",
                fontWeight: "bold",
                padding: "10px 20px",
                borderRadius: "8px",
                textTransform: "none",
                fontFamily: "Helvetica, sans-serif",
                fontSize: "1rem",
                minWidth: "140px",
                "&:hover": {
                  bgcolor: "#1a202c",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Filters & Config
            </Button>
          </Box>

          <Paper
            elevation={6}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: "#DEDDEE",
              fontFamily: "Helvetica, sans-serif",
              color: "#fff",
            }}
          >
            {/* Results Count */}
            <Typography
              variant="subtitle1"
              sx={{
                color: "#000000",
                mb: 3,
                fontWeight: "bold",
                fontFamily: "Helvetica, sans-serif",
                fontSize: "1rem",
              }}
            >
              {loading
                ? "Loading candidates..."
                : `Showing ${
                    paginatedCandidates.length > 0
                      ? `${Math.min(
                          (page - 1) * USERS_PER_PAGE + 1,
                          filteredCandidates.length
                        )}-${Math.min(
                          page * USERS_PER_PAGE,
                          filteredCandidates.length
                        )}`
                      : "0"
                  } of ${filteredCandidates.length} candidates`}
            </Typography>

            {/* Loading State */}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Candidate Cards */}
            <div ref={resultsRef}>
              {!loading && paginatedCandidates.length > 0 ? (
                <>
                  {/* Single row layout - one candidate per row */}
                  {paginatedCandidates.map((candidate, idx) => (
                    <Paper
                      key={candidate.id}
                      elevation={3}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 3,
                        backgroundColor: "#adb6be",
                        cursor: "pointer",
                        "&:hover": {
                          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                          transform: "translateY(-2px)",
                        },
                        transition: "all 0.2s ease",
                      }}
                      onClick={() =>
                        navigate(`/candidate/${candidate.id}/summary`, {
                          state: { candidate },
                        })
                      }
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 3,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "#93AFF7",
                            width: 56,
                            height: 56,
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            fontFamily: "Helvetica, sans-serif",
                          }}
                        >
                          {candidate.initials}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: "bold",
                              mb: 0.5,
                              fontFamily: "Helvetica, sans-serif",
                              fontSize: "1.2rem",
                            }}
                          >
                            {candidate.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 1,
                              color: "#000000",
                              fontFamily: "Helvetica, sans-serif",
                            }}
                          >
                            Email: {candidate.email}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 1.5,
                              color: "#000000",
                              fontFamily: "Helvetica, sans-serif",
                            }}
                          >
                            Uploaded: {candidate.uploaded}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              mb: 1.0,
                              color: "#000000",
                              fontFamily: "Helvetica, sans-serif",
                              fontSize: "0.95rem",
                              fontWeight: "bold",
                            }}
                          >
                            File: {candidate.filename || "N/A"}
                          </Typography>

                          {/* Skills with limit and View All - Same as Manage page */}
                          <Box sx={{ mb: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                                mb: 0.5,
                              }}
                            >
                              {candidate.skills.slice(0, 5).map((skill, i) => (
                                <Chip
                                  key={i}
                                  label={skill}
                                  size="small"
                                  sx={{
                                    backgroundColor: "#93AFF7",
                                    fontFamily: "Helvetica, sans-serif",
                                    fontWeight: "bold",
                                    color: "#0D1B2A",
                                    fontSize: "0.85rem",
                                  }}
                                />
                              ))}
                              {candidate.skills.length > 5 && (
                                <Chip
                                  label={`+${candidate.skills.length - 5} more`}
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent navigation when clicking the chip
                                    setSnackbar({
                                      open: true,
                                      message: `All skills for ${
                                        candidate.name
                                      }: ${candidate.skills.join(", ")}`,
                                      severity: "success",
                                    });
                                  }}
                                  sx={{
                                    backgroundColor: "#e0e0e0",
                                    fontFamily: "Helvetica, sans-serif",
                                    fontWeight: "bold",
                                    color: "#666",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    "&:hover": {
                                      backgroundColor: "#d0d0d0",
                                    },
                                  }}
                                />
                              )}
                            </Box>
                            {candidate.skills.length > 5 && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: "#666",
                                  fontFamily: "Helvetica, sans-serif",
                                  fontSize: "0.9rem",
                                  fontStyle: "italic",
                                }}
                              >
                                Click "+X more" to view all skills
                              </Typography>
                            )}
                          </Box>

                          <Typography
                            variant="body2"
                            sx={{
                              color: "#204E20",
                              fontWeight: "bold",
                              fontFamily: "Helvetica, sans-serif",
                            }}
                          >
                            Match: {candidate.match} | Score: {candidate.score}
                            /10
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          {/* Score ring and match */}
                          <ScoreRing value={candidate.score} />
                          <Typography
                            variant="body2"
                            sx={{
                              color: "#204E20",
                              fontWeight: "bold",
                              mt: 0.5,
                            }}
                          >
                            {candidate.match}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={(e) => handleViewPdf(e, candidate)}
                            sx={{
                              mt: 1,
                              textTransform: "none",
                              fontWeight: "bold",
                              bgcolor: "#232A3B",
                              "&:hover": { bgcolor: "#0f1623" },
                            }}
                          >
                            View PDF
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))}

                  {/* Pagination */}
                  <Box
                    sx={{ display: "flex", justifyContent: "center", mt: 2 }}
                  >
                    <Pagination
                      count={Math.max(
                        1,
                        Math.ceil(filteredCandidates.length / USERS_PER_PAGE)
                      )}
                      page={page}
                      onChange={(_, value) => setPage(value)}
                      color="primary"
                      size="large"
                      sx={{
                        "& .MuiPaginationItem-root": {
                          color: "#204E20",
                          fontWeight: "bold",
                        },
                      }}
                    />
                  </Box>
                </>
              ) : (
                !loading && (
                  <Typography
                    variant="body1"
                    sx={{
                      mt: 2,
                      fontStyle: "italic",
                      color: "#555",
                      fontFamily: "Helvetica, sans-serif",
                      fontSize: "1rem",
                    }}
                  >
                    No results found. Try adjusting your search or filters.
                  </Typography>
                )
              )}
            </div>
          </Paper>
        </Box>
      </Box>

      {/* Config Modal */}
      <Dialog
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: "#f5f5f5",
            fontFamily: "Helvetica, sans-serif",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#232A3B",
            color: "white",
            fontFamily: "Helvetica, sans-serif",
            fontWeight: "bold",
            fontSize: "1.25rem",
          }}
        >
          Filters & Configuration
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <ConfigViewer />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setConfigModalOpen(false)}
            sx={{
              textTransform: "none",
              fontFamily: "Helvetica, sans-serif",
              fontWeight: "bold",
              color: "#232A3B",
              "&:hover": {
                bgcolor: "rgba(35, 42, 59, 0.1)",
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

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
                  <b>email</b>, or <b>skills</b>.
                </Typography>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Filters & Config
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Click the <b>Filters & Config</b> button to access advanced
                  filtering options and configuration settings.
                </Typography>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Results
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Here you'll see the candidates that match your search and
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

      {/* Snackbar for skills display */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            bgcolor: snackbar.severity === "success" ? "#4caf50" : "#f44336",
            color: "white",
            fontFamily: "Helvetica, sans-serif",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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

function basenameFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    // Strip query/hash then take last segment
    const clean = url.split("#")[0].split("?")[0];
    const seg = clean.split("/").pop();
    if (!seg) return null;
    return seg.trim() || null;
  } catch {
    return null;
  }
}

function normalizeFilename(raw?: string | null) {
  if (!raw) return null;
  // If it accidentally contains a full URL, reduce it
  if (/https?:\/\//i.test(raw)) {
    return basenameFromUrl(raw);
  }
  return raw.trim() || null;
}

function isUuid(str?: string | null) {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    str.trim()
  );
}

function hasExtension(name?: string | null) {
  if (!name) return false;
  return /\.[A-Za-z0-9]{2,6}$/.test(name);
}

function makeFriendlyFilename(candidateName: string, original?: string | null) {
  const safeBase =
    candidateName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .join("_")
      .replace(/[^A-Za-z0-9_]/g, "") || "Candidate";

  // If nothing provided, fabricate a default
  if (!original) return `${safeBase}_CV.pdf`;

  // Trim & reduce any accidental URL to its basename
  let name = (original || "").trim();
  name = basenameFromUrl(name) || name;

  // Extract extension (if any)
  let ext = "";
  let base = name;
  const extMatch = name.match(/\.([A-Za-z0-9]{2,6})$/);
  if (extMatch) {
    ext = `.${extMatch[1]}`;
    base = name.slice(0, -ext.length);
  }

  // Fallback extension if missing
  if (!ext) ext = ".pdf";

  // Clean base
  base = base
    .replace(/[^A-Za-z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = safeBase;

  // If the base is just a UUID or a very generic word, replace with candidate-based name
  if (isUuid(base) || /^(resume|cv|document|file)$/i.test(base)) {
    base = `${safeBase}_CV`;
  }

  // Limit length to avoid filesystem issues
  if (base.length > 60) base = base.slice(0, 60);

  return `${base}${ext}`;
}
