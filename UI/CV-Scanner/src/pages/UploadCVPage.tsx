import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  AppBar,
  Toolbar,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import logo from "../assets/logo.png";

export default function UploadCVPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<any | null>(null); // State for processed data
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [contactInfo, setContactInfo] = useState(""); // State for contact information
  const [additionalInfo, setAdditionalInfo] = useState(""); // State for additional information

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleRemove = () => {
    setFile(null);
    setProcessedData(null); // Clear processed data when file is removed
  };

  const handleProcess = () => {
    if (file) {
      // Simulate processing with mock data
      const mockData = {
        name: "John Doe",
        skills: ["JavaScript", "React", "Node.js"],
        experience: "5 years",
        education: "Bachelor's in Computer Science",
        contactInfo,
        additionalInfo,
      };
      setProcessedData(mockData);
      setIsModalOpen(true); // Open the modal
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false); // Close the modal
  };

  const handleBrowseClick = () => {
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#181c2f",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      <Box
        sx={{
          width: 220,
          bgcolor: "#5a88ad",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <img src={logo} alt="Entelect Logo" style={{ width: 120 }} />
        </Box>
        <Button
          fullWidth
          sx={navButtonStyle}
          startIcon={<DashboardIcon />}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </Button>
        <Button
          fullWidth
          sx={navButtonStyle}
          startIcon={<UploadFileIcon />}
          onClick={() => navigate("/upload")}
        >
          Upload CV
        </Button>
        <Button
          fullWidth
          sx={navButtonStyle}
          startIcon={<PeopleIcon />}
          onClick={() => navigate("/candidates")}
        >
          Candidates
        </Button>
        <Button
          fullWidth
          sx={navButtonStyle}
          startIcon={<SearchIcon />}
          onClick={() => navigate("/search")}
        >
          Search
        </Button>
      </Box>

      {/* Main Content with Top Bar */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top App Bar */}
        <AppBar position="static" sx={{ bgcolor: "#5a88ad", boxShadow: "none" }}>
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">Admin User</Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
            Upload Candidate CV
          </Typography>

          <Paper
            elevation={6}
            sx={{ p: 4, borderRadius: 3, backgroundColor: "#bce4ff" }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: "#0073c1", mb: 2 }}
            >
              Upload a candidate's CV to automatically extract skills and
              project matches
            </Typography>

            {/* Upload Box */}
            <Box
              sx={{
                border: "2px dashed #999",
                borderRadius: 2,
                height: 160,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                mb: 3,
                bgcolor: "#fff",
              }}
            >
              <CloudUploadIcon fontSize="large" />
              <Typography variant="body2">
                Drag and drop CV File here
              </Typography>
              <Box>
                <input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Button
                  variant="contained"
                  sx={{ mt: 1, background: "#0077cc" }}
                  onClick={handleBrowseClick}
                >
                  Browse Files
                </Button>
              </Box>
            </Box>

            {/* Contact Information */}
            <TextField
              label="Contact Information"
              fullWidth
              variant="outlined"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* Additional Information */}
            <TextField
              label="Additional Information"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              sx={{ mb: 3 }}
            />

            {/* File Table */}
            {file && (
              <TableContainer sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>File Name</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Size</TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>{file.name}</TableCell>
                      <TableCell>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </TableCell>
                      <TableCell>
                        <IconButton color="error" onClick={handleRemove}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Process Button */}
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <Button
                variant="contained"
                disabled={!file}
                sx={reviewButtonStyle}
                onClick={handleProcess}
              >
                Process CV
              </Button>
            </Box>

            {/* Upload Notes */}
            <Typography variant="body2" color="black">
              <strong>Requirements:</strong>
              <br />
              • Accepted formats: PDF, DOC, DOCX
              <br />
              • Maximum file size: 5MB
              <br />• Ensure CV contains clear section headings
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Modal for Processed Data */}
      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogTitle>Processed CV Data</DialogTitle>
        <DialogContent>
          {processedData && (
            <Box>
              <Typography>Name: {processedData.name}</Typography>
              <Typography>Skills: {processedData.skills.join(", ")}</Typography>
              <Typography>Experience: {processedData.experience}</Typography>
              <Typography>Education: {processedData.education}</Typography>
              <Typography>Contact Info: {processedData.contactInfo}</Typography>
              <Typography>Additional Info: {processedData.additionalInfo}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ... (keep your existing style definitions)

// Style reuse
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
};

const reviewButtonStyle = {
  background: "linear-gradient(45deg, #0a1172 0%, #032c3b 50%, #00b300 100%)",
  color: "#ffffff !important",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background: "linear-gradient(45deg, #081158 0%, #022028 50%, #009a00 100%)",
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
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)",
  },
};
