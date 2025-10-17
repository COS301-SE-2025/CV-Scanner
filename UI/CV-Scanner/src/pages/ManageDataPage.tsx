// ManageData.tsx
import {
  Box,
  Typography,
  Paper,
  Button,
  InputBase,
  Avatar,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import Sidebar from "./Sidebar";
import RoleBasedAccess from "../components/RoleBaseAccess";
import { apiFetch } from "../lib/api";

// Types matching your JSON structure
type PersonalInfo = {
  email: string;
  name: string;
  phone: string;
};

type Sections = {
  education: string;
  experience: string;
  projects: string;
};

type CandidateData = {
  filename: string;
  result: {
    cv_score: number;
    personal_info: PersonalInfo;
    project_fit: number;
    project_type: string;
    sections: Sections;
    skills: string[];
    summary: string;
  };
  status: string;
};

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
  cvFileUrl?: string;
  cvFileType?: string;
  filename?: string | null;
  score: number;
  projectFit?: any;
  projectFitPercent?: number | null;
  fit?: string;
};

export default function ManageData() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateCard[]>(
    []
  );
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateCard | null>(null);
  const [candidateData, setCandidateData] = useState<CandidateData | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });
  const [loading, setLoading] = useState(false);
  const [loadingCandidateData, setLoadingCandidateData] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: [] as string[],
    summary: "",
    project_type: "",
    project_fit: 0,
    education: "",
    experience: "",
    projects: "",
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      const email = localStorage.getItem("userEmail") || "admin@email.com";
      try {
        const meRes = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (meRes.ok) {
          const meData = await meRes.json();
          setUser(meData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  // ---- ScoreRing (copied/simplified from Search.tsx) ----
  function scoreColor(value: number) {
    const v = Math.max(0, Math.min(10, value));
    const hue = (v / 10) * 120; // 0..10 → red..green
    return `hsl(${hue} 70% 45%)`;
  }

  function ScoreRing({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(10, value));
    const pct = clamped * 10;
    const ringColor = scoreColor(clamped);
    const isPerfect = clamped === 10;

    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={56}
          thickness={4}
          sx={{ color: "rgba(0,0,0,0.08)" }}
        />
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
  // -------------------------------------------------------

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      setLoading(true);
      try {
        const candRes = await apiFetch("/cv/candidates");
        if (candRes.ok) {
          const list = await candRes.json();
          const mapped: CandidateCard[] = list.map((c: any) => ({
            id: c.id,
            name:
              `${c.firstName || ""} ${c.lastName || ""}`.trim() ||
              c.email ||
              "Unknown",
            email: c.email,
            skills: Array.isArray(c.skills) ? c.skills : [],
            project: c.project || "CV",
            uploaded: relativeFrom(c.receivedAt),
            match: c.match || "N/A",
            initials: initialsOf(c.firstName, c.lastName),
            details: withinLast7Days(c.receivedAt) ? ["Last 7 Days"] : [],
            cvFileUrl: c.cvFileUrl,
            cvFileType: c.cvFileType,
            filename: c.filename,
            score: c.score || 0,
            projectFit: c.projectFit ?? null,
            projectFitPercent: c.projectFitPercent ?? null,
            fit: c.project ?? undefined,
          }));
          setCandidates(mapped);
          setFilteredCandidates(mapped);

          // Fetch individual scores and project-type info (update candidates dynamically)
          (async function fetchIndividualScoresAndProjectTypes() {
            try {
              const scorePromises = mapped.map(async (cand) => {
                try {
                  const res = await apiFetch(`/cv/${cand.id}/cv-score`);
                  if (res && res.ok) {
                    const j = await res.json().catch(() => null);
                    return { id: cand.id, score: j?.cvScore ?? j?.score ?? 0 };
                  }
                } catch (e) {
                  console.warn(`cv-score fetch failed for ${cand.id}:`, e);
                }
                return { id: cand.id, score: 0 };
              });

              const projectTypePromises = mapped.map(async (cand) => {
                try {
                  const res = await apiFetch(`/cv/${cand.id}/project-type`);
                  if (res && res.ok) {
                    const j = await res.json().catch(() => null);
                    return {
                      id: cand.id,
                      projectType: j?.projectType ?? j?.type ?? null,
                      projectFit: j?.projectFit ?? j?.project_fit ?? null,
                      projectFitPercent:
                        j?.projectFitPercent ?? j?.project_fit_percent ?? null,
                      projectFitLabel:
                        j?.projectFitLabel ?? j?.projectFitLabel ?? null,
                    };
                  }
                } catch (e) {
                  console.warn(`project-type fetch failed for ${cand.id}:`, e);
                }
                return {
                  id: cand.id,
                  projectType: null,
                  projectFit: null,
                  projectFitPercent: null,
                  projectFitLabel: null,
                };
              });

              const [scores, projectTypes] = await Promise.all([
                Promise.all(scorePromises),
                Promise.all(projectTypePromises),
              ]);

              const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
              const projectTypeMap = new Map(
                projectTypes.map((p) => [p.id, p])
              );

              setCandidates((prev) =>
                prev.map((c) => {
                  const score = scoreMap.get(c.id) ?? c.score;
                  const pt = projectTypeMap.get(c.id);
                  let matchLabel = c.match;
                  if (pt) {
                    if (pt.projectFitLabel) matchLabel = pt.projectFitLabel;
                    else if (pt.projectType && pt.projectFitPercent != null)
                      matchLabel = `${pt.projectType} ${pt.projectFitPercent}%`;
                    else if (pt.projectType) matchLabel = pt.projectType;
                    else if (pt.projectFitPercent != null)
                      matchLabel = `${pt.projectFitPercent}%`;
                  }
                  return {
                    ...c,
                    score: Math.max(0, Math.min(10, score)),
                    fit: pt?.projectType ?? c.fit,
                    match: matchLabel,
                    projectFit: pt?.projectFit ?? c.projectFit,
                    projectFitPercent:
                      pt?.projectFitPercent ?? c.projectFitPercent,
                  };
                })
              );
            } catch (e) {
              console.error(
                "Failed to fetch individual scores/project types:",
                e
              );
            }
          })();
        }
      } catch (error) {
        console.error("Failed to load candidates:", error);
        showSnackbar("Failed to load candidates", "error");
      } finally {
        setLoading(false);
      }
    };

    loadCandidates();
  }, []);

  // Filter candidates based on search
  useEffect(() => {
    const text = searchText.toLowerCase();
    const filtered = candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(text) ||
        c.email.toLowerCase().includes(text) ||
        c.skills.some((s) => s.toLowerCase().includes(text))
    );
    setFilteredCandidates(filtered);
  }, [searchText, candidates]);

  // Helper functions
  function initialsOf(first?: string, last?: string) {
    const a = (first || "").trim();
    const b = (last || "").trim();
    return (a[0] || "") + (b[0] || "").toUpperCase() || "NA";
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

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  // Load candidate data for editing
  const loadCandidateData = async (candidate: CandidateCard) => {
    try {
      setSelectedCandidate(candidate);
      setCandidateData(null);
      setEditDialogOpen(true);
      setLoadingCandidateData(true);

      // Use endpoints that exist on the API
      const summaryPromise = apiFetch(`/cv/${candidate.id}/summary`);
      const expPromise = apiFetch(`/cv/${candidate.id}/experience`);
      const scorePromise = apiFetch(`/cv/${candidate.id}/cv-score`);
      const projectTypePromise = apiFetch(`/cv/${candidate.id}/project-type`);
      const skillsPromise = apiFetch(`/cv/${candidate.id}/skills`);

      const [summaryRes, expRes, scoreRes, ptRes, skillsRes] =
        await Promise.allSettled([
          summaryPromise,
          expPromise,
          scorePromise,
          projectTypePromise,
          skillsPromise,
        ]);

      const mapped: CandidateData = {
        filename: candidate.filename ?? "CV.pdf",
        result: {
          cv_score: candidate.score ?? 0,
          personal_info: {
            email: candidate.email,
            name: candidate.name,
            phone: "",
          },
          project_fit: candidate.projectFitPercent ?? 0,
          project_type: candidate.project ?? "General",
          sections: { education: "", experience: "", projects: "" },
          skills: candidate.skills ?? [],
          summary: "",
        },
        status: "success",
      };

      // summary -> summary text
      if (summaryRes.status === "fulfilled" && summaryRes.value?.ok) {
        try {
          const s = await summaryRes.value.json();
          mapped.result.summary = s?.summary ?? s?.result?.summary ?? "";
        } catch {}
      }

      // experience -> array -> join into experience section
      if (expRes.status === "fulfilled" && expRes.value?.ok) {
        try {
          const e = await expRes.value.json();
          if (Array.isArray(e?.experience)) {
            mapped.result.sections.experience = e.experience.join("\n\n");
          } else if (Array.isArray(e)) {
            mapped.result.sections.experience = e.join("\n\n");
          }
        } catch {}
      }

      // skills
      if (skillsRes.status === "fulfilled" && skillsRes.value?.ok) {
        try {
          const sk = await skillsRes.value.json();
          mapped.result.skills = sk?.skills ?? mapped.result.skills;
        } catch {}
      }

      // cv-score
      if (scoreRes.status === "fulfilled" && scoreRes.value?.ok) {
        try {
          const sc = await scoreRes.value.json();
          mapped.result.cv_score =
            sc?.cvScore ?? sc?.cv_score ?? mapped.result.cv_score;
        } catch {}
      }

      // project-type -> project_type and project_fit
      if (ptRes.status === "fulfilled" && ptRes.value?.ok) {
        try {
          const pt = await ptRes.value.json();
          mapped.result.project_type =
            pt?.projectType ?? pt?.project_type ?? mapped.result.project_type;
          mapped.result.project_fit =
            pt?.projectFit ?? pt?.project_fit ?? mapped.result.project_fit;
          // also set match string if needed (frontend uses candidate.match)
        } catch {}
      }

      // leave education/projects empty if API doesn't expose them
      setCandidateData(mapped);

      setEditForm({
        name: mapped.result.personal_info.name || candidate.name,
        email: mapped.result.personal_info.email || candidate.email,
        phone: mapped.result.personal_info.phone || "",
        skills: mapped.result.skills || candidate.skills,
        summary: mapped.result.summary || "",
        project_type: mapped.result.project_type || "",
        project_fit: mapped.result.project_fit ?? 0,
        education: mapped.result.sections.education || "",
        experience: mapped.result.sections.experience || "",
        projects: mapped.result.sections.projects || "",
      });
    } catch (error) {
      console.error("Failed to load candidate data:", error);
      showSnackbar("Failed to load candidate data", "error");
      // fallback mapping
      setCandidateData({
        filename: candidate.filename || "CV.pdf",
        result: {
          cv_score: candidate.score,
          personal_info: {
            email: candidate.email,
            name: candidate.name,
            phone: "",
          },
          project_fit: candidate.projectFitPercent || 0,
          project_type: candidate.project || "General",
          sections: { education: "", experience: "", projects: "" },
          skills: candidate.skills,
          summary: "",
        },
        status: "success",
      });
      setEditForm({
        name: candidate.name,
        email: candidate.email,
        phone: "",
        skills: candidate.skills,
        summary: "",
        project_type: candidate.project || "",
        project_fit: candidate.projectFitPercent || 0,
        education: "",
        experience: "",
        projects: "",
      });
    } finally {
      setLoadingCandidateData(false);
    }
  };

  // Save edited candidate data
  const saveCandidateData = async () => {
    if (!selectedCandidate || !candidateData) return;

    try {
      // In a real implementation, you would call your API endpoint
      // const res = await apiFetch(`/cv/${selectedCandidate.id}/data`, {
      //   method: "PUT",
      //   body: JSON.stringify(updatedData),
      // });

      // For now, we'll simulate a successful update
      showSnackbar("Candidate data updated successfully", "success");
      setEditDialogOpen(false);

      // Refresh the candidates list
      const updatedCandidates = candidates.map((c) =>
        c.id === selectedCandidate.id
          ? {
              ...c,
              name: editForm.name,
              email: editForm.email,
              skills: editForm.skills,
              project: editForm.project_type,
              score: editForm.project_fit,
            }
          : c
      );
      setCandidates(updatedCandidates);
    } catch (error) {
      console.error("Failed to update candidate data:", error);
      showSnackbar("Failed to update candidate data", "error");
    }
  };

  // Delete candidate
  const deleteCandidate = async () => {
    if (!selectedCandidate) return;

    try {
      // In a real implementation, you would call your API endpoint
      // const res = await apiFetch(`/cv/${selectedCandidate.id}`, {
      //   method: "DELETE",
      // });

      // For now, we'll simulate a successful deletion
      showSnackbar("Candidate deleted successfully", "success");
      setDeleteDialogOpen(false);

      // Remove from candidates list
      const updatedCandidates = candidates.filter(
        (c) => c.id !== selectedCandidate.id
      );
      setCandidates(updatedCandidates);
    } catch (error) {
      console.error("Failed to delete candidate:", error);
      showSnackbar("Failed to delete candidate", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {}
    localStorage.removeItem("user");
    localStorage.removeItem("userEmail");
    localStorage.setItem("auth-change", Date.now().toString());
    navigate("/login", { replace: true });
  };

  return (
    <RoleBasedAccess allowedRoles={["Admin"]} fallbackPath="/dashboard">
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
                    ? `${user.first_name} ${user.last_name || ""} (${
                        user.role
                      })`
                    : "Admin"}
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
              Manage Candidate Data
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
            >
              <SearchIcon color="action" />
              <InputBase
                placeholder="Search candidates by name, email, or skills..."
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
                  : `Showing ${filteredCandidates.length} of ${candidates.length} candidates`}
              </Typography>

              {/* Loading State */}
              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {/* Candidate Cards */}
              {!loading && filteredCandidates.length > 0
                ? filteredCandidates.map((candidate) => (
                    <Paper
                      key={candidate.id}
                      elevation={3}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 3,
                        backgroundColor: "#adb6be",
                      }}
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
                                  fontWeight: "bold",
                                  color: "#0D1B2A",
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
                          {/* Score ring and match (dynamically updated) */}
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
                          {/* Edit / Delete buttons */}
                          <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => loadCandidateData(candidate)}
                            sx={{
                              bgcolor: "#1976d2",
                              "&:hover": { bgcolor: "#1565c0" },
                              textTransform: "none",
                              mt: 1,
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<DeleteIcon />}
                            onClick={() => {
                              setSelectedCandidate(candidate);
                              setDeleteDialogOpen(true);
                            }}
                            sx={{
                              bgcolor: "#d32f2f",
                              "&:hover": { bgcolor: "#c62828" },
                              textTransform: "none",
                            }}
                          >
                            Delete
                          </Button>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                : !loading && (
                    <Typography
                      variant="body1"
                      sx={{
                        mt: 2,
                        fontStyle: "italic",
                        color: "#555",
                        fontFamily: "Helvetica, sans-serif",
                      }}
                    >
                      No candidates found.
                    </Typography>
                  )}
            </Paper>
          </Box>
        </Box>

        {/* Edit Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3, bgcolor: "#f5f5f5" },
          }}
        >
          <DialogTitle sx={{ bgcolor: "#1976d2", color: "white" }}>
            Edit Candidate Data - {selectedCandidate?.name}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {loadingCandidateData || !candidateData ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Personal Information
                </Typography>

                <TextField
                  label="Name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  fullWidth
                />

                <TextField
                  label="Email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  fullWidth
                />

                <TextField
                  label="Phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  fullWidth
                />

                <TextField
                  label="Skills (comma-separated)"
                  value={editForm.skills.join(", ")}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  fullWidth
                  helperText="Separate skills with commas"
                />

                <TextField
                  label="Project Type"
                  value={editForm.project_type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, project_type: e.target.value })
                  }
                  fullWidth
                />

                <TextField
                  label="Project Fit Score"
                  type="number"
                  value={editForm.project_fit}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      project_fit: parseFloat(e.target.value),
                    })
                  }
                  fullWidth
                  inputProps={{ min: 0, max: 10, step: 0.1 }}
                />

                <Typography variant="h6" sx={{ mt: 2 }}>
                  Sections
                </Typography>

                <TextField
                  label="Summary"
                  value={editForm.summary}
                  onChange={(e) =>
                    setEditForm({ ...editForm, summary: e.target.value })
                  }
                  multiline
                  rows={3}
                  fullWidth
                />

                <TextField
                  label="Education"
                  value={editForm.education}
                  onChange={(e) =>
                    setEditForm({ ...editForm, education: e.target.value })
                  }
                  multiline
                  rows={2}
                  fullWidth
                />

                <TextField
                  label="Experience"
                  value={editForm.experience}
                  onChange={(e) =>
                    setEditForm({ ...editForm, experience: e.target.value })
                  }
                  multiline
                  rows={2}
                  fullWidth
                />

                <TextField
                  label="Projects"
                  value={editForm.projects}
                  onChange={(e) =>
                    setEditForm({ ...editForm, projects: e.target.value })
                  }
                  multiline
                  rows={3}
                  fullWidth
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button
              startIcon={<CancelIcon />}
              onClick={() => setEditDialogOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              onClick={saveCandidateData}
              sx={{ textTransform: "none" }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: { borderRadius: 3, bgcolor: "#f5f5f5" },
          }}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete candidate{" "}
              <strong>{selectedCandidate?.name}</strong>? This action cannot be
              undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={deleteCandidate}
              sx={{ textTransform: "none" }}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </RoleBasedAccess>
  );
}

// Helper: try to parse a resume JSON if it's a string, otherwise return object
function parseResumeJson(input: any): any {
  if (!input) return null;
  // input may be a stringified JSON
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      // not JSON, return null so other sources are checked
      return null;
    }
  }
  // already an object
  if (typeof input === "object") return input;
  return null;
}

// Helper: robustly extract section text from multiple possible shapes
function extractSectionText(input: any): string {
  if (!input && input !== 0) return "";
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    return input
      .map((it) => {
        if (!it && it !== 0) return "";
        if (typeof it === "string") return it;
        if (typeof it === "object") {
          return (
            (it.text && String(it.text)) ||
            (it.summary && String(it.summary)) ||
            (it.content && String(it.content)) ||
            (it.description && String(it.description)) ||
            (it.title && String(it.title)) ||
            ""
          );
        }
        return "";
      })
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof input === "object") {
    return (
      (input.text && String(input.text)) ||
      (input.summary && String(input.summary)) ||
      (input.content && String(input.content)) ||
      (input.description && String(input.description)) ||
      (input.title && String(input.title)) ||
      (Array.isArray(input.items)
        ? input.items
            .map((it: any) => (typeof it === "string" ? it : it.text || ""))
            .filter(Boolean)
            .join("\n\n")
        : "") ||
      ""
    );
  }
  try {
    return String(input);
  } catch {
    return "";
  }
}

// new helper: deep-collect likely section fields anywhere in object
function deepCollectSections(root: any) {
  const sections: { education: any; experience: any; projects: any } = {
    education: null,
    experience: null,
    projects: null,
  };
  const visited = new Set<any>();
  const stack = [root];

  while (stack.length) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object" || visited.has(cur)) continue;
    visited.add(cur);

    for (const key of Object.keys(cur)) {
      const val = cur[key];
      const k = String(key).toLowerCase();

      if (
        !sections.education &&
        /education|school|degree|qualification/.test(k) &&
        val
      ) {
        sections.education = val;
      }
      if (
        !sections.experience &&
        /experience|work|employment|work_history|positions|jobs/.test(k) &&
        val
      ) {
        sections.experience = val;
      }
      if (
        !sections.projects &&
        /project|portfolio|projects_section|open_source/.test(k) &&
        val
      ) {
        sections.projects = val;
      }

      if (typeof val === "object") stack.push(val);
    }

    if (sections.education && sections.experience && sections.projects) break;
  }

  return sections;
}

// improved normalizeSections that uses deepCollectSections and existing extractSectionText
function normalizeSections(data: any) {
  // try previously implemented direct lookups first
  const direct =
    data?.result?.sections ?? data?.sections ?? data?.parsedSections ?? null;
  if (direct) {
    return {
      education: extractSectionText(
        direct.education ?? direct.educationText ?? direct.education_section
      ),
      experience: extractSectionText(
        direct.experience ?? direct.workExperience ?? direct.experience_section
      ),
      projects: extractSectionText(
        direct.projects ?? direct.project ?? direct.projects_section
      ),
    };
  }

  // try to parse possible resume JSON fields first
  const candidates = [
    data?.result?.resumeResult,
    data?.resumeResult,
    data?.ResumeResult,
    data?.resume,
    data?.parsed_resume,
    data?.result?.parsedResume,
    data?.result?.parse_result,
  ];

  for (const cand of candidates) {
    const parsed = parseResumeJson(cand) || cand;
    if (!parsed) continue;
    const collected = deepCollectSections(parsed);
    if (collected.education || collected.experience || collected.projects) {
      return {
        education: extractSectionText(collected.education),
        experience: extractSectionText(collected.experience),
        projects: extractSectionText(collected.projects),
      };
    }
  }

  // deep-scan entire `data` object as last resort
  const collectedAll = deepCollectSections(data);
  if (
    collectedAll.education ||
    collectedAll.experience ||
    collectedAll.projects
  ) {
    return {
      education: extractSectionText(collectedAll.education),
      experience: extractSectionText(collectedAll.experience),
      projects: extractSectionText(collectedAll.projects),
    };
  }

  // final fallback to earlier simple fields
  const fallbackEducation =
    data?.education ?? data?.educationText ?? data?.education_section ?? null;
  const fallbackExperience =
    data?.experience ??
    data?.workExperience ??
    data?.experience_section ??
    null;
  const fallbackProjects =
    data?.projects ?? data?.project ?? data?.projects_section ?? null;

  return {
    education: extractSectionText(fallbackEducation),
    experience: extractSectionText(fallbackExperience),
    projects: extractSectionText(fallbackProjects),
  };
}
