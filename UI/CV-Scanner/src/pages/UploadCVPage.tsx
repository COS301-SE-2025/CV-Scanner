import React, { useState, useEffect, useRef } from "react";

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
  Divider,
  Chip,
  Popover,
  Fade,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo2 from "../assets/logo2.png";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export default function UploadCVPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<any | null>(null); // State for processed data
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility
  const [contactInfo, setContactInfo] = useState(""); // State for contact information
  const [additionalInfo, setAdditionalInfo] = useState(""); // State for additional information

  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string; // <-- add this
    email?: string; // <-- and this
  } | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const uploadBoxRef = useRef<HTMLDivElement>(null);
  const additionalInfoRef = useRef<HTMLInputElement>(null);
  const processBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (tutorialStep === 0 && uploadBoxRef.current)
      setAnchorEl(uploadBoxRef.current);
    else if (tutorialStep === 1 && additionalInfoRef.current)
      setAnchorEl(additionalInfoRef.current);
    else if (tutorialStep === 2 && processBtnRef.current)
      setAnchorEl(processBtnRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);

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
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };

  const handleCloseTutorial = () => setShowTutorial(false);

  const navigate = useNavigate();

  const location = useLocation();

  // Set anchorEl when tutorialStep changes
  useEffect(() => {
    if (tutorialStep === 0 && uploadBoxRef.current)
      setAnchorEl(uploadBoxRef.current);
    else if (tutorialStep === 1 && additionalInfoRef.current)
      setAnchorEl(additionalInfoRef.current);
    else if (tutorialStep === 2 && processBtnRef.current)
      setAnchorEl(processBtnRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);


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
      {!collapsed ? (
        <Box
          sx={{
            width: 220,
            bgcolor: "#5a88ad",
            display: "flex",
            flexDirection: "column",
            p: 2,
            position: "relative",
          }}
        >
          {/* Collapse Button */}
          <IconButton
            onClick={() => setCollapsed(true)}
            sx={{
              color: "#fff",
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 1,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" fill="currentColor" />
            </svg>
          </IconButton>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3, mt: 5 }}>
            <img src={logo2} alt="Team Logo" style={{ width: 120 }} />
          </Box>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/dashboard" ? "active" : ""}
            startIcon={<DashboardIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>

          <Button
            fullWidth
            sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
            className={location.pathname === "/upload" ? "active" : ""}
            startIcon={<UploadFileIcon />}
            onClick={() => navigate("/upload")}
          >
            Upload CV
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/candidates" ? "active" : ""}
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/candidates")}
          >
            Candidates
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/search" ? "active" : ""}
            startIcon={<SearchIcon />}
            onClick={() => navigate("/search")}
          >
            Search
          </Button>
        </Box>
      ) : (
        // Expand Icon when sidebar is collapsed
        <Box
          sx={{
            width: 40,
            bgcolor: "#5a88ad",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 1,
          }}
        >
          <IconButton
            onClick={() => setCollapsed(false)}
            sx={{ color: "#fff" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" fill="currentColor" />
            </svg>
          </IconButton>
        </Box>
      )}

      {/* Main Content with Top Bar */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top App Bar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#5a88ad", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
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
            <Tooltip title="Run Tutorial" arrow>
              <IconButton
                color="primary"
                sx={{ ml: 1 }}
                onClick={() => {
                  setShowTutorial(true);
                  setTutorialStep(0);
                  setFadeIn(true);
                }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <IconButton
              color="inherit"
              onClick={() => {
                navigate("/login"); // Redirect to login page
              }}
            >
              <ExitToAppIcon />
            </IconButton>
            {/* Help icon button for tutorial */}
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
              ref={uploadBoxRef}
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
              inputRef={additionalInfoRef}
            />

            {/* File Table */}
            {file && (
              <TableContainer sx={{ mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        File Name
                      </TableCell>
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
                ref={processBtnRef}
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
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        PaperProps={{
          sx: {
            backgroundColor: "#5a88ad",
            maxWidth: "60vw",
            width: "60vw",
            height: "60vw",
            maxHeight: "90vh",
            minHeight: "40vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: "#181c2f",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1.3rem",
          }}
        >
          Processed CV Data
        </DialogTitle>
        <Divider sx={{ mb: 2 }} />
        <DialogContent>
          {processedData && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                px: 2,
                py: 1,
              }}
            >
              {/* Left Column */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#232a3b",
                    mb: 2,
                    fontWeight: "bold",
                    letterSpacing: 1,
                  }}
                >
                  Personal Details
                </Typography>
                <Typography sx={{ mb: 3, fontWeight: "bold" }}>
                  Name:{" "}
                  <span style={{ fontWeight: 400 }}>{processedData.name}</span>
                </Typography>
                <Typography sx={{ mb: 1, fontWeight: "bold" }}>
                  Skills:
                </Typography>
                <Box
                  sx={{
                    color: "#232a3b",
                    display: "flex",
                    fontWeight: "bold",
                    flexWrap: "wrap",
                    gap: 1.5,
                    mb: 3,
                  }}
                >
                  {processedData.skills.map((skill: string, idx: number) => (
                    <Chip
                      key={idx}
                      label={skill}
                      sx={{
                        borderRadius: "16px",
                        bgcolor: "#e0e0e0",
                        color: "#333",
                        fontWeight: "bold",
                        fontSize: "0.95em",
                        px: 2,
                        py: 0.5,
                      }}
                    />
                  ))}
                </Box>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Experience:
                  <span
                    style={{
                      fontWeight: 400,
                      marginLeft: 6,
                    }}
                  >
                    {processedData.experience}
                  </span>
                </Typography>
              </Box>
              {/* Right Column */}
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#232a3b",
                    mb: 2,
                    fontWeight: "bold",
                    letterSpacing: 1,
                  }}
                >
                  Other Information
                </Typography>
                <Typography sx={{ mb: 3 }}>
                  <span style={{ fontWeight: "bold" }}>Education:</span>
                  <span style={{ marginLeft: 6 }}>
                    {processedData.education}
                  </span>
                </Typography>
                <Typography sx={{ mb: 3 }}>
                  <span style={{ fontWeight: "bold" }}>Contact Info:</span>
                  <span style={{ marginLeft: 6 }}>
                    {processedData.contactInfo}
                  </span>
                </Typography>
                <Typography sx={{ mb: 3 }}>
                  <span style={{ fontWeight: "bold" }}>Additional Info:</span>
                  <span style={{ marginLeft: 6 }}>
                    {processedData.additionalInfo}
                  </span>
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#181c2f", justifyContent: "flex-end" }}>
          <Button
            onClick={handleCloseModal}
            sx={{
              bgcolor: "#e0e0e0",
              color: "#333",
              fontWeight: "bold",
              textTransform: "none",
              boxShadow: "none",
              "&:hover": {
                bgcolor: "#cccccc",
                color: "#222",
              },
            }}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tutorial Popover */}
      <Popover
        open={
          showTutorial &&
          tutorialStep >= 0 &&
          tutorialStep <= 2 &&
          Boolean(anchorEl)
        }
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
            {tutorialStep === 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 1: Upload a CV
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Start by uploading a candidate's CV here. You can drag and
                  drop or browse for a file.
                </Typography>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 2: Additional Information
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Fill in any extra details about the candidate or the CV here.
                </Typography>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 3: Process the CV
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  When you're ready, click <b>Process CV</b> to extract skills
                  and information from the uploaded file.
                </Typography>
              </>
            )}
            {/* Shared navigation buttons */}
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
                {tutorialStep > 0 && (
                  <Button
                    variant="outlined"
                    onClick={() => handleStepChange(tutorialStep - 1)}
                    sx={{
                      color: "#5a88ad",
                      borderColor: "#5a88ad",
                      fontWeight: "bold",
                      textTransform: "none",
                      "&:hover": { borderColor: "#487DA6", color: "#487DA6" },
                    }}
                  >
                    Previous
                  </Button>
                )}
                {tutorialStep < 2 ? (
                  <Button
                    variant="contained"
                    onClick={() => handleStepChange(tutorialStep + 1)}
                    sx={{
                      bgcolor: "#5a88ad",
                      color: "#fff",
                      fontWeight: "bold",
                      textTransform: "none",
                      "&:hover": { bgcolor: "#487DA6" },
                    }}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleCloseTutorial}
                    sx={{
                      bgcolor: "#5a88ad",
                      color: "#fff",
                      fontWeight: "bold",
                      textTransform: "none",
                      "&:hover": { bgcolor: "#487DA6" },
                    }}
                  >
                    Finish
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </Fade>
      </Popover>
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
