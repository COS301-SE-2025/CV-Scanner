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
}

function toLines(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter(Boolean).join("\n");
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

// Try to map common AI response shapes into ParsedCVFields
function normalizeToParsedFields(input: any): ParsedCVFields {
  if (!input) return {};
  const data = input.data ?? input.result ?? input.payload ?? input;

  const applied = data.applied || data.classification || undefined;

  const fields: ParsedCVFields = {
    profile:
      toLines(data.profile) || toLines(data.summary) || toLines(data.objective),
    education:
      toLines(data.education) ||
      toLines(applied?.Education) ||
      toLines(data.studies) ||
      toLines(data.qualifications),
    skills:
      toLines(data.skills) ||
      toLines(applied?.Skills) ||
      toLines(data.technologies) ||
      toLines(data.tech_stack),
    experience:
      toLines(data.experience) ||
      toLines(applied?.Experience) ||
      toLines(data.work_history),
    projects: toLines(data.projects) || toLines(data.project_experience),
    achievements: toLines(data.achievements) || toLines(data.awards),
    contact:
      toLines(data.contact) ||
      toLines(data.contact_info) ||
      toLines(data.contacts),
    languages: toLines(data.languages),
    other:
      // Prefer a compact "raw" block if present; else show the whole normalized payload
      toLines(data.raw) ??
      (Object.keys(data).length ? toLines(data) : undefined),
  };

  // Drop empty keys
  Object.keys(fields).forEach((k) => {
    const key = k as keyof ParsedCVFields;
    if (!fields[key] || !String(fields[key]).trim()) delete fields[key];
  });

  return fields;
}

const ParsedCVData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processedData, fileUrl } = location.state || {};
  const [user, setUser] = useState<any>(null);
  const [pdfSticky, setPdfSticky] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // Derive normalized fields from the AI response
  const fieldsInitial = useMemo(
    () => normalizeToParsedFields(processedData),
    [processedData]
  );
  const [fields, setFields] = useState<ParsedCVFields>(fieldsInitial);

  // Keep local state in sync if a new response arrives
  useEffect(() => {
    setFields(fieldsInitial);
  }, [fieldsInitial]);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  const handleUpdate = (key: keyof ParsedCVFields, value: string) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
  };

  const handleSave = async () => {
    try {
      const response = await fetch("http://localhost:8081/cv/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!response.ok) throw new Error("Failed to save CV");
      alert("CV saved successfully!");
    } catch (error) {
      console.error(error);
      alert("Error saving CV");
    }
  };

  if (!processedData || !fileUrl) {
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
          {/* Left: Logo + Page title */}
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

          {/* Right: Help / User / Logout */}
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
              onClick={() => navigate("/login")}
              sx={{ ml: 1 }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Page Content */}
      <Box sx={{ p: 3 }}>
        {/* Back Button */}
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

        {/* Two-column layout */}
        <Box sx={{ display: "flex", gap: 3 }}>
          {/* Left: Editable parsed CV */}
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
              {Object.entries(fields).map(
                ([key, value]) =>
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
              )}
            </Box>

            {/* Other / Raw */}
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
                  {JSON.stringify(
                    processedData?.data ?? processedData,
                    null,
                    2
                  )}
                </pre>
              </Box>
            </Collapse>

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

          {/* Right: CV file preview */}
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
              <Typography variant="body2">
                File preview not available.{" "}
                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                  Download CV
                </a>
              </Typography>
            )}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ParsedCVData;
