import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Modal,
  Fade,
  Backdrop,
  Popover,
  Tooltip,
  colors,
} from "@mui/material";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useNavigate, useLocation } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import logo from "../assets/logo.png";
import logo3 from "../assets/logoNavbar.png"; // Import the third logo if needed
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
//import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Sidebar from "./Sidebar";
import ConfigAlert from "./ConfigAlert";
import { apiFetch } from "../lib/api";
import React from "react";
import { ValueType } from "recharts/types/component/DefaultTooltipContent";

export default function CandidatesDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0); // For future multi-step
  const [fadeIn, setFadeIn] = useState(true);
  const [recent, setRecent] = useState<
    Array<{ id: number; name: string; skills: string; fit: string }>
  >([]);
  const [totalCandidates, setTotalCandidates] = useState<number | null>(null);
  const [skillDistribution, setSkillDistribution] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [rawSkillResponse, setRawSkillResponse] = useState<any>(null);
  const [projectFitData, setProjectFitData] = useState<
    Array<{ type: string; value: number }>
  >(
    [
      { type: "Technical", value: 50 },
      { type: "Collaborative", value: 30 },
      { type: "Autonomous", value: 20 },
    ] // initial mock data
  );
  // New: top technologies from backend
  const [topTechnologies, setTopTechnologies] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [topTechnology, setTopTechnology] = useState<string>("—");
  const navigate = useNavigate();
  const location = useLocation();

  const devUser = {
    email: "dev@example.com",
    password: "Password123",
    first_name: "John",
    last_name: "Doe",
    role: "Admin",
  };

  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string; // <-- add this
    email?: string; // <-- and this
  } | null>(null);

  const reviewBtnRef = useRef<HTMLButtonElement>(null);

  // --- helpers: add here (after refs/state, before useEffect) ---
  function parseSkillFallback(input: string | null | undefined): string[] {
    if (!input) return [];
    const s = String(input).trim();
    try {
      if (s.startsWith("[") || s.startsWith("{")) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed))
          return parsed.map((p) => String(p).trim()).filter(Boolean);
        if (parsed && typeof parsed === "object")
          return Object.keys(parsed).map((k) => String(k).trim());
      }
    } catch {}
    const cleaned = s.replace(/^[\[\]\{\}"'`]+|[\[\]\{\}"'`]+$/g, "");
    return cleaned
      .split(/[,;|\n]/)
      .map((p) => p.replace(/[^a-zA-Z0-9 .+#\-\+]/g, "").trim())
      .filter(Boolean);
  }

  // Normalize label strings for charts/legends
  function normalizeSkillName(raw: any): string {
    if (raw == null) return "—";
    // Prefer first element for arrays
    if (Array.isArray(raw) && raw.length) return String(raw[0]).trim();

    const s0 = typeof raw === "string" ? raw.trim() : JSON.stringify(raw);

    // Remove common key wrappers like '"skills":', 'skills:' or leading 'skills '
    let s = s0
      .replace(/^"?\s*skills"?\s*[:=]\s*/i, "")
      .replace(/^\s*skills\s*/i, "");

    // Strip escape slashes and surrounding JSON punctuation
    s = s
      .replace(/\\+/g, "")
      .replace(/^[\[\]\{\}"'`]+|[\[\]\{\}"'`]+$/g, "")
      .trim();

    // If remaining string is JSON, parse and extract inner value
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed) && parsed.length)
        return String(parsed[0]).trim();
      if (parsed && typeof parsed === "object") {
        // prefer nested skills array or first value
        if (
          Array.isArray((parsed as any).skills) &&
          (parsed as any).skills.length
        )
          return String((parsed as any).skills[0]).trim();
        const keys = Object.keys(parsed);
        if (keys.length) {
          const firstVal = parsed[keys[0]];
          if (Array.isArray(firstVal) && firstVal.length)
            return String(firstVal[0]).trim();
          if (firstVal != null) return String(firstVal).trim();
          return String(keys[0]).trim();
        }
      }
    } catch {
      // ignore JSON parse errors
    }

    // Final cleanup: remove stray punctuation and the word "skills" if still present
    const cleaned = s
      .replace(/\bskills\b[:\s-]*/i, "")
      .replace(/[^a-zA-Z0-9 .+#\-\+]/g, " ")
      .trim();
    return cleaned || s0;
  }

  function toNumberSafe(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function cleanSkillDisplay(raw: any): string {
    if (!raw) return "—";
    if (Array.isArray(raw)) return raw.map(String).join(", ");
    const parts = parseSkillFallback(String(raw));
    return parts.length ? parts.join(", ") : String(raw);
  }

  // Helper to extract project fit types as words
  function extractProjectFitTypes(pfJson: any): Array<{ type: string; value: number }> {
    if (!Array.isArray(pfJson)) return [];
    
    const counts = new Map<string, number>();
    
    for (const it of pfJson) {
      const type = it?.projectFit != null
        ? it.projectFit.type ?? it.projectFit
        : null;
      const key = type || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    
    return Array.from(counts.entries()).map(([type, value]) => ({
      type,
      value,
    }));
  }
  // --- end helpers ---

  useEffect(() => {
    document.title = "Candidates Dashboard";

    const email = localStorage.getItem("userEmail") || "admin@email.com";

    (async () => {
      try {
        // fetch current user
        const meRes = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (meRes.ok) {
          const meData = await meRes.json().catch(() => null);
          setUser(meData);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }

      try {
        // load stats (total candidates)
        const statsRes = await apiFetch("/cv/stats");
        if (statsRes.ok) {
          const statsData = await statsRes.json().catch(() => null);
          setTotalCandidates(statsData?.totalCandidates ?? 0);
        } else {
          setTotalCandidates(0);
        }
      } catch {
        setTotalCandidates(0);
      }

      try {
        // load recent candidates (top 3)
        const recentRes = await apiFetch("/cv/recent?limit=3");
        if (recentRes.ok) {
          const rows = await recentRes.json().catch(() => []);
          const topRows = Array.isArray(rows) ? rows.slice(0, 3) : [];
          setRecent(topRows);
        } else {
          setRecent([]);
        }
      } catch {
        setRecent([]);
      }
      // fetch chart data (skill distribution + project-fit + charts) after recent/load
      (async () => {
        try {
          setSkillError(null);
          setRawSkillResponse(null);

          // Use apiFetch consistently (it should honor REACT_APP_API_BASE)
          const [skillsRes, pfRes, techRes] = await Promise.all([
            apiFetch("/cv/skill-distribution?limit=4").catch(() => null),
            apiFetch("/cv/project-fit?limit=200").catch(() => null),
            apiFetch("/cv/top-technologies?limit=10").catch(() => null), // CHANGED: Get top 10 technologies
          ]);

          console.debug("Dashboard fetch statuses:", {
            skills: skillsRes?.status ?? null,
            projectFit: pfRes?.status ?? null,
            technologies: techRes?.status ?? null,
          });

          // --- Skill distribution ---
          if (skillsRes) {
            try {
              const skillsJson = await skillsRes.json().catch(() => null);
              console.debug("skill-distribution response:", skillsJson);
              setRawSkillResponse({
                url: skillsRes.url ?? null,
                body: skillsJson,
                status: skillsRes.status,
              });

              let parsed: Array<{ name: string; value: number }> = [];

              if (Array.isArray(skillsJson)) {
                parsed = skillsJson
                  .map((s: any) => {
                    if (typeof s === "string") return { name: s, value: 1 };
                    const rawName = s?.name ?? s?.label ?? JSON.stringify(s);
                    return {
                      name: normalizeSkillName(rawName),
                      value: toNumberSafe(s?.value ?? s?.count ?? 0),
                    };
                  })
                  .filter((it) => it.name);
              } else if (skillsJson && typeof skillsJson === "object") {
                parsed = Object.entries(skillsJson).map(([k, v]) => ({
                  name: normalizeSkillName(k),
                  value: toNumberSafe(v),
                }));
              } else if (typeof skillsJson === "string") {
                const parts = parseSkillFallback(skillsJson);
                parsed = parts.map((p) => ({
                  name: normalizeSkillName(p),
                  value: 1,
                }));
              } else {
                parsed = [];
              }

              if (parsed.length) {
                parsed.sort((a, b) => b.value - a.value);
                setSkillDistribution(parsed.slice(0, 4));
              } else {
                console.debug("skill-distribution: no usable data");
                setSkillDistribution([]);
                setSkillError(
                  "No usable data returned from /cv/skill-distribution"
                );
              }
            } catch (e) {
              console.debug("Failed to parse skill-distribution response", e);
              setSkillDistribution([]);
              setSkillError(String(e));
            }
          } else {
            console.debug("skill-distribution response missing");
            setSkillDistribution([]);
            setSkillError("No response (fetch failed)");
          }
          // --- end skill distribution ---

          // --- Project fit (FIXED: Use word-based types) ---
          if (pfRes) {
            try {
              const pfJson = await pfRes.json().catch(() => null);
              console.debug("project-fit response:", pfJson);
              
              // Use the restored helper function to extract project fit types
              const projectFitArray = extractProjectFitTypes(pfJson);
              setProjectFitData(projectFitArray);

              // Also update recent candidates with proper fit types (restored logic)
              if (Array.isArray(pfJson)) {
                const pfMap = new Map<number, any>();
                for (const it of pfJson) {
                  const id = Number(it?.candidateId ?? it?.id);
                  if (!Number.isNaN(id)) pfMap.set(id, it);
                }

                setRecent((prev) =>
                  prev.map((r) => {
                    const pf = pfMap.get(Number(r.id));
                    return {
                      ...r,
                      fit: pf?.projectFit?.type ?? pf?.projectFitLabel ?? r.fit,
                      skills: r.skills ?? "—",
                    };
                  })
                );
              }
            } catch (e) {
              console.debug("Failed to parse project-fit response", e);
            }
          } else {
            console.debug("project-fit response missing");
          }

          // --- Monthly uploads (line chart) ---
          try {
            const monthsRes = await apiFetch(
              "/cv/monthly-uploads?months=6"
            ).catch(() => null);
            if (monthsRes && monthsRes.ok) {
              const monthsJson = await monthsRes.json().catch(() => []);
              if (Array.isArray(monthsJson)) {
                // convert to { month, candidates }
                const series = monthsJson.map((m: any) => ({
                  month: m.month,
                  candidates: Number(m.count ?? m.cnt ?? 0),
                }));
                setCandidateTrends(series);
              }
            }
          } catch (e) {
            console.debug("monthly-uploads fetch failed", e);
            setCandidateTrends([]);
          }

          // --- Overall Tech Usage (bar chart) - UPDATED ---
          try {
            // Use the technologies response for overall tech usage
            if (techRes && techRes.ok) {
              const techJson = await techRes.json().catch(() => []);
              if (Array.isArray(techJson)) {
                const techList = techJson.map((t: any) => ({
                  name: normalizeSkillName(t.name || t.technology || t.tech),
                  value: toNumberSafe(t.value ?? t.count ?? t.frequency ?? 0),
                }))
                .filter(item => item.name && item.name !== "—")
                .sort((a, b) => b.value - a.value)
                .slice(0, 10); // Get top 10 technologies
                
                setGroupedBarData(techList);
                setTopTechnologies(techList);
                if (techList.length) setTopTechnology(techList[0].name);
              }
            } else {
              // Fallback to skill distribution if tech endpoint fails
              console.debug("Using skill distribution as fallback for tech usage");
              if (skillDistribution.length) {
                const techList = skillDistribution
                  .filter(item => item.name && item.name !== "—")
                  .slice(0, 10); // Top 10 skills as technologies
                setGroupedBarData(techList);
                setTopTechnologies(techList);
                if (techList.length) setTopTechnology(techList[0].name);
              }
            }
          } catch (e) {
            console.debug("tech-usage fetch failed", e);
            setGroupedBarData([]);
          }
        } catch (e) {
          console.warn("Failed to load dashboard charts:", e);
        }
      })();
    })();
  }, []);

  useEffect(() => {
    if (reviewBtnRef.current) {
      setAnchorEl(reviewBtnRef.current);
    }
  }, [showTutorial]);

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setShowTutorial(false);

  // Logout handler: call server to invalidate session, clear local state and notify other tabs
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore network errors
    }
    // Clear client-side state
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      // notify other tabs / ProtectedRoute to re-check auth
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    // navigate to login
    navigate("/login", { replace: true });
  }

  // real data for graphs (fetched)
  const [candidateTrends, setCandidateTrends] = useState<
    Array<{ month: string; candidates: number }>
  >([]);
  const [groupedBarData, setGroupedBarData] = useState<any[]>([]);

  const COLORS = [
    "#8884D8", "#00C49F", "#FFBB28", "#FF8042", 
    "#82CA9D", "#FF6B6B", "#4ECDC4", "#45B7D1", 
    "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"
  ];

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
        userRole={user?.role || devUser.role}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top AppBar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            {/* Tutorial icon */}
            <Tooltip title="Run Tutorial" arrow>
              <IconButton
                onClick={() => {
                  setShowTutorial(true);
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
          </Toolbar>
        </AppBar>

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: "Helvetica, sans-serif",
              mb: 3,
              fontWeight: "bold",
            }}
          >
            Candidates Dashboard
          </Typography>

          {/* Config Alert */}
          <ConfigAlert />

          {/* Stat Cards */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 4 }}>
            {[
              {
                label: "Candidates",
                value: totalCandidates != null ? String(totalCandidates) : "—",
              },
              {
                label: "Top Technology",
                value: topTechnology || "—",
              },
            ].map((item) => (
              <Box key={item.label} sx={statCardStyle}>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "Helvetica, sans-serif",
                    fontWeight: "bold",
                  }}
                >
                  {item.value}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: "Helvetica, sans-serif" }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Dashboard Graphs */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr", 
                lg: "1fr 1fr 1fr",
              },
              gap: 4,
              mb: 4,
            }}
          >
            {/* Line Chart: Light Blue */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "#DEDDEE",
                color: "#000",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                height: 300, // Consistent height
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  mb: 1,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Monthly Candidate Uploads
              </Typography>
              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={
                      candidateTrends.length
                        ? candidateTrends
                        : [{ month: "N/A", candidates: 0 }]
                    }
                  >
                    <CartesianGrid stroke="#4a5568" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#575656ff", fontWeight: "bold" }}
                    />
                    <YAxis tick={{ fill: "#575656ff", fontWeight: "bold" }} />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="candidates"
                      stroke="#0A2540 "
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6, fill: "#0A2540 " }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Bar Chart: Overall Tech Usage */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "#DEDDEE",
                color: "#000",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                height: 300,                // 👈 same height for both
  display: "flex",
  flexDirection: "column",
              }}
            >
              <Typography
                variant="subtitle1"
               sx={{ fontFamily: "Helvetica, sans-serif", mb: 1, fontWeight: 600, flexShrink: 0 }}
              >
                Overall Tech Usage
              </Typography>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedBarData.length ? groupedBarData : [{ name: "No Data", value: 0 }]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid stroke="#4a5568" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name"
                    tick={{ fill: "#575656ff", fontWeight: "bold", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 30]}
                    ticks={[0, 5, 10, 15, 20, 25, 30]}
                    allowDecimals={false}
                    tick={{ fill: "#575656ff", fontWeight: "bold" }}
                  />
                  <RechartsTooltip />
                  <Bar 
                    dataKey="value" 
                    name="Technology Usage"
                    fill="#8884D8"
                  >
                    {groupedBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>

            {/* Pie Chart: Skill Distribution */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "#DEDDEE",
                color: "#000",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                height: 300, // Same height as others
                display: "flex",
                flexDirection: "column",
                "& .recharts-pie-label-text": {
                  fill: "#575656ff !important",
                  fontWeight: 700,
                },
                "& .recharts-pie-label-line": {
                  stroke: "#575656ff",
                },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  mb: 1,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Skill Distribution
              </Typography>
              <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={skillDistribution.slice(0, 4)}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={70} // Slightly larger for consistent height
                      labelLine={true}
                      label={({ name, percent }) =>
                        `${normalizeSkillName(name)}: ${
                          Number.isFinite(percent)
                            ? (percent * 100).toFixed(0)
                            : "0"
                        }%`
                      }
                    >
                      {(skillDistribution.slice(0, 4) || []).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value, name, props) => {
                        const pct =
                          props &&
                          props.payload &&
                          typeof props.payload.percent === "number" &&
                          Number.isFinite(props.payload.percent)
                            ? (props.payload.percent * 100).toFixed(1)
                            : "";
                        return [
                          toNumberSafe(value),
                          pct
                            ? `${normalizeSkillName(name)}: ${pct}%`
                            : normalizeSkillName(name),
                        ];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Doughnut Chart: Project Fit Types - FIXED with words */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "#DEDDEE",
                color: "#000",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                "& .recharts-pie-label-text": {
                  fill: "#575656ff !important",
                  fontWeight: 700,
                },
                "& .recharts-pie-label-line": {
                  stroke: "#575656ff",
                },
                gridColumn: {
                  xs: "auto", // normal span at small
                  sm: "auto",
                  lg: "1 / -1", // span all columns on large screens
                },
              }}
            >
              <Typography
                variant="subtitle1"
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  mb: 1,
                  fontWeight: 600,
                }}
              >
                Project Fit Types
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={projectFitData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    label={({ name, percent }) =>
                      `${name}: ${
                        Number.isFinite(percent)
                          ? (percent * 100).toFixed(0)
                          : "0"
                      }%`
                    }
                    labelLine={true}
                  >
                    {(projectFitData || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#2b3a55",
                      borderColor: "#4a5568",
                    }}
                    formatter={(value, name) => [
                      toNumberSafe(value),
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Box>

          {/* Recently Processed */}
          <Paper
            elevation={6}
            sx={{ p: 2, borderRadius: 3, backgroundColor: "#DEDDEE" }}
          >
            <Typography
              variant="h6"
              sx={{
                fontFamily: "Helvetica, sans-serif",
                fontWeight: "bold",
                color: "#232A3B",
                mb: 2,
              }}
            >
              Recently Processed
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontFamily: "Helvetica, sans-serif",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      Candidate
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "Helvetica, sans-serif",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      Top Skills
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "Helvetica, sans-serif",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      Project Fit
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "Helvetica, sans-serif",
                        fontWeight: "bold",
                        fontSize: "1.2rem",
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map((candidate, idx) => (
                    <TableRow key={candidate.id ?? idx}>
                      <TableCell>{candidate.name}</TableCell>
                      <TableCell>
                        {cleanSkillDisplay(candidate.skills)}
                      </TableCell>
                      <TableCell>{candidate.fit || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={reviewButtonStyle}
                          onClick={() =>
                            navigate(`/candidate/${candidate.id}/summary`, {
                              state: { candidateId: candidate.id },
                            })
                          }
                          ref={idx === 0 ? reviewBtnRef : null}
                        >
                          Review
                        </Button>

                        {idx === 0 && (
                          <Popover
                            open={showTutorial && Boolean(anchorEl)}
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
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontFamily: "Helvetica, sans-serif",
                                    fontWeight: "bold",
                                    mb: 1,
                                  }}
                                >
                                  Quick Tip
                                </Typography>
                                <Typography
                                  sx={{
                                    fontFamily: "Helvetica, sans-serif",
                                    mb: 2,
                                  }}
                                >
                                  Click <b>Review</b> to view and assess this
                                  candidate's CV.
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
                                    <Button
                                      variant="contained"
                                      onClick={handleCloseTutorial}
                                      sx={{
                                        bgcolor: "#5a88ad",
                                        color: "#fff",
                                        fontFamily: "Helvetica, sans-serif",
                                        fontWeight: "bold",
                                        textTransform: "none",
                                        "&:hover": { bgcolor: "#487DA6" },
                                      }}
                                    >
                                      Finish
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            </Fade>
                          </Popover>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

// Styles
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

const statCardStyle = {
  p: 2,
  minWidth: 140,
  borderRadius: 3,
  backgroundColor: "#DEDDEE",
  textAlign: "center",
  color: "#000",
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
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)",
  },
};

const graphCardBase = {
  p: 2,
  borderRadius: 3,
  width: { xs: "100%", sm: "45%", md: "30%" },
  minWidth: 300,
  height: 300,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const chartCardStyle = {
  p: 2,
  borderRadius: 3,
  backgroundColor: "#DEDDEE",
  color: "#000",
  transition: "transform 0.2s",
  "&:hover": { transform: "translateY(-4px)" },
  height: 300,                // 👈 same height for both
  display: "flex",
  flexDirection: "column",
};
