import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditableField from "./EditableField";
import { useLocation, useNavigate } from "react-router-dom";

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
    <Box sx={{ bgcolor:"#1E1E1E",p: 3 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/upload")}
        sx={{
          mb: 2,
          color: "#0073c1",
          fontWeight: "bold",
          textTransform: "none",
          "&:hover": {
            backgroundColor: "rgba(0, 115, 193, 0.1)",
          },
        }}
      >
        Back to Upload Page
      </Button>

      {/* Page Title */}
      

      <Box sx={{ display: "flex", gap: 3, height: "100%" }}>

        
        {/* Left: Editable parsed CV */}
        <Paper
          elevation={4}
          sx={{
            flex: 1,
            p: 2,
            bgcolor: "#DEDDEE",
            overflowY: "auto",
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
            Processed CV Data
        </Typography>
        <Divider sx={{ mb: 2 }} />
          <Grid container spacing={2}>
            {Object.entries(fields).map(([key, value]) => (
              <Grid item xs={12} sm={6} key={key}>
                <Box
                  sx={{
                    border: "1px solid #ccc",
                    borderRadius: 2,
                    p: 1.5,
                    bgcolor: "#fff",
                  }}
                >
                  <EditableField
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    value={value}
                    onSave={(val) => handleUpdate(key as keyof ParsedCVFields, val)}
                    modalEdit // Pass a prop to open in modal instead of inline
                  />
                </Box>
              </Grid>
            ))}
          </Grid>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveCV}
            sx={{ mt: 3, alignSelf: "flex-start" }}
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
            bgcolor: "#DEDDEE",
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
      </Box>

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
