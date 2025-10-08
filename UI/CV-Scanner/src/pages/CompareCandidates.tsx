import React, { useEffect, useMemo, useState } from "react";
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
  Grid,
  LinearProgress,
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
  detailedData?: {
    skills: string[];
    experience: string[];
    projects: string[];
    education?: string[];
    certifications?: string[];
    languages?: string[];
  };
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
  experienceA: { [key: string]: boolean };
  experienceB: { [key: string]: boolean };
  projectsA: { [key: string]: boolean };
  projectsB: { [key: string]: boolean };
}

interface ComparisonResult {
  candidateAScore: number;
  candidateBScore: number;
  breakdown: {
    skills: { a: number; b: number };
    experience: { a: number; b: number };
    projects: { a: number; b: number };
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

  // Logout handler: invalidate server session, clear client state, notify other tabs and redirect
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

  const [candidates, setCandidates] = useState<Candidate[]>([]);
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

  // Comparison state
  const [comparisonData, setComparisonData] = useState<ComparisonData>({
    candidateA: null,
    candidateB: null,
    skillsA: {},
    skillsB: {},
    experienceA: {},
    experienceB: {},
    projectsA: {},
    projectsB: {},
  });

  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

  // Score ring (same visual as Search)
  function scoreColor(value: number) {
    const v = Math.max(0, Math.min(10, value));
    const hue = (v / 10) * 120;
    return `hsl(${hue} 70% 45%)`;
  }

  function ScoreRing({ value }: { value?: number }) {
    const clamped = Math.max(0, Math.min(10, Number(value ?? 0)));
    const pct = clamped * 10;
    const ringColor = scoreColor(clamped);
    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={48}
          thickness={4}
          sx={{ color: "rgba(255,255,255,0.15)" }}
        />
        <CircularProgress
          variant="determinate"
          value={pct}
          size={48}
          thickness={4}
          sx={{ color: ringColor, position: "absolute", left: 0 }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ lineHeight: 1, fontWeight: 700, color: "#000", fontSize: 12 }}
          >
            {clamped}/10
          </Typography>
        </Box>
      </Box>
    );
  }

  // Helpers copied from Search
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

  // Load detailed candidate data
  const loadCandidateDetails = async (candidateId: number | string): Promise<Candidate['detailedData']> => {
    try {
      const response = await apiFetch(`/cv/candidate/${candidateId}/details`);
      if (response && response.ok) {
        const data = await response.json();
        
        // Parse the data structure from your example
        const skills = Array.isArray(data.skills) ? data.skills : [];
        const experience = data.sections?.experience 
          ? parseSection(data.sections.experience)
          : [];
        const projects = data.sections?.projects
          ? parseSection(data.sections.projects)
          : [];
        const education = data.sections?.education
          ? parseSection(data.sections.education)
          : [];
        const certifications = Array.isArray(data.certifications) ? data.certifications : [];
        const languages = Array.isArray(data.languages) ? data.languages : [];

        return {
          skills,
          experience,
          projects,
          education,
          certifications,
          languages
        };
      }
    } catch (error) {
      console.warn(`Failed to load details for candidate ${candidateId}:`, error);
    }
    
    // Fallback to basic skills if detailed data not available
    const candidate = candidates.find(c => c.id === candidateId);
    return {
      skills: candidate?.skills || [],
      experience: [],
      projects: [],
      education: [],
      certifications: [],
      languages: []
    };
  };

  // Helper to parse section data (experience, projects, education)
  const parseSection = (sectionData: any): string[] => {
    if (Array.isArray(sectionData)) {
      return sectionData;
    }
    
    if (typeof sectionData === 'string') {
      // Try to parse string as array
      try {
        const parsed = JSON.parse(sectionData);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // If not JSON, split by common delimiters
        return sectionData.split(/[•\-\n]/).filter((item: string) => item.trim().length > 0);
      }
    }
    
    return [];
  };

  // Load user and integrated candidate data
  useEffect(() => {
    (async () => {
      try {
        const email = localStorage.getItem("userEmail") || devUser.email;
        // user
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

        // fetch candidates + filenames
        const [candRes, fnRes] = await Promise.all([
          apiFetch("/cv/candidates").catch(() => null),
          apiFetch("/cv/filenames").catch(() => null),
        ]);

        const list =
          candRes && candRes.ok ? await candRes.json().catch(() => []) : [];
        const filenames =
          fnRes && fnRes.ok ? await fnRes.json().catch(() => []) : [];

        const filenameMap = new Map<number, any>();
        if (Array.isArray(filenames)) {
          for (const f of filenames) {
            if (f && typeof f.id === "number") filenameMap.set(f.id, f);
          }
        }

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
              match: c.match || "N/A",
              cvFileUrl: c.cvFileUrl ?? null,
              cvFileType: c.cvFileType ?? null,
              filename,
              score:
                typeof c.score === "number"
                  ? Math.max(0, Math.min(10, c.score))
                  : parsePercentToScore(c.match),
            } as Candidate;
          }
        );

        setCandidates(mapped);

        // merge average scores
        try {
          const avgRes = await apiFetch("/cv/average-scores?limit=500");
          if (avgRes && avgRes.ok) {
            const avgJson = await avgRes.json();
            if (Array.isArray(avgJson)) {
              const avgMap = new Map<number, number>();
              for (const it of avgJson) {
                const id = Number(it?.candidateId ?? it?.id);
                const scoreVal = it?.averageScoreOutOf10 ?? it?.averageScore;
                if (!Number.isNaN(id) && scoreVal != null)
                  avgMap.set(id, Number(scoreVal));
              }
              setCandidates((prev) =>
                prev.map((cand) => ({
                  ...cand,
                  score: avgMap.has(Number(cand.id))
                    ? Math.max(
                        0,
                        Math.min(10, Number(avgMap.get(Number(cand.id))))
                      )
                    : cand.score,
                }))
              );
            }
          }
        } catch (e) {
          // ignore
        }

        // merge project-fit
        try {
          const pfRes = await apiFetch("/cv/project-fit?limit=500");
          if (pfRes && pfRes.ok) {
            const pfJson = await pfRes.json();
            if (Array.isArray(pfJson)) {
              const pfMap = new Map<number, any>();
              for (const it of pfJson) {
                const id = Number(it?.candidateId ?? it?.id);
                if (!Number.isNaN(id)) pfMap.set(id, it);
              }
              setCandidates((prev) =>
                prev.map((cand) => {
                  const pf = pfMap.get(Number(cand.id));
                  if (!pf) return cand;
                  const pfObj = pf?.projectFit ?? null;
                  const pct =
                    pf?.projectFitPercent != null
                      ? Number(pf.projectFitPercent)
                      : null;
                  const type =
                    pfObj && typeof pfObj === "object"
                      ? pfObj.type ?? pfObj?.type
                      : null;
                  let combinedLabel: string | null = null;
                  if (type && pct != null) combinedLabel = `${type}:${pct}%`;
                  else if (pf?.projectFitLabel)
                    combinedLabel = pf.projectFitLabel;
                  else if (type) combinedLabel = String(type);
                  else if (pct != null) combinedLabel = `${pct}%`;
                  return {
                    ...cand,
                    match: combinedLabel ?? cand.match,
                  };
                })
              );
            }
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        console.warn("Failed loading candidates:", e);
        setCandidates([]);
      }
    })();
  }, []);

  // Load detailed data when candidates are selected
  useEffect(() => {
    const loadDetailedData = async () => {
      if (candidateA && !candidateA.detailedData) {
        const detailedData = await loadCandidateDetails(candidateA.id);
        setCandidateA(prev => prev ? { ...prev, detailedData } : null);
      }
      if (candidateB && !candidateB.detailedData) {
        const detailedData = await loadCandidateDetails(candidateB.id);
        setCandidateB(prev => prev ? { ...prev, detailedData } : null);
      }
    };

    loadDetailedData();
  }, [candidateA, candidateB]);

  // Initialize comparison data when candidates are selected
  useEffect(() => {
    if (candidateA && candidateB) {
      const skillsA: { [key: string]: boolean } = {};
      const skillsB: { [key: string]: boolean } = {};
      const experienceA: { [key: string]: boolean } = {};
      const experienceB: { [key: string]: boolean } = {};
      const projectsA: { [key: string]: boolean } = {};
      const projectsB: { [key: string]: boolean } = {};

      // Initialize all checkboxes as unchecked
      candidateA.detailedData?.skills?.forEach(skill => { skillsA[skill] = false; });
      candidateB.detailedData?.skills?.forEach(skill => { skillsB[skill] = false; });
      candidateA.detailedData?.experience?.forEach(exp => { experienceA[exp] = false; });
      candidateB.detailedData?.experience?.forEach(exp => { experienceB[exp] = false; });
      candidateA.detailedData?.projects?.forEach(project => { projectsA[project] = false; });
      candidateB.detailedData?.projects?.forEach(project => { projectsB[project] = false; });

      setComparisonData({
        candidateA,
        candidateB,
        skillsA,
        skillsB,
        experienceA,
        experienceB,
        projectsA,
        projectsB,
      });
    }
  }, [candidateA, candidateB]);

  const handleSelectCandidate = async (candidate: Candidate, side: "A" | "B") => {
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
    } else {
      setCandidateB(null);
      setSearchTermB("");
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

  // Handle checkbox changes
  const handleCheckboxChange = (section: 'skills' | 'experience' | 'projects', candidate: 'A' | 'B', item: string) => {
    setComparisonData(prev => ({
      ...prev,
      [`${section}${candidate}`]: {
        ...prev[`${section}${candidate}` as keyof Omit<ComparisonData, 'candidateA' | 'candidateB'>],
        [item]: !prev[`${section}${candidate}` as keyof Omit<ComparisonData, 'candidateA' | 'candidateB'>][item]
      }
    }));
  };

  // Calculate comparison results
  const calculateComparison = () => {
    if (!candidateA || !candidateB) return;

    // Skills (50% of total)
    const skillsACount = Object.keys(comparisonData.skillsA).length;
    const skillsBCount = Object.keys(comparisonData.skillsB).length;
    const skillsASelected = Object.values(comparisonData.skillsA).filter(Boolean).length;
    const skillsBSelected = Object.values(comparisonData.skillsB).filter(Boolean).length;
    
    const skillsAScore = skillsACount > 0 ? (skillsASelected / skillsACount) * 50 : 0;
    const skillsBScore = skillsBCount > 0 ? (skillsBSelected / skillsBCount) * 50 : 0;

    // Experience (25% of total)
    const experienceACount = Object.keys(comparisonData.experienceA).length;
    const experienceBCount = Object.keys(comparisonData.experienceB).length;
    const experienceASelected = Object.values(comparisonData.experienceA).filter(Boolean).length;
    const experienceBSelected = Object.values(comparisonData.experienceB).filter(Boolean).length;
    
    const experienceAScore = experienceACount > 0 ? (experienceASelected / experienceACount) * 25 : 0;
    const experienceBScore = experienceBCount > 0 ? (experienceBSelected / experienceBCount) * 25 : 0;

    // Projects (25% of total)
    const projectsACount = Object.keys(comparisonData.projectsA).length;
    const projectsBCount = Object.keys(comparisonData.projectsB).length;
    const projectsASelected = Object.values(comparisonData.projectsA).filter(Boolean).length;
    const projectsBSelected = Object.values(comparisonData.projectsB).filter(Boolean).length;
    
    const projectsAScore = projectsACount > 0 ? (projectsASelected / projectsACount) * 25 : 0;
    const projectsBScore = projectsBCount > 0 ? (projectsBSelected / projectsBCount) * 25 : 0;

    // Base score (25% of total) - using the existing score out of 10
    const baseAScore = ((candidateA.score || 0) / 10) * 25;
    const baseBScore = ((candidateB.score || 0) / 10) * 25;

    const totalAScore = skillsAScore + experienceAScore + projectsAScore + baseAScore;
    const totalBScore = skillsBScore + experienceBScore + projectsBScore + baseBScore;

    const result: ComparisonResult = {
      candidateAScore: totalAScore,
      candidateBScore: totalBScore,
      breakdown: {
        skills: { a: skillsAScore, b: skillsBScore },
        experience: { a: experienceAScore, b: experienceBScore },
        projects: { a: projectsAScore, b: projectsBScore },
        baseScore: { a: baseAScore, b: baseBScore },
      }
    };

    setComparisonResult(result);

    // Set simple comparison result text
    if (totalAScore > totalBScore) {
      setCompareResult(
        `${candidateA.firstName ?? candidateA.email} is the best suited candidate (${totalAScore.toFixed(1)}% vs ${totalBScore.toFixed(1)}%)`
      );
    } else if (totalBScore > totalAScore) {
      setCompareResult(
        `${candidateB.firstName ?? candidateB.email} is the best suited candidate (${totalBScore.toFixed(1)}% vs ${totalAScore.toFixed(1)}%)`
      );
    } else {
      setCompareResult("Both candidates are equally suited (tie).");
    }
  };

  // Filtering similar to Search
  const getFilteredCandidates = (side: "A" | "B") => {
    const searchTerm = (side === "A" ? searchTermA : searchTermB)
      .trim()
      .toLowerCase();
    const other = side === "A" ? candidateB : candidateA;
    return candidates.filter((c) => {
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

  const renderCandidateCard = (candidate: Candidate, side: "A" | "B") => {
    const isSelected =
      side === "A"
        ? candidateA?.id === candidate.id
        : candidateB?.id === candidate.id;
    const isBlocked =
      side === "A"
        ? candidateB?.id === candidate.id
        : candidateA?.id === candidate.id;
    const maxSkillsToShow = isMobile ? 3 : isTablet ? 5 : 8;
    const skillsToShow = (candidate.skills ?? []).slice(0, maxSkillsToShow);
    const remainingSkillsCount = Math.max(
      0,
      (candidate.skills ?? []).length - maxSkillsToShow
    );

    return (
      <Card
        key={String(candidate.id)}
        sx={{
          mb: 2,
          bgcolor: isBlocked ? "#f5f5f5" : isSelected ? "#DEDDEE" : "#adb6beff",
          color: "#000",
          border: isSelected
            ? "2px solid #93AFF7"
            : isBlocked
            ? "2px solid #ff6b6b"
            : "none",
          cursor: isBlocked ? "not-allowed" : "pointer",
          opacity: isBlocked ? 0.6 : 1,
        }}
        onClick={() => !isBlocked && handleSelectCandidate(candidate, side)}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Avatar sx={{ bgcolor: "#93AFF7", mr: 2 }}>
              {initialsOf(candidate.firstName, candidate.lastName)}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: "bold" }}>
                {candidate.firstName} {candidate.lastName}
              </Typography>
              <Typography sx={{ color: "#333" }}>{candidate.email}</Typography>
            </Box>
            <Box>
              <ScoreRing value={candidate.score} />
            </Box>
          </Box>

          <Typography sx={{ fontWeight: "bold", color: "#0D1B2A", mb: 1 }}>
            File: {candidate.filename ?? candidate.project}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, my: 1 }}>
            {skillsToShow.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                size={isMobile ? "small" : "medium"}
                sx={{
                  bgcolor: "#93AFF7",
                  color: "#0D1B2A",
                  fontWeight: "bold",
                  textTransform: "lowercase",
                }}
              />
            ))}
            {remainingSkillsCount > 0 && (
              <Chip
                label={`+${remainingSkillsCount}`}
                size={isMobile ? "small" : "medium"}
                sx={{
                  bgcolor: "#0D1B2A",
                  color: "#93AFF7",
                  fontWeight: "bold",
                }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            {isSelected && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeselect(side);
                }}
              >
                Deselect
              </Button>
            )}
            <Button
              size="small"
              variant="text"
              onClick={(e) => handleViewAllSkills(candidate, e)}
            >
              View All Skills ({(candidate.skills ?? []).length})
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render comparison breakdown section
  const renderComparisonBreakdown = () => {
    if (!candidateA || !candidateB || !comparisonResult) return null;

    return (
      <Paper sx={{ p: 3, mt: 3, bgcolor: "#DEDDEE" }}>
        <Typography variant="h6" sx={{ mb: 3, textAlign: "center", color: "#000" }}>
          Detailed Comparison Breakdown
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {/* Skills Section */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              Skills (50% of total)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateA.firstName}: {Object.values(comparisonData.skillsA).filter(Boolean).length}/
                {Object.keys(comparisonData.skillsA).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.skillsA).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.skillsA).length)) * 100}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateB.firstName}: {Object.values(comparisonData.skillsB).filter(Boolean).length}/
                {Object.keys(comparisonData.skillsB).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.skillsB).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.skillsB).length)) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>

          {/* Experience Section */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              Experience (25% of total)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateA.firstName}: {Object.values(comparisonData.experienceA).filter(Boolean).length}/
                {Object.keys(comparisonData.experienceA).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.experienceA).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.experienceA).length)) * 100}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateB.firstName}: {Object.values(comparisonData.experienceB).filter(Boolean).length}/
                {Object.keys(comparisonData.experienceB).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.experienceB).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.experienceB).length)) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>

          {/* Projects Section */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              Projects (25% of total)
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateA.firstName}: {Object.values(comparisonData.projectsA).filter(Boolean).length}/
                {Object.keys(comparisonData.projectsA).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.projectsA).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.projectsA).length)) * 100}
                sx={{ height: 8, borderRadius: 4, mb: 1 }}
              />
              <Typography variant="body2" sx={{ color: "#000" }}>
                {candidateB.firstName}: {Object.values(comparisonData.projectsB).filter(Boolean).length}/
                {Object.keys(comparisonData.projectsB).length} selected
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(Object.values(comparisonData.projectsB).filter(Boolean).length / Math.max(1, Object.keys(comparisonData.projectsB).length)) * 100}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>

          {/* Base Score Section */}
          <Box sx={{ flex: '1 1 300px' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              Base Score (25% of total)
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

        {/* Final Scores */}
        <Box sx={{ mt: 3, p: 2, bgcolor: "#232A3B", borderRadius: 2 }}>
          <Typography variant="h6" sx={{ textAlign: "center", color: "#fff", mb: 2 }}>
            Final Scores
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h4" sx={{ color: "#93AFF7" }}>
                {comparisonResult.candidateAScore.toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ textAlign: "center", color: "#fff" }}>
                {candidateA.firstName}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: "center" }}>
              <Typography variant="h4" sx={{ color: "#93AFF7" }}>
                {comparisonResult.candidateBScore.toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ textAlign: "center", color: "#fff" }}>
                {candidateB.firstName}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    );
  };

  // Render detailed comparison sections with checkboxes
  const renderDetailedComparison = () => {
    if (!candidateA || !candidateB) return null;

    return (
      <Paper sx={{ p: 3, mt: 3, bgcolor: "#DEDDEE" }}>
        <Typography variant="h6" sx={{ mb: 3, textAlign: "center", color: "#000" }}>
          Detailed Comparison - Select Relevant Items
        </Typography>

        {/* Skills Comparison */}
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3, mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateA.firstName}'s Skills (50%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.skillsA).map(([skill, checked]) => (
                <FormControlLabel
                  key={skill}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('skills', 'A', skill)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={skill}
                  sx={{ display: 'block', color: "#000" }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateB.firstName}'s Skills (50%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.skillsB).map(([skill, checked]) => (
                <FormControlLabel
                  key={skill}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('skills', 'B', skill)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={skill}
                  sx={{ display: 'block', color: "#000" }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Experience Comparison */}
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3, mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateA.firstName}'s Experience (25%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.experienceA).map(([experience, checked]) => (
                <FormControlLabel
                  key={experience}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('experience', 'A', experience)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={experience}
                  sx={{ display: 'block', color: "#000", fontSize: '0.9rem' }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateB.firstName}'s Experience (25%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.experienceB).map(([experience, checked]) => (
                <FormControlLabel
                  key={experience}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('experience', 'B', experience)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={experience}
                  sx={{ display: 'block', color: "#000", fontSize: '0.9rem' }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        {/* Projects Comparison */}
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 3, mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateA.firstName}'s Projects (25%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.projectsA).map(([project, checked]) => (
                <FormControlLabel
                  key={project}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('projects', 'A', project)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={project}
                  sx={{ display: 'block', color: "#000", fontSize: '0.9rem' }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 2, color: "#000" }}>
              {candidateB.firstName}'s Projects (25%)
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(comparisonData.projectsB).map(([project, checked]) => (
                <FormControlLabel
                  key={project}
                  control={
                    <Checkbox
                      checked={checked}
                      onChange={() => handleCheckboxChange('projects', 'B', project)}
                      sx={{ color: "#232A3B" }}
                    />
                  }
                  label={project}
                  sx={{ display: 'block', color: "#000", fontSize: '0.9rem' }}
                />
              ))}
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

            <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

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

          <Box
            sx={{
              display: "flex",
              gap: isMobile ? 2 : 4,
              flexDirection: isMobile ? "column" : "row",
              height: isMobile ? "auto" : "70vh",
              minHeight: 500,
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: isMobile ? "100%" : 320,
              }}
            >
              <Paper
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: 3,
                  bgcolor: "#DEDDEE",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Typography
                  sx={{
                    mb: 2,
                    textAlign: "center",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                >
                  Candidate A {candidateA && "(Selected)"}
                </Typography>
                {!candidateA && (
                  <TextField
                    fullWidth
                    placeholder="Search candidates..."
                    value={searchTermA}
                    onChange={(e) => setSearchTermA(e.target.value)}
                    sx={{
                      mb: 2,
                      "& .MuiOutlinedInput-root": { bgcolor: "white" },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#0D1B2A" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                <Box sx={{ flex: 1, overflow: "auto", minHeight: 200 }}>
                  {getFilteredCandidates("A").length === 0 ? (
                    <Typography
                      sx={{ textAlign: "center", color: "#666", mt: 2 }}
                    >
                      {searchTermA
                        ? "No candidates match your search"
                        : "No candidates available"}
                    </Typography>
                  ) : (
                    getFilteredCandidates("A").map((c) =>
                      renderCandidateCard(c, "A")
                    )
                  )}
                </Box>
                {candidateA && (
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => handleDeselect("A")}
                  >
                    Show All Candidates
                  </Button>
                )}
              </Paper>
            </Box>

            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minWidth: isMobile ? "100%" : 320,
              }}
            >
              <Paper
                sx={{
                  flex: 1,
                  p: 1,
                  borderRadius: 2,
                  bgcolor: "#DEDDEE",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    mb: 2,
                    textAlign: "center",
                    color: "#000",
                    fontWeight: "bold",
                  }}
                >
                  Candidate B {candidateB && "(Selected)"}
                </Typography>
                {!candidateB && (
                  <TextField
                    fullWidth
                    placeholder="Search candidates..."
                    value={searchTermB}
                    onChange={(e) => setSearchTermB(e.target.value)}
                    sx={{
                      mb: 2,
                      "& .MuiOutlinedInput-root": { bgcolor: "white" },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "#0D1B2A" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                <Box sx={{ flex: 1, overflow: "auto", minHeight: 200 }}>
                  {getFilteredCandidates("B").length === 0 ? (
                    <Typography
                      sx={{ textAlign: "center", color: "#666", mt: 2 }}
                    >
                      {searchTermB
                        ? "No candidates match your search"
                        : "No candidates available"}
                    </Typography>
                  ) : (
                    getFilteredCandidates("B").map((c) =>
                      renderCandidateCard(c, "B")
                    )
                  )}
                </Box>
                {candidateB && (
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ mt: 2 }}
                    onClick={() => handleDeselect("B")}
                  >
                    Show All Candidates
                  </Button>
                )}
              </Paper>
            </Box>
          </Box>

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
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
                sx={{ color: "#0D1B2A" }}
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