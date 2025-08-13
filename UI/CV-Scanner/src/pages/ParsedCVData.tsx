import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Button
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

const ParsedCVData: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { processedData, fileUrl } = location.state || {};

  const [fields, setFields] = useState<ParsedCVFields>(processedData || {});
  const [user, setUser] = useState<any>(null);

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

  // Add this inside your component, after handleUpdate
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
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "#1E1E1E" }}>
      {/* Top App Bar */}
      <AppBar position="static" sx={{ bgcolor: "#232A3B", boxShadow: "none" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
            {/* Left: Logo + Page title */}
            <Box sx={{ display: "flex", alignItems: "center"}}>
            <Box
                component="img"
                src={logoNavbar}
                alt="Logo"
                sx={{ width: 80 }}
            />
            <Typography variant="h6" sx={{ fontFamily: 'Helvetica, sans-serif',ml: 2, fontWeight: "bold" }}>
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
                    ? `${user.first_name} ${user.last_name || ""} (${user.role || "User"})`
                    : (user.username || user.email) + (user.role ? ` (${user.role})` : "")
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
      <Box sx={{ p: 3}}>
        {/* Back Button */}
        <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/candidates")}
            sx={{
              mb: 2,
              color: "#0073c1",
              fontWeight: "bold",
              textTransform: "none",
              fontFamily: 'Helvetica, sans-serif',
              fontSize: "0.9rem",
              "&:hover": {
                backgroundColor: "rgba(0, 115, 193, 0.1)",
              },
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
              border: "1px solid #ccc"
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Processed CV Data
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box
  sx={{
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 2,
    "& > div": { // target each grid child
      border: "1px solid #ccc",
      borderRadius: 1,
      padding: 1,
      backgroundColor: "#adb6beff",
    }
  }}
>
  {Object.entries(fields).map(([key, value]) => (
    <EditableField
      key={key}
      label={key.charAt(0).toUpperCase() + key.slice(1)}
      value={value}
      onSave={(val) => handleUpdate(key as keyof ParsedCVFields, val)}
    />
  ))}
</Box>
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
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Original CV
            </Typography>
            <Divider sx={{ mb: 2 }} />

            {fileUrl ? (
              <iframe
                src={fileUrl}
                style={{ width: "100%", height: "80vh", border: "none" }}
                title="CV PDF Viewer"
              />
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
