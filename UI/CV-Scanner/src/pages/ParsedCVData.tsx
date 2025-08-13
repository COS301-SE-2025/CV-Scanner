import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import EditableField from "./EditableField";
import { useLocation } from "react-router-dom";

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
  const { processedData, fileUrl } = location.state || {};

  const [fields, setFields] = useState<ParsedCVFields>(processedData || {});
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleUpdate = (key: keyof ParsedCVFields, value: string) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
  };

  const handleSaveCV = async () => {
    try {
      const response = await fetch("http://localhost:5000/save_cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!response.ok) throw new Error("Failed to save CV");

      setSnackbar({
        open: true,
        message: "CV saved successfully!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Error saving CV",
        severity: "error",
      });
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
    <Box sx={{ display: "flex", gap: 3, height: "100%", p: 3 }}>
      {/* Left: Editable parsed CV */}
      <Paper
        elevation={4}
        sx={{
          flex: 1,
          p: 3,
          bgcolor: "#f8f9fa",
          overflowY: "auto",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Parsed CV Data
        </Typography>
        <Divider sx={{ mb: 2 }} />

        {Object.entries(fields).map(([key, value]) => (
          <EditableField
            key={key}
            label={key.charAt(0).toUpperCase() + key.slice(1)}
            value={value}
            onSave={(val) => handleUpdate(key as keyof ParsedCVFields, val)}
          />
        ))}

        <Button
          variant="contained"
          color="primary"
          onClick={handleSaveCV}
          sx={{ mt: 2, alignSelf: "flex-start" }}
        >
          Save CV
        </Button>
      </Paper>

      {/* Right: CV file preview */}
      <Paper
        elevation={4}
        sx={{
          flex: 1,
          p: 2,
          bgcolor: "#fff",
          borderRadius: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
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

      {/* Snackbar for save confirmation */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ParsedCVData;
