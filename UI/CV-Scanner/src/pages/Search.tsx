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
import logo from "../assets/logo.png";
import logoNavbar from "../assets/logoNavbar.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Sidebar from "./Sidebar";

export default function Search() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
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
  ); // use email as ID

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
  };

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);

  // Toggle helper for checkbox filters
  function toggle(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
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
    const text = searchText.toLowerCase();
    return candidates.filter((c) => {
      const matchesText =
        c.name.toLowerCase().includes(text) ||
        c.project.toLowerCase().includes(text) ||
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
  }, [searchText, selectedSkills, selectedFits, selectedDetails, candidates]);

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

  useEffect(() => {
    document.title = "Search Candidates";
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));

    // Load candidates & filenames concurrently
    Promise.all([
      fetch("http://localhost:8081/cv/candidates").then((r) => {
        if (!r.ok) throw new Error("Failed candidates");
        return r.json();
      }),
      fetch("http://localhost:8081/cv/filenames")
        .then((r) => {
          if (!r.ok) throw new Error("Failed filenames");
          return r.json();
        })
        .catch(() => []), // tolerate filename endpoint failure
    ])
      .then(([list, filenames]) => {
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

          // Transform ugly GUID / no-extension names into friendly form
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
          };
        });
        setCandidates(mapped);
      })
      .catch(() => setCandidates([]));
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
  const reExtractCandidate = async (candidate: CandidateCard) => {
    const email = candidate.email;
    if (!email) return;

    const CONFIG_BASE = "http://localhost:8081"; // Ensure this is defined

    setProcessingCandidates((prev) => [...prev, email]);

    try {
      const res = await fetch(`${CONFIG_BASE}/cv/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert({
          open: true,
          message: j.detail || `Failed to process CV (${res.status})`,
        });
        return;
      }

      const processedCV = await res.json();
      navigate("/parsed-cv", { state: { cv: processedCV, candidate } });
    } catch (e) {
      alert({ open: true, message: "Error processing CV." });
    } finally {
      setProcessingCandidates((prev) => prev.filter((e) => e !== email));
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
          {/* Search Bar */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 4,
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
              placeholder="Search by name, skills, or project type..."
              sx={{
                ml: 1,
                flex: 1,
                fontFamily: "Helvetica, sans-serif",
                fontSize: "1rem",
              }}
              fullWidth
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
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
            {/* Filters */}
            <Box sx={{ display: "flex", gap: 6, mb: 4 }} ref={checkboxesRef}>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#000000ff",
                    fontWeight: "bold",
                    mb: 2,
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                  }}
                >
                  Primary Skills
                </Typography>
                <FormGroup sx={{ color: "#000000ff" }}>
                  {[".NET", "Java", "React", "Azure"].map((skill) => (
                    <FormControlLabel
                      key={skill}
                      control={
                        <Checkbox
                          checked={selectedSkills.includes(skill)}
                          onChange={() => handleCheckboxChange("skill", skill)}
                          sx={{
                            color: "#204E20", // green
                            "&.Mui-checked": { color: "#204E20" }, //green
                          }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          {skill}
                        </Typography>
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#000000ff",
                    fontWeight: "bold",
                    mb: 2,
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                  }}
                >
                  Project Fit
                </Typography>
                <FormGroup sx={{ color: "#000000ff" }}>
                  {["Technical", "Collaborative", "Business"].map((fit) => (
                    <FormControlLabel
                      key={fit}
                      control={
                        <Checkbox
                          checked={selectedFits.includes(fit)}
                          onChange={() => handleCheckboxChange("fit", fit)}
                          sx={{
                            color: "#204E20", //green
                            "&.Mui-checked": { color: "#204E20" }, //green
                          }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          {fit}
                        </Typography>
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "#000000ff",
                    fontWeight: "bold",
                    mb: 2,
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                  }}
                >
                  Upload Details
                </Typography>
                <FormGroup sx={{ color: "#000000ff" }}>
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
                            color: "#204E20", //green
                            "&.Mui-checked": { color: "#204E20" }, //green
                          }}
                        />
                      }
                      label={
                        <Typography
                          sx={{
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          {detail}
                        </Typography>
                      }
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Results Count */}
            <Typography
              variant="subtitle1"
              sx={{
                color: "#000000ff",
                mb: 3,
                fontWeight: "bold",
                fontFamily: "Helvetica, sans-serif",
                fontSize: "1rem",
              }}
            >
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
                      backgroundColor: "#adb6beff",
                      cursor: "pointer", // Shows it's clickable
                      "&:hover": {
                        boxShadow: "0 4px 8px rgba(0,0,0,0.2)", // Visual feedback

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
                      sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}
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
                          variant="body1"
                          sx={{
                            mb: 1,
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          {candidate.project}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 1.5,
                            color: "#black",
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          Uploaded: {candidate.uploaded}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            mb: 1.0,
                            color: "#204E20",
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "0.95rem",
                            fontWeight: "bold",
                          }}
                        >
                          File: {candidate.filename || "N/A"}
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
                              sx={{
                                backgroundColor: "#93AFF7",
                                fontFamily: "Helvetica, sans-serif",
                                fontSize: "1rem",
                                fontWeight: "bold",
                                color: "#204E20",
                              }}
                            />
                          ))}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: "#204E20",
                            fontWeight: "bold",
                            fontFamily: "Helvetica, sans-serif",
                            fontSize: "1rem",
                          }}
                        >
                          Match: {candidate.match}
                        </Typography>
                      </Box>
                      <Box sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation(); // Prevents triggering the Paper onClick

                            // Show loading state if needed
                            if (processingCandidates.includes(candidate.email))
                              return;

                            // Add candidate to processing list
                            setProcessingCandidates((prev) => [
                              ...prev,
                              candidate.email,
                            ]);

                            try {
                              // Fetch processed data from your backend
                              const response = await fetch(
                                `http://localhost:5000/upload_cv_for_candidate?email=${encodeURIComponent(
                                  candidate.email
                                )}&top_k=3`
                              );
                              const data = await response.json();

                              // Prepare payload (mimic UploadCVPage)
                              const payload = data?.data ?? data;

                              // Navigate to Parsed CV page
                              navigate("/parsed-cv", {
                                state: {
                                  processedData: payload,
                                  fileUrl: candidate.cvFileUrl, // must exist
                                  fileType: candidate.cvFileType, // must exist
                                  candidate: {
                                    firstName: candidate.name.split(" ")[0],
                                    lastName:
                                      candidate.name.split(" ")[1] || "",
                                    email: candidate.email,
                                  },
                                },
                              });
                            } catch (error) {
                              console.error(
                                "Failed to re-extract candidate:",
                                error
                              );
                            } finally {
                              // Remove candidate from processing list
                              setProcessingCandidates((prev) =>
                                prev.filter(
                                  (email) => email !== candidate.email
                                )
                              );
                            }
                          }}
                          disabled={processingCandidates.includes(
                            candidate.email
                          )}
                          sx={{ textTransform: "none" }}
                        >
                          {processingCandidates.includes(candidate.email)
                            ? "Processing..."
                            : "Re-Extract"}
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))
              ) : (
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
  if (!original) return `${safeBase}_CV.pdf`;
  if (isUuid(original) || !hasExtension(original)) {
    // Try to extract extension from any hidden pattern, else default .pdf
    let extMatch = original.match(/\.([A-Za-z0-9]{2,6})$/);
    const ext = extMatch ? `.${extMatch[1]}` : ".pdf";
    return `${safeBase}_CV${ext}`;
  }
  return original;
}
