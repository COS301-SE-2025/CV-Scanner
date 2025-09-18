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

function normalizeToParsedFields(input: any): ParsedCVFields {
  if (!input) return {};
  const data = input.data ?? input.result ?? input.payload ?? input;
  const applied = data.applied || data.classification || {};

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
    if (data.personal_info.email) fields.email = toLines(data.personal_info.email);
    if (data.personal_info.phone) fields.phone = toLines(data.personal_info.phone);
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

const renderNormalizedFields = (fields: ParsedCVFields) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {Object.entries(fields).map(([key, value]) => {
        if (!value) return null;

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
                value={value}
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
              value={value}
              onSave={() => {}}
              fullWidth
            />
          </Box>
        );
      })}
    </Box>
  );
};


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

const ParsedCVData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // processedData is the existing response (upload_cv).
  // aiParse / parsedResume are from the parse_resume endpoint (new) and should be shown as well.
  const { processedData, fileUrl, candidate, aiUpload, aiParse, parsedResume } =
    location.state || {};

  const [user, setUser] = useState<any>(null);
  const [pdfSticky, setPdfSticky] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [showResumeRaw, setShowResumeRaw] = useState(false);


  const [firstName, setFirstName] = useState<string>(
    candidate?.firstName ?? ""
  );
  const [lastName, setLastName] = useState<string>(candidate?.lastName ?? "");
  const [email, setEmail] = useState<string>(candidate?.email ?? "");
  // parseResumeData holds the raw response from the /parse_resume endpoint if present
  const parseResumeData = useMemo(
    () => aiParse ?? parsedResume ?? null,
    [aiParse, parsedResume]
  );

  // prefer processedData (old name) or aiUpload (new name) as the primary upload_cv response
  const primaryUpload = processedData ?? aiUpload ?? null;

  const fieldsInitial = useMemo(
    () => normalizeToParsedFields(primaryUpload ?? parseResumeData),
    [primaryUpload, parseResumeData]
  );
  const [fields, setFields] = useState<ParsedCVFields>(fieldsInitial);

  const [rawData, setRawData] = useState<any>(
    () =>
      primaryUpload?.data ??
      primaryUpload ??
      parseResumeData?.data ??
      parseResumeData
  );

  useEffect(() => {
    setFields(fieldsInitial);
    setRawData(
      primaryUpload?.data ??
        primaryUpload ??
        parseResumeData?.data ??
        parseResumeData
    );
  }, [fieldsInitial, processedData, parseResumeData]);

  useEffect(() => {
    if (email) return;
    const text = [fields?.contact, JSON.stringify(rawData ?? {}, null, 2)]
      .filter(Boolean)
      .join("\n");
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) setEmail(match[0]);
  }, [rawData, fields, email]);

  useEffect(() => {
    const ue = localStorage.getItem("userEmail");
    if (!ue) return;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(ue)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setUser(d))
      .catch(() => {});
  }, []);

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
      // prefer processedData / aiUpload (upload_cv) but fall back to parse_resume output
      aiResult: primaryUpload ?? parseResumeData,
      raw: rawData,
      receivedAt: new Date().toISOString(),
    };
    const res = await fetch("http://localhost:8081/cv/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text || "Failed to save CV");
    alert("CV saved successfully!");
  };

  // Show page when either upload_cv (primaryUpload) or parse_resume (parseResumeData) is present.
  if (!primaryUpload && !parseResumeData) {
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

            <IconButton
              color="inherit"
              onClick={() => navigate("/login")}
              sx={{ ml: 1 }}
            >
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
            </Box>
            <Divider sx={{ mb: 2 }} />

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
              {Object.entries(fields).map(([key, value]) => {
                if (key === "probabilities" && value) {
                  const probs = String(value).split("\n");

                  return (
                    <Box
                      key={key}
                      sx={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        flexDirection: "column", // stack heading + progress bars
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      {/* Heading */}
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: "bold", textAlign: "center" }}
                      >
                        Skill Value
                      </Typography>

                      {/* Progress bars */}
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: 3,
                        }}
                      >
                        {probs.map((p, i) => {
                          const [label, percent] = p.split(":");
                          return (
                            <CircularProgressBar
                              key={i}
                              label={label.trim()}
                              value={parseFloat(percent)}
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
              })}
            </Box>

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

{/* If parse_resume data was provided, render it below the raw response */}
{parseResumeData && (
  <Box sx={{ mt: 2, p: 1.5 }}>
    <Typography
      variant="subtitle2"
      sx={{ mb: 1, fontWeight: "bold" }}
    >
      Parsed Resume (parse_resume)
    </Typography>

    {(() => {
      try {
        const parsedFields = normalizeToParsedFields(parseResumeData);
        const hasAny = Object.keys(parsedFields || {}).length > 0;
        if (!hasAny) {
          return (
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
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
        {/* ✅ Toggle Resume AI Raw JSON */}
    <Button
      variant="text"
      size="small"
      onClick={() => setShowResumeRaw((s) => !s)}
      sx={{
        mt: 2,
        textTransform: "none",
        fontWeight: "bold",
        color: "#232A3B",
      }}
    >
      {showResumeRaw ? "Hide Resume JSON" : "Show Resume JSON"}
    </Button>

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

          {/* Right Panel */}
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
