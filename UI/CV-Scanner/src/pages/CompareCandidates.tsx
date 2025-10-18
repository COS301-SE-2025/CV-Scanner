import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  InputBase,
  LinearProgress,
  Pagination,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import Sidebar from "./Sidebar";
import { apiFetch } from "../lib/api";

type Candidate = {
  id: number | string;
  firstName?: string;
  lastName?: string;
  email?: string;
  skills?: string[];
  project?: string;
  receivedAt?: string;
  match?: string;
  cvFileUrl?: string | null;
  cvFileType?: string | null;
  filename?: string | null;
  score?: number;
};

const devUser = {
  email: "dev@example.com",
  first_name: "John",
  last_name: "Doe",
  role: "Admin",
};

interface ComparisonData {
  candidateA: Candidate | null;
  candidateB: Candidate | null;
  skillsA: { [key: string]: boolean };
  skillsB: { [key: string]: boolean };
}

interface ComparisonResult {
  candidateAScore: number;
  candidateBScore: number;
  breakdown: {
    skills: { a: number; b: number };
    baseScore: { a: number; b: number };
  };
}

export default function CompareCandidates() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [candidateA, setCandidateA] = useState<Candidate | null>(null);
  const [candidateB, setCandidateB] = useState<Candidate | null>(null);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedCandidateSkills, setSelectedCandidateSkills] = useState<
    string[]
  >([]);
  const [selectedCandidateName, setSelectedCandidateName] = useState("");
  const [searchTermA, setSearchTermA] = useState("");
  const [searchTermB, setSearchTermB] = useState("");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [loadingScores, setLoadingScores] = useState(false);
  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const CANDIDATES_PER_PAGE = 5;

  // Comparison state
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    candidateA: null,
    candidateB: null,
    skillsA: {},
    skillsB: {},
  });

  const [comparisonResult, setComparisonResult] =
    useState<ComparisonResult | null>(null);

  // ✅ Score ring component
  function scoreColor(value: number) {
    const v = Math.max(0, Math.min(10, value));
    const hue = (v / 10) * 120;
    return `hsl(${hue} 70% 45%)`;
  }

  function ScoreRing({ value }: { value?: number }) {
    const clamped = Math.max(0, Math.min(10, Number(value ?? 0)));
    const pct = clamped * 10;
    const ringColor = scoreColor(clamped);
    const isPerfect = clamped === 10;

    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={64}
          thickness={4}
          sx={{ color: "rgba(255,255,255,0.15)" }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={64}
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
            sx={{ lineHeight: 1, fontWeight: 800, color: "#000", fontSize: 12 }}
          >
            {clamped}/10
          </Typography>
          <Typography variant="caption" sx={{ color: "#000", fontSize: 9 }}>
            Score
          </Typography>
        </Box>
      </Box>
    );
  }

  // Helper functions
  function basenameFromUrl(url?: string | null) {
    if (!url) return null;
    try {
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
    if (/https?:\/\//i.test(raw)) {
      return basenameFromUrl(raw);
    }
    return raw.trim() || null;
  }

  function isUuid(str?: string | null) {
    if (!str) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      (str || "").trim()
    );
  }

  function hasExtension(name?: string | null) {
    if (!name) return false;
    return /\.[A-Za-z0-9]{2,6}$/.test(name);
  }

  function makeFriendlyFilename(
    candidateName: string,
    original?: string | null
  ) {
    const safeBase =
      candidateName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join("_")
        .replace(/[^A-Za-z0-9_]/g, "") || "Candidate";
    if (!original) return `${safeBase}_CV.pdf`;
    if (isUuid(original) || !hasExtension(original)) {
      let extMatch = original.match(/\.([A-Za-z0-9]{2,6})$/);
      const ext = extMatch ? `.${extMatch[1]}` : ".pdf";
      return `${safeBase}_CV${ext}`;
    }
    return original;
  }

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

  function parsePercentToScore(percent?: string | number) {
    if (!percent) return 0;
    const p =
      typeof percent === "number"
        ? percent
        : Number(String(percent).replace("%", ""));
    if (Number.isNaN(p)) return 0;
    return Math.max(0, Math.min(10, p / 10));
  }

  // ✅ Load user and candidate data
  useEffect(() => {
    (async () => {
      try {
        const email = localStorage.getItem("userEmail") || devUser.email;

        // Load user
        try {
          const meRes = await apiFetch(
            `/auth/me?email=${encodeURIComponent(email)}`
          );
          if (meRes && meRes.ok) {
            const meJson = await meRes.json().catch(() => null);
            setUser(meJson);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }

        console.log("Fetching candidates and related data...");

        // Fetch all data in parallel
        const [candRes, fnRes] = await Promise.all([
          apiFetch("/cv/candidates").catch(() => null),
          apiFetch("/cv/filenames").catch(() => null),
        ]);

        console.log("API Response statuses:", {
          candidates: candRes?.status,
          filenames: fnRes?.status,
        });

        const list =
          candRes && candRes.ok ? await candRes.json().catch(() => []) : [];
        const filenames =
          fnRes && fnRes.ok ? await fnRes.json().catch(() => []) : [];

        console.log("Loaded data counts:", {
          candidates: list.length,
          filenames: filenames.length,
        });

        // Build lookup maps
        const filenameMap = new Map<number, any>();
        if (Array.isArray(filenames)) {
          for (const f of filenames) {
            if (f && typeof f.id === "number") filenameMap.set(f.id, f);
          }
        }

        // Map candidates with initial score of 0
        const mapped: Candidate[] = (Array.isArray(list) ? list : []).map(
          (c: any) => {
            const first = c.firstName || c.first_name || "";
            const last = c.lastName || c.last_name || "";
            const name = `${first} ${last}`.trim() || c.email || "Unknown";
            const project = c.project || "CV";
            const uploaded = c.receivedAt
              ? relativeFrom(c.receivedAt)
              : "Unknown";
            const initials = initialsOf(first, last);

            const fnRow = filenameMap.get(c.id);
            let filename: string | null = normalizeFilename(fnRow?.filename);
            if (!filename) filename = basenameFromUrl(fnRow?.fileUrl);
            if (!filename) filename = basenameFromUrl(c.cvFileUrl);
            if (filename && /https?:\/\//i.test(filename))
              filename = basenameFromUrl(filename);
            filename = makeFriendlyFilename(name, filename);

            return {
              id: Number(c.id),
              firstName: first,
              lastName: last,
              email: c.email,
              skills: Array.isArray(c.skills) ? c.skills : [],
              project,
              receivedAt: c.receivedAt,
              match: "N/A",
              cvFileUrl: c.cvFileUrl ?? null,
              cvFileType: c.cvFileType ?? null,
              filename,
              score: 0, // Will be fetched
            } as Candidate;
          }
        );

        setCandidates(mapped);

        // ✅ Fetch CV scores and project types individually
        setLoadingScores(true);
        try {
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
                  projectFitLabel: ptData.projectFitLabel ?? null,
                };
              }
            } catch (e) {
              console.warn(`Failed to fetch project-type for ${cand.id}:`, e);
            }
            return {
              id: cand.id,
              projectFitLabel: null,
            };
          });

          const [scores, projectTypes] = await Promise.all([
            Promise.all(scorePromises),
            Promise.all(projectTypePromises),
          ]);

          const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
          const projectTypeMap = new Map(
            projectTypes.map((pt) => [pt.id, pt.projectFitLabel])
          );

          setCandidates((prev) =>
            prev.map((cand) => ({
              ...cand,
              score: Math.max(
                0,
                Math.min(10, scoreMap.get(Number(cand.id)) ?? 0)
              ),
              match: projectTypeMap.get(Number(cand.id)) ?? "N/A",
            }))
          );

          console.log(
            `✅ Fetched scores and project types for ${mapped.length} candidates`
          );
        } catch (e) {
          console.error("Failed to fetch individual scores/project types:", e);
        } finally {
          setLoadingScores(false);
        }
      } catch (e) {
        console.warn("Failed loading candidates:", e);
        setCandidates([]);
      }
    })();
  }, []);

  // Initialize comparison data when candidates are selected
  useEffect(() => {
    if (candidateA && candidateB) {
      const skillsA: { [key: string]: boolean } = {};
      const skillsB: { [key: string]: boolean } = {};

      // Initialize all checkboxes as unchecked
      candidateA.skills?.forEach((skill) => {
        skillsA[skill] = false;
      });
      candidateB.skills?.forEach((skill) => {
        skillsB[skill] = false;
      });

      setComparisonData({
        candidateA,
        candidateB,
        skillsA,
        skillsB,
      });
    }
  }, [candidateA, candidateB]);

  const handleSelectCandidate = async (
    candidate: Candidate,
    side: "A" | "B"
  ) => {
    if (side === "A") {
      const newCandidateA = candidateA?.id === candidate.id ? null : candidate;
      setCandidateA(newCandidateA);
      if (!newCandidateA) setSearchTermA("");
    } else {
      const newCandidateB = candidateB?.id === candidate.id ? null : candidate;
      setCandidateB(newCandidateB);
      if (!newCandidateB) setSearchTermB("");
    }
    setCompareResult(null);
    setComparisonResult(null);
  };

  const handleDeselect = (side: "A" | "B") => {
    if (side === "A") {
      setCandidateA(null);
      setSearchTermA("");
      setPageA(1);
    } else {
      setCandidateB(null);
      setSearchTermB("");
      setPageB(1);
    }
    setCompareResult(null);
    setComparisonResult(null);
  };

  const handleViewAllSkills = (candidate: Candidate, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCandidateSkills(candidate.skills ?? []);
    setSelectedCandidateName(
      `${candidate.firstName ?? ""} ${candidate.lastName ?? ""}`.trim()
    );
    setSkillsDialogOpen(true);
  };

  const handleCloseSkillsDialog = () => {
    setSkillsDialogOpen(false);
    setSelectedCandidateSkills([]);
    setSelectedCandidateName("");
  };

  const handleCheckboxChange = (candidate: "A" | "B", skill: string) => {
    setComparisonData((prev) => ({
      ...prev,
      [`skills${candidate}`]: {
        ...prev[`skills${candidate}`],
        [skill]: !prev[`skills${candidate}`][skill],
      },
    }));
  };

  const calculateComparison = () => {
    if (!candidateA || !candidateB) return;

    const skillsACount = Object.keys(comparisonData.skillsA).length;
    const skillsBCount = Object.keys(comparisonData.skillsB).length;
    const skillsASelected = Object.values(comparisonData.skillsA).filter(
      Boolean
    ).length;
    const skillsBSelected = Object.values(comparisonData.skillsB).filter(
      Boolean
    ).length;

    const skillsAScore =
      skillsACount > 0 ? (skillsASelected / skillsACount) * 25 : 0;
    const skillsBScore =
      skillsBCount > 0 ? (skillsBSelected / skillsBCount) * 25 : 0;

    const baseAScore = ((candidateA.score || 0) / 10) * 75;
    const baseBScore = ((candidateB.score || 0) / 10) * 75;

    const totalAScore = skillsAScore + baseAScore;
    const totalBScore = skillsBScore + baseBScore;

    const result: ComparisonResult = {
      candidateAScore: totalAScore,
      candidateBScore: totalBScore,
      breakdown: {
        skills: { a: skillsAScore, b: skillsBScore },
        baseScore: { a: baseAScore, b: baseBScore },
      },
    };

    setComparisonResult(result);

    // Set simple comparison result text
    if (totalAScore > totalBScore) {
      setCompareResult(
        `${
          candidateA.firstName ?? candidateA.email
        } is the best suited candidate (${totalAScore.toFixed(
          1
        )}% vs ${totalBScore.toFixed(1)}%)`
      );
    } else if (totalBScore > totalAScore) {
      setCompareResult(
        `${
          candidateB.firstName ?? candidateB.email
        } is the best suited candidate (${totalBScore.toFixed(
          1
        )}% vs ${totalAScore.toFixed(1)}%)`
      );
    } else {
      setCompareResult("Both candidates are equally suited (tie).");
    }
  };

  const getFilteredCandidates = (side: "A" | "B") => {
    const searchTerm = (side === "A" ? searchTermA : searchTermB)
      .trim()
      .toLowerCase();
    const other = side === "A" ? candidateB : candidateA;

    // Apply global search if present
    let filtered = candidates;
    if (globalSearchTerm.trim()) {
      const globalTerm = globalSearchTerm.trim().toLowerCase();
      filtered = candidates.filter((c) => {
        return (
          String(c.firstName ?? "")
            .toLowerCase()
            .includes(globalTerm) ||
          String(c.lastName ?? "")
            .toLowerCase()
            .includes(globalTerm) ||
          String(c.email ?? "")
            .toLowerCase()
            .includes(globalTerm) ||
          (Array.isArray(c.skills) &&
            c.skills.some((s) => s.toLowerCase().includes(globalTerm)))
        );
      });
    }

    return filtered.filter((c) => {
      if (other && String(c.id) === String(other.id)) return false;
      if (!searchTerm) return true;
      return (
        String(c.firstName ?? "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(c.lastName ?? "")
          .toLowerCase()
          .includes(searchTerm) ||
        String(c.email ?? "")
          .toLowerCase()
          .includes(searchTerm) ||
        (Array.isArray(c.skills) &&
          c.skills.some((s) => s.toLowerCase().includes(searchTerm)))
      );
    });
  };

  const getPaginatedCandidates = (side: "A" | "B") => {
    const filtered = getFilteredCandidates(side);
    const page = side === "A" ? pageA : pageB;
    const startIndex = (page - 1) * CANDIDATES_PER_PAGE;
    return filtered.slice(startIndex, startIndex + CANDIDATES_PER_PAGE);
  };

  // ✅ Compact Candidate Selector Component with Pagination
  const CompactCandidateSelector = ({ 
    candidate, 
    isSelected, 
    placeholder,
    searchTerm,
    onSearchChange,
    side 
  }) => {
    const filteredCandidates = getFilteredCandidates(side);
    const paginatedCandidates = getPaginatedCandidates(side);
    const otherCandidate = side === "A" ? candidateB : candidateA;
    const currentPage = side === "A" ? pageA : pageB;
    const setCurrentPage = side === "A" ? setPageA : setPageB;
    const totalPages = Math.ceil(filteredCandidates.length / CANDIDATES_PER_PAGE);

    const handlePageChange = (event, value) => {
      setCurrentPage(value);
    };

    return (
      <Paper sx={{ p: 2, borderRadius: 3, bgcolor: "#DEDDEE", height: "fit-content" }}>
        <Typography sx={{ mb: 2, textAlign: "center", color: "#000", fontWeight: "bold" }}>
          Candidate {side} {candidate && "(Selected)"}
        </Typography>

        {!candidate ? (
          <>
            <TextField
              fullWidth
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              sx={{ mb: 2, "& .MuiOutlinedInput-root": { bgcolor: "white" } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#0D1B2A" }} />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
            
            {/* Compact candidate list */}
            <Box sx={{ maxHeight: 300, overflow: "auto", mb: 2 }}>
              {paginatedCandidates.map((c) => {
                const isBlocked = otherCandidate && String(c.id) === String(otherCandidate.id);
                return (
                  <Card
                    key={String(c.id)}
                    sx={{
                      mb: 1,
                      bgcolor: isBlocked ? "#f5f5f5" : "#adb6beff",
                      cursor: isBlocked ? "not-allowed" : "pointer",
                      opacity: isBlocked ? 0.6 : 1,
                      "&:hover": !isBlocked ? { bgcolor: "#93AFF7" } : {},
                    }}
                    onClick={() => !isBlocked && handleSelectCandidate(c, side)}
                  >
                    <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem", bgcolor: "#93AFF7" }}>
                          {initialsOf(c.firstName, c.lastName)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: "bold", color: "#000" }}>
                            {c.firstName} {c.lastName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#555" }}>
                            Score: {c.score}/10 • {c.match}
                          </Typography>
                        </Box>
                        {isBlocked && (
                          <Chip 
                            label="Selected" 
                            size="small" 
                            sx={{ 
                              bgcolor: "#ff6b6b", 
                              color: "#000",
                              fontSize: '0.6rem',
                              height: 20
                            }}
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
              {paginatedCandidates.length === 0 && (
                <Typography variant="body2" sx={{ color: "#666", textAlign: "center", py: 2 }}>
                  No candidates found
                </Typography>
              )}
            </Box>

            {/* Pagination */}
            {filteredCandidates.length > CANDIDATES_PER_PAGE && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  size="small"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      color: "#204E20",
                      fontWeight: "bold",
                      fontSize: "0.7rem",
                      minWidth: 24,
                      height: 24,
                    },
                    "& .MuiPaginationItem-page.Mui-selected": {
                      backgroundColor: "#204E20",
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "#1a3a1a",
                      },
                    },
                  }}
                />
              </Box>
            )}

            {/* Results count */}
            <Typography variant="caption" sx={{ color: "#666", textAlign: "center", display: "block", mt: 1 }}>
              Showing {paginatedCandidates.length} of {filteredCandidates.length} candidates
            </Typography>
          </>
        ) : (
          // Selected candidate display
          <Box sx={{ textAlign: "center" }}>
            <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 1, bgcolor: "#93AFF7", fontSize: "1.2rem" }}>
              {initialsOf(candidate.firstName, candidate.lastName)}
            </Avatar>
            <Typography variant="h6" sx={{ color: "#000", fontWeight: "bold" }}>
              {candidate.firstName} {candidate.lastName}
            </Typography>
            <Typography variant="body2" sx={{ color: "#555", mb: 1 }}>
              {candidate.email}
            </Typography>
            <Typography variant="body2" sx={{ color: "#204E20", fontWeight: "bold", mb: 1 }}>
              Score: {candidate.score}/10 | {candidate.match}
            </Typography>
            
            {/* Skills preview */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "center", mb: 0.5 }}>
                {(candidate.skills ?? []).slice(0, 3).map((skill) => (
                  <Chip
                    key={skill}
                    label={skill}
                    size="small"
                    sx={{
                      backgroundColor: "#93AFF7",
                      fontFamily: "Helvetica, sans-serif",
                      fontWeight: "bold",
                      color: "#0D1B2A",
                      fontSize: '0.7rem',
                      height: 20
                    }}
                  />
                ))}
                {(candidate.skills ?? []).length > 3 && (
                  <Chip
                    label={`+${(candidate.skills ?? []).length - 3} more`}
                    size="small"
                    onClick={(e) => handleViewAllSkills(candidate, e)}
                    sx={{
                      backgroundColor: "#e0e0e0",
                      fontFamily: "Helvetica, sans-serif",
                      fontWeight: "bold",
                      color: "#666",
                      fontSize: '0.6rem',
                      height: 20,
                      cursor: 'pointer',
                    }}
                  />
                )}
              </Box>
            </Box>

            <Button
              variant="outlined"
              size="small"
              fullWidth
              sx={{ mt: 1, textTransform: "none" }}
              onClick={() => handleDeselect(side)}
            >
              Change Candidate
            </Button>
          </Box>
        )}
      </Paper>
    );
  };

  const renderComparisonBreakdown = () => {
    if (!candidateA || !candidateB || !comparisonResult) return null;

    const isABetter =
      comparisonResult.candidateAScore > comparisonResult.candidateBScore;
    const isBBetter =
      comparisonResult.candidateBScore > comparisonResult.candidateAScore;

    return (
      <Paper sx={{ p: 3, mt: 3, bgcolor: "#DEDDEE" }}>
        <Typography
          variant="h6"
          sx={{ mb: 3, textAlign: "center", color: "#000" }}
        >
          Detailed Comparison Breakdown
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            justifyContent: "center",
          }}
        >
          <Box sx={{ flex: "1 1 300px", maxWidth: 400 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 2, color: "#000" }}
            >
              Skills (25% of total)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateA.firstName}:{" "}
                {Object.values(comparisonData.skillsA).filter(Boolean).length}/
                {Object.keys(comparisonData.skillsA).length} selected
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  (Object.values(comparisonData.skillsA).filter(Boolean)
                    .length /
                    Math.max(1, Object.keys(comparisonData.skillsA).length)) *
                  100
                }
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateB.firstName}:{" "}
                {Object.values(comparisonData.skillsB).filter(Boolean).length}/
                {Object.keys(comparisonData.skillsB).length} selected
              </Typography>
              <LinearProgress
                variant="determinate"
                value={
                  (Object.values(comparisonData.skillsB).filter(Boolean)
                    .length /
                    Math.max(1, Object.keys(comparisonData.skillsB).length)) *
                  100
                }
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>

          <Box sx={{ flex: "1 1 300px", maxWidth: 400 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 2, color: "#000" }}
            >
              AI Score (75% of total)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateA.firstName}: {candidateA.score}/10
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(candidateA.score || 0) * 10}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateB.firstName}: {candidateB.score}/10
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(candidateB.score || 0) * 10}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Typography
            variant="h6"
            sx={{ textAlign: "center", color: "#000", mb: 2 }}
          >
            Final Scores
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box
              sx={{
                flex: 1,
                textAlign: "center",
                p: 2,
                borderRadius: 2,
                bgcolor: isABetter ? "#4CAF50" : "#232A3B",
                color: isABetter ? "#000" : "#fff",
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: isABetter ? "#000" : "#93AFF7" }}
              >
                {comparisonResult.candidateAScore.toFixed(1)}%
              </Typography>
              <Typography
                variant="body2"
                sx={{ textAlign: "center", fontWeight: "bold" }}
              >
                {candidateA.firstName}
                {isABetter && " (Best Candidate)"}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: 1,
                textAlign: "center",
                p: 2,
                borderRadius: 2,
                bgcolor: isBBetter ? "#4CAF50" : "#232A3B",
                color: isBBetter ? "#000" : "#fff",
              }}
            >
              <Typography
                variant="h4"
                sx={{ color: isBBetter ? "#000" : "#93AFF7" }}
              >
                {comparisonResult.candidateBScore.toFixed(1)}%
              </Typography>
              <Typography
                variant="body2"
                sx={{ textAlign: "center", fontWeight: "bold" }}
              >
                {candidateB.firstName}
                {isBBetter && " (Best Candidate)"}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  const renderDetailedComparison = () => {
    if (!candidateA || !candidateB) return null;

    return (
      <Paper sx={{ p: 3, mt: 3, bgcolor: "#DEDDEE" }}>
        <Typography
          variant="h6"
          sx={{ mb: 3, textAlign: "center", color: "#000" }}
        >
          Select Relevant Skills (25% of total score)
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: 3,
            mb: 3,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 2, color: "#000" }}
            >
              {candidateA.firstName}'s Skills
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: "auto",
                p: 1,
                border: "1px solid #ccc",
                borderRadius: 1,
              }}
            >
              {Object.entries(comparisonData.skillsA).map(
                ([skill, checked]) => (
                  <FormControlLabel
                    key={skill}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={() => handleCheckboxChange("A", skill)}
                        sx={{ color: "#232A3B" }}
                      />
                    }
                    label={skill}
                    sx={{ display: "block", color: "#000", mb: 1 }}
                  />
                )
              )}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 2, color: "#000" }}
            >
              {candidateB.firstName}'s Skills
            </Typography>
            <Box
              sx={{
                maxHeight: 300,
                overflow: "auto",
                p: 1,
                border: "1px solid #ccc",
                borderRadius: 1,
              }}
            >
              {Object.entries(comparisonData.skillsB).map(
                ([skill, checked]) => (
                  <FormControlLabel
                    key={skill}
                    control={
                      <Checkbox
                        checked={checked}
                        onChange={() => handleCheckboxChange("B", skill)}
                        sx={{ color: "#232A3B" }}
                      />
                    }
                    label={skill}
                    sx={{ display: "block", color: "#000", mb: 1 }}
                  />
                )
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            variant="contained"
            sx={{
              px: 4,
              py: 1.5,
              bgcolor: "#93AFF7",
              color: "#0D1B2A",
              fontWeight: "bold",
              textTransform: "none",
            }}
            onClick={calculateComparison}
          >
            Calculate Comparison
          </Button>
        </Box>
      </Paper>
    );
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
      <Sidebar
        userRole={user?.role || devUser.role}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Box
              onClick={() => navigate("/settings")}
              sx={{
                display: "flex",
                alignItems: "center",
                ml: 2,
                cursor: "pointer",
              }}
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

            <IconButton
              color="inherit"
              onClick={() => {
                localStorage.removeItem("userEmail");
                navigate("/login");
              }}
              sx={{ ml: 1 }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        
        {/* Main Content */}
        <Box
          sx={{
            flexGrow: 1,
            p: isMobile ? 2 : isTablet ? 3 : 4,
            overflow: "auto",
          }}
        >
          <Typography
            variant="h5"
            sx={{ mb: 3, fontWeight: "bold", color: "#fff" }}
          >
            Compare Candidates
          </Typography>

          {/* Global Search Bar */}
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
              value={globalSearchTerm}
              onChange={(e) => {
                setGlobalSearchTerm(e.target.value);
                setPageA(1);
                setPageB(1);
              }}
            />
          </Box>

          {loadingScores && (
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <CircularProgress size={24} sx={{ color: "#93AFF7" }} />
              <Typography sx={{ color: "#fff", mt: 1 }}>
                Loading candidate scores...
              </Typography>
            </Box>
          )}
        
          {/* Compact Candidate Selection */}
          <Box
            sx={{
              display: "flex",
              gap: isMobile ? 2 : 4,
              flexDirection: isMobile ? "column" : "row",
              alignItems: "stretch",
            }}
          >
            {/* Candidate A */}
            <Box sx={{ flex: 1 }}>
              <CompactCandidateSelector
                candidate={candidateA}
                isSelected={!!candidateA}
                placeholder="Search Candidate A..."
                searchTerm={searchTermA}
                onSearchChange={setSearchTermA}
                side="A"
              />
            </Box>

            {/* VS Separator */}
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: "bold",
              minHeight: isMobile ? "auto" : 200
            }}>
              VS
            </Box>

            {/* Candidate B */}
            <Box sx={{ flex: 1 }}>
              <CompactCandidateSelector
                candidate={candidateB}
                isSelected={!!candidateB}
                placeholder="Search Candidate B..."
                searchTerm={searchTermB}
                onSearchChange={setSearchTermB}
                side="B"
              />
            </Box>
          </Box>

          {/* Comparison Sections */}
          {candidateA && candidateB && (
            <>
              {renderDetailedComparison()}
              {renderComparisonBreakdown()}
            </>
          )}

          {compareResult && !comparisonResult && (
            <Box sx={{ mt: 3 }}>
              <Typography
                sx={{
                  color: "#0D1B2A",
                  fontWeight: "bold",
                  bgcolor: "#DEDDEE",
                  p: 2,
                  borderRadius: 2,
                  textAlign: "center",
                }}
              >
                {compareResult}
              </Typography>
            </Box>
          )}

          <Dialog
            open={skillsDialogOpen}
            onClose={handleCloseSkillsDialog}
            maxWidth="md"
            fullWidth
            fullScreen={isMobile}
          >
            <DialogTitle sx={{ bgcolor: "#DEDDEE", color: "#000" }}>
              Skills for {selectedCandidateName}
            </DialogTitle>
            <DialogContent sx={{ bgcolor: "#DEDDEE" }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, pt: 2 }}>
                {selectedCandidateSkills.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    sx={{ bgcolor: "#93AFF7", color: "#0D1B2A" }}
                  />
                ))}
              </Box>
            </DialogContent>
            <DialogActions sx={{ bgcolor: "#DEDDEE" }}>
              <Button
                onClick={handleCloseSkillsDialog}
                sx={{ color: "#0D1B2A", textTransform: "none" }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
}