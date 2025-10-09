import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Collapse,
} from "@mui/material";
import EditableField from "./EditableField";
import { useLocation, useNavigate } from "react-router-dom";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import logoNavbar from "../assets/logoNavbar.png";
import CircularProgressBar from "./CircularProgressBar";
import { apiFetch } from "../lib/api";

export interface ParsedCVFields {
  profile?: string;
  education?: string;
  skills?: string;
  experience?: string;
  projects?: string;
  achievements?: string;
  contact?: string;
  languages?: string;
  other?: string;
  labels?: string;
  probabilities?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// Helper to TitleCase keys for data.applied/classification
function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

const RAW_WRITE_MAP: Record<keyof ParsedCVFields, string[]> = {
  profile: ["profile", "summary", "objective"],
  education: ["education", "studies", "qualifications"],
  skills: ["skills", "technologies", "tech_stack"],
  experience: ["experience", "work_history"],
  projects: ["projects", "project_experience"],
  achievements: ["achievements", "awards"],
  contact: ["contact", "contact_info", "contacts"],
  languages: ["languages"],
  other: ["raw"],
  labels: ["labels"],
  probabilities: ["probabilities"],
  name: ["name"],
  email: ["email"],
  phone: ["phone"],
};

function applyFieldToRaw(
  prevRaw: any,
  key: keyof ParsedCVFields,
  value: string
) {
  const clone = JSON.parse(JSON.stringify(prevRaw ?? {}));
  const val: any =
    typeof value === "string" && value.indexOf("\n") !== -1
      ? value.split(/\r?\n/).filter(Boolean)
      : value;

  const appliedKey = clone?.applied
    ? "applied"
    : clone?.classification
    ? "classification"
    : null;
  const candidates = RAW_WRITE_MAP[key] || [key];

  if (appliedKey) {
    clone[appliedKey] = clone[appliedKey] || {};
    for (const k of candidates) {
      clone[appliedKey][titleCase(k)] = val;
    }
  }

  for (const k of candidates) {
    if (k in clone) clone[k] = val;
  }
  clone[key] = val;

  return clone;
}

function toLines(value: any): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value))
    return value
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("\n")
      .trim();
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value).trim();
}

// Add small helpers (moved/ensured here)
function isObject(v: any): v is Record<string, any> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function safeObject(v: any): Record<string, any> {
  return isObject(v) ? v : {};
}

const renderNormalizedFields = (fields: ParsedCVFields) => {
  const safeFields = safeObject(fields);

  // Normalize values to strings where possible so child components
  // (e.g., EditableField) never receive null/undefined or raw objects.
  const entries: [string, any][] = Object.entries(safeFields).map(([k, v]) => [
    k,
    toLines(v) ?? v,
  ]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {entries.map(([key, value]) => {
        if (value == null || (typeof value === "string" && !value.trim()))
          return null;

        // Skills → keep compact grid
        if (key === "skills") {
          return (
            <Box
              key={key}
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
                p: 1,
                borderRadius: 1,
                backgroundColor: "#adb6beff",
              }}
            >
              <EditableField
                label={key.charAt(0).toUpperCase() + key.slice(1)}
                value={
                  typeof value === "string"
                    ? value
                    : JSON.stringify(value, null, 2)
                }
                onSave={() => {}}
              />
            </Box>
          );
        }

        // Everything else → full width
        return (
          <Box
            key={key}
            sx={{
              p: 1,
              borderRadius: 1,
              backgroundColor: "#adb6beff",
            }}
          >
            <EditableField
              label={key.charAt(0).toUpperCase() + key.slice(1)}
              value={
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2)
              }
              onSave={() => {}}
            />
          </Box>
        );
      })}
    </Box>
  );
};

