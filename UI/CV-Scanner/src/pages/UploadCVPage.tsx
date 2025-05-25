import React, { useState } from 'react';
import { Box, Button, Typography, Paper, IconButton } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

export default function UploadCVPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleProcessCV = () => {
    if (file) {
      // Add CV processing logic here
      alert(`Processing: ${file.name}`);
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#181c2f' }}>
      {/* Sidebar */}
      <Box sx={{ width: 240, bgcolor: '#407BA7', p: 2, color: 'white' }}>
        <img src="/src/assets/logo.png" alt="Entelect Logo" style={{ width: 120, marginBottom: 20 }} />
        <Box sx={{ mb: 2, pl: 1, fontWeight: 'bold' }}>Dashboard</Box>
        <Box sx={{ mb: 2, pl: 1, bgcolor: '#00c4ff', borderRadius: 1, py: 1 }}>Upload CV</Box>
        <Box sx={{ mb: 2, pl: 1 }}>Candidates</Box>
        <Box sx={{ mb: 2, pl: 1 }}>Search</Box>
        <Box sx={{ position: 'absolute', bottom: 20, pl: 1 }}>Settings</Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 4 }}>
        <Paper elevation={3} sx={{
          bgcolor: '#cceeff',
          borderRadius: 2,
          p: 4,
          maxWidth: 800,
          mx: 'auto',
          mt: 4
        }}>
          <Typography variant="h5" fontWeight="bold" color="#0077cc" gutterBottom>
            Upload Candidate CV
          </Typography>
          <Typography variant="subtitle1" color="black" mb={2}>
            Upload a candidate's CV to automatically extract skills and project matches
          </Typography>

          {/* Upload Box */}
          <Box sx={{
            border: '2px dashed #999',
            borderRadius: 2,
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            mb: 3,
            bgcolor: 'white'
          }}>
            <CloudUploadIcon fontSize="large" />
            <Typography variant="body2">Drag and drop CV File here</Typography>
            <label htmlFor="file-upload">
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button variant="contained" sx={{ mt: 1, background: '#0077cc' }}>
                Browse Files
              </Button>
            </label>
          </Box>

          {file && (
            <Box sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: '#e3f2fd',
              p: 2,
              borderRadius: 1,
              mb: 3
            }}>
              <Typography>{file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</Typography>
              <IconButton onClick={handleRemoveFile} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          )}

          {/* Action Button */}
          <Box display="flex" justifyContent="center" mb={2}>
            <Button
              variant="contained"
              onClick={handleProcessCV}
              disabled={!file}
              sx={{
                px: 4,
                background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
                '&:hover': { background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)' }
              }}
            >
              Process CV
            </Button>
          </Box>

          <Typography variant="body2" color="black">
            <strong>Requirements:</strong><br />
            • Accepted formats: PDF, DOC, DOCX<br />
            • Maximum file size: 5MB<br />
            • Ensure CV contains clear section headings
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
