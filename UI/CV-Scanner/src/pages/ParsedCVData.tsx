import React, { useState } from "react";
import { Box, Typography, Paper, Divider } from "@mui/material";
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

const { processedData, fileUrl, fileType } = location.state || {};

const ParsedCVData: React.FC = () => {
  const location = useLocation();
  const { processedData, fileUrl } = location.state || {};

  const [fields, setFields] = useState<ParsedCVFields>(processedData || {});

  const handleUpdate = (key: keyof ParsedCVFields, value: string) => {
    const updated = { ...fields, [key]: value };
    setFields(updated);
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
    </Box>
  );
};

export default ParsedCVData;