function normalizeToParsedFields(input: any): ParsedCVFields {
  if (!input) return {};
  const data = input?.data ?? input?.result ?? input?.payload ?? input ?? {};
  const applied = safeObject(data.applied || data.classification || {});

  const fields: ParsedCVFields = {
    profile:
      toLines(data.profile) || toLines(data.summary) || toLines(data.objective),
    education:
      toLines(data.education) ||
      toLines(applied?.Education) ||
      toLines(data.studies) ||
      toLines(data.qualifications),
    experience:
      toLines(data.experience) ||
      toLines(applied?.Experience) ||
      toLines(data.work_history),
    projects: toLines(data.projects) || toLines(data.project_experience),
    skills:
      toLines(data.skills) ||
      toLines(applied?.Skills) ||
      toLines(data.technologies) ||
      toLines(data.tech_stack),
    achievements: toLines(data.achievements) || toLines(data.awards),
    contact:
      toLines(data.contact) ||
      toLines(data.contact_info) ||
      toLines(data.contacts),
    languages: toLines(data.languages),
    //   other:
    // toLines(data.raw) ??
    // (Object.keys(data).length ? toLines(data) : undefined),
  };

  // Unpack personal_info into separate fields
  if (data.personal_info) {
    if (data.personal_info.name) fields.name = toLines(data.personal_info.name);
    if (data.personal_info.email)
      fields.email = toLines(data.personal_info.email);
    if (data.personal_info.phone)
      fields.phone = toLines(data.personal_info.phone);
  }

  // Unpack sections into Education / Experience / Projects
  if (data.sections) {
    if (data.sections.education) {
      fields.education = toLines(data.sections.education);
    }
    if (data.sections.experience) {
      fields.experience = toLines(data.sections.experience);
    }
    if (data.sections.projects) {
      fields.projects = toLines(data.sections.projects);
    }
  }

  if (data.labels) {
    fields.labels = toLines(data.labels);
  }

  if (data.probabilities) {
    fields.probabilities = toLines(
      data.probabilities.map(
        (p: any) => `${p.label}: ${(p.score * 100).toFixed(2)}`
      )
    );
  }

  // Keep applied classification if new
  Object.keys(applied).forEach((key) => {
    if (!(key.toLowerCase() in fields)) {
      fields[key] = toLines(applied[key]);
    }
  });

  // Cleanup empty fields
  Object.keys(fields).forEach((k) => {
    const key = k as keyof ParsedCVFields;
    if (!fields[key] || !String(fields[key]).trim()) delete fields[key];
  });

  return fields;
}

const ParsedCVData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // REMOVED: aiUpload - no longer using upload_cv endpoint
  const { aiParse = { result: {} }, parsedResume = null } =
    location.state ?? {};

  const { processedData, fileUrl, candidate } = location.state || {};

  const [user, setUser] = useState<any>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [pdfSticky, setPdfSticky] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showResumeRaw, setShowResumeRaw] = useState(false);

  const [firstName, setFirstName] = useState<string>(
    candidate?.firstName ?? ""
  );
  const [lastName, setLastName] = useState<string>(candidate?.lastName ?? "");
  const [email, setEmail] = useState<string>(candidate?.email ?? "");

  // parseResumeData holds the raw response from the /parse_resume endpoint
  const parseResumeData = useMemo(
    () => aiParse ?? parsedResume ?? null,
    [aiParse, parsedResume]
  );

  // Use parse data directly (no more upload data)
  const primaryData = parseResumeData ?? processedData ?? null;

  const fieldsInitial = useMemo(
    () => normalizeToParsedFields(primaryData) ?? {},
    [primaryData]
  );

  const [fields, setFields] = useState<ParsedCVFields>(fieldsInitial);

  const [rawData, setRawData] = useState<any>(
    () => primaryData?.data ?? primaryData
  );

  useEffect(() => {
    setFields(fieldsInitial);
    setRawData(primaryData?.data ?? primaryData);
  }, [fieldsInitial, primaryData, parseResumeData]);

  useEffect(() => {
    if (email) return;
    const text = [fields?.contact, JSON.stringify(rawData ?? {}, null, 2)]
      .filter(Boolean)
      .join("\n");
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) setEmail(match[0]);
  }, [rawData, fields, email]);

  // Load user on mount - FIXED to use apiFetch
  useEffect(() => {
    const ue = localStorage.getItem("userEmail");
    if (!ue) return;
    (async () => {
      try {
        // ✅ FIXED: Use apiFetch instead of raw fetch
        const res = await apiFetch(`/auth/me?email=${encodeURIComponent(ue)}`, {
          method: "GET",
          credentials: "include",
        });

        if (res.status === 401) {
          console.warn("Auth expired when checking /auth/me");
          setSessionExpired(true);
          return;
        }

        if (!res.ok) {
          console.error("Failed to fetch user:", res.status);
          return;
        }

        const d = await res.json().catch(() => null);
        if (d) setUser(d);
      } catch (err) {
        console.warn("Failed to call /auth/me", err);
      }
    })();
  }, []);

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

  const displayName = useMemo(() => {
    if (!user) return "User";
    if (user.first_name) {
      return `${user.first_name} ${user.last_name || ""} (${
        user.role || "User"
      })`;
    }
    return (
      (user.username || user.email || "User") +
      (user.role ? ` (${user.role})` : "")
    );
  }, [user]);

  const handleUpdate = (key: keyof ParsedCVFields, value: string) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
    setRawData((prev: any) => applyFieldToRaw(prev, key, value));
  };

  const handleSave = async () => {
    const payload = {
      candidate: { firstName, lastName, email },
      fileUrl,
      normalized: fields,
      aiResult: parseResumeData,
      raw: rawData,
      resume: parseResumeData ?? null,
      receivedAt: new Date().toISOString(),
    };

    try {
      // ✅ Use apiFetch with proper configuration
      const res = await apiFetch("/cv/save", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (res.status === 401) {
        setSessionExpired(true);
        alert("Session expired. Please sign in again.");
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save CV");
      }

      alert("CV saved successfully!");
    } catch (e: any) {
      console.error("Failed to save CV:", e?.message || e);
      alert("Failed to save CV. See console for details.");
    }
  };

  // Show page only if parse data is present
  if (!parseResumeData && !processedData) {
    return (
      <Typography variant="h6" sx={{ p: 3 }}>
        No CV data available. Please upload and process a CV first.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
      }}
    >
      {/* Session expired banner */}
      {sessionExpired && (
        <Box
          sx={{ bgcolor: "#b00020", color: "#fff", p: 1, textAlign: "center" }}
        >
          Session expired — please{" "}
          <Button onClick={() => navigate("/login")}>sign in</Button>
        </Box>
      )}

      {/* Top App Bar */}
      <AppBar position="static" sx={{ bgcolor: "#232A3B", boxShadow: "none" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              component="img"
              src={logoNavbar}
              alt="Logo"
              sx={{ width: 80 }}
            />
            <Typography
              variant="h6"
              sx={{
                ml: 2,
                fontWeight: "bold",
                fontFamily: "Helvetica, sans-serif",
              }}
            >
              Processed CV Data
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton
              color="inherit"
              onClick={() => navigate("/help")}
              sx={{ ml: 1, color: "#90ee90" }}
            >
              <HelpOutlineIcon />
            </IconButton>

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
              <Typography variant="subtitle1">{displayName}</Typography>
            </Box>

            <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
              <ExitToAppIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/upload")}
          sx={{
            mb: 2,
            color: "#0073c1",
            fontWeight: "bold",
            textTransform: "none",
            fontFamily: "Helvetica, sans-serif",
            fontSize: "0.9rem",
            "&:hover": { backgroundColor: "rgba(0, 115, 193, 0.1)" },
          }}
        >
          Back to Upload CV Page
        </Button>

        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Left Panel */}
          <Paper
            elevation={4}
            sx={{
              flex: 1,
              p: 2,
              bgcolor: "#DEDDEE",
              overflowY: "auto",
              borderRadius: 2,
              border: "1px solid #ccc",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Extracted Fields
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => setShowRaw((s) => !s)}
                  sx={{
                    textTransform: "none",
                    fontWeight: "bold",
                    color: "#232A3B",
                  }}
                >
                  {showRaw ? "Hide Raw JSON" : "Show Raw JSON"}
                </Button>

                {parseResumeData && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setShowResumeRaw((s) => !s)}
                    sx={{
                      textTransform: "none",
                      fontWeight: "bold",
                      color: "#232A3B",
                    }}
                  >
                    {showResumeRaw ? "Hide Resume JSON" : "Show Resume JSON"}
                  </Button>
                )}
              </Box>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {/* Render fields grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                "& > div": {
                  border: "1px solid #ccc",
                  borderRadius: 1,
                  padding: 1,
                  backgroundColor: "#adb6beff",
                },
              }}
            >
              {(() => {
                try {
                  return Object.entries(safeObject(fields)).map(
                    ([key, value]) => {
                      if (key === "probabilities" && value) {
                        const probs = String(value || "")
                          .split("\n")
                          .filter(Boolean);
                        return (
                          <Box
                            key={key}
                            sx={{
                              gridColumn: "1 / -1",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "bold", textAlign: "center" }}
                            >
                              Skill Value
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "center",
                                gap: 3,
                              }}
                            >
                              {probs.map((p, i) => {
                                const [labelRaw, percentRaw] = p.split(":");
                                const label = (labelRaw || "").trim();
                                const valueNum = Number(
                                  parseFloat((percentRaw || "").trim()) || 0
                                );
                                return (
                                  <CircularProgressBar
                                    key={i}
                                    label={label || `item ${i + 1}`}
                                    value={isNaN(valueNum) ? 0 : valueNum}
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      }

                      return (
                        key !== "other" && (
                          <EditableField
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={value}
                            onSave={(val) =>
                              handleUpdate(key as keyof ParsedCVFields, val)
                            }
                          />
                        )
                      );
                    }
                  );
                } catch (err) {
                  console.error("ParsedCVData render error", {
                    err,
                    fields,
                    rawData,
                    parseResumeData,
                  });
                  return (
                    <Box sx={{ gridColumn: "1 / -1", p: 2 }}>
                      <Typography color="error">
                        Failed to render parsed fields — see console for
                        details.
                      </Typography>
                      <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                        {JSON.stringify(
                          { fields, rawData, parseResumeData },
                          null,
                          2
                        )}
                      </pre>
                    </Box>
                  );
                }
              })()}
            </Box>

            {/* Raw JSON collapsibles */}
            <Collapse in={showRaw} unmountOnExit>
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px dashed #888",
                  backgroundColor: "#eef2f5",
                  color: "#111",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 360,
                  overflow: "auto",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Raw Response
                </Typography>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(rawData, null, 2)}
                </pre>
              </Box>
            </Collapse>

            <Collapse in={showResumeRaw} unmountOnExit>
              <Box
                sx={{
                  mt: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px dashed #888",
                  backgroundColor: "#eef2f5",
                  color: "#111",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 360,
                  overflow: "auto",
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Resume Raw Response
                </Typography>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(parseResumeData, null, 2)}
                </pre>
              </Box>
            </Collapse>

            {/* Parsed Resume normalized view */}
            {parseResumeData && (
              <Box sx={{ mt: 2, p: 1.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, fontWeight: "bold" }}
                >
                  Parsed Resume Details
                </Typography>

                {(() => {
                  try {
                    const parsedFields =
                      normalizeToParsedFields(parseResumeData) || {};
                    const hasAny = Object.keys(parsedFields).length > 0;
                    if (!hasAny) {
                      return (
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: "italic" }}
                        >
                          No parsed fields available.
                        </Typography>
                      );
                    }
                    return renderNormalizedFields(parsedFields);
                  } catch (e) {
                    return (
                      <Typography variant="body2" color="error">
                        Failed to render parsed resume
                      </Typography>
                    );
                  }
                })()}
              </Box>
            )}

            <Box sx={{ mt: 3, textAlign: "center" }}>
              <Button
                variant="contained"
                onClick={handleSave}
                sx={{
                  backgroundColor: "#232A3B",
                  color: "#fff",
                  fontWeight: "bold",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#3a4a5a" },
                }}
              >
                Save CV
              </Button>
            </Box>
          </Paper>

          {/* Right Panel - PDF Viewer */}
          <Paper
            elevation={4}
            sx={{
              flex: 1,
              p: 2,
              bgcolor: "#DEDDEE",
              borderRadius: 2,
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Original CV
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPdfSticky((v) => !v)}
                sx={{
                  textTransform: "none",
                  fontWeight: "bold",
                  color: pdfSticky ? "#f44336" : "#232A3B",
                  borderColor: pdfSticky ? "#f44336" : "#232A3B",
                  "&:hover": {
                    borderColor: pdfSticky ? "#c62828" : "#0d47a1",
                    color: pdfSticky ? "#c62828" : "#0d47a1",
                  },
                }}
              >
                {pdfSticky ? "Unpin PDF" : "Pin PDF"}
              </Button>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {fileUrl ? (
              <Box
                sx={{
                  position: pdfSticky ? "sticky" : "static",
                  top: pdfSticky ? 16 : "auto",
                  height: pdfSticky ? "calc(100vh - 32px)" : "80vh",
                  borderRadius: 1,
                  boxShadow: pdfSticky ? 3 : 0,
                  overflow: "hidden",
                }}
              >
                <iframe
                  src={fileUrl}
                  title="CV PDF Viewer"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              </Box>
            ) : (
              <Typography>No PDF available</Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ParsedCVData;
