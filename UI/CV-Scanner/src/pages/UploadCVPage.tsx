import React, { useEffect, useState, useRef } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Popover,
  Fade,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import Sidebar from "./Sidebar";
import ConfigAlert from "./ConfigAlert";
import { apiFetch, aiFetch } from "../lib/api";

interface ProcessedData {
  profile: string;
  education: string;
  skills: string;
  experience: string;
  projects: string;
  achievements: string;
  contact: string;
  languages: string;
  other: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export default function UploadCVPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [candidateName, setCandidateName] = useState("");
  const [candidateSurname, setCandidateSurname] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const candidateDetailsRef = useRef<HTMLDivElement>(null);
  const cvTableRef = useRef<HTMLDivElement>(null);
  const uploadBoxRef = useRef<HTMLDivElement>(null);
  const processBtnRef = useRef<HTMLButtonElement>(null);

  const [errorPopup, setErrorPopup] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  const [tutorialStep, setTutorialStep] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  // Helper function for safe extraction
  const safeExtract = (obj: any, key: string): string => {
    if (!obj || typeof obj !== 'object') return '';
    
    const value = obj[key];
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  };

  // Safe data extraction
  const extractDataSafely = (data: any): ProcessedData => {
    // Ensure we have an object to work with
    const safeData = data && typeof data === 'object' ? data : {};
    const result = safeData.result || safeData;
    
    return {
      profile: safeExtract(result, 'profile'),
      education: safeExtract(result, 'education'),
      skills: safeExtract(result, 'skills'),
      experience: safeExtract(result, 'experience'),
      projects: safeExtract(result, 'projects'),
      achievements: safeExtract(result, 'achievements'),
      contact: safeExtract(result, 'contact'),
      languages: safeExtract(result, 'languages'),
      other: safeExtract(result, 'other'),
    };
  };

  // Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      const email = localStorage.getItem("userEmail") || "admin@email.com";
      try {
        const res = await apiFetch(`/auth/me?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  // Tutorial anchor element management
  useEffect(() => {
    if (tutorialStep === 0 && uploadBoxRef.current) {
      setAnchorEl(uploadBoxRef.current);
    } else if (tutorialStep === 1 && candidateDetailsRef.current) {
      setAnchorEl(candidateDetailsRef.current);
    } else if (tutorialStep === 2 && file && cvTableRef.current) {
      setAnchorEl(cvTableRef.current);
    } else if (tutorialStep === 3 && file && processBtnRef.current) {
      setAnchorEl(processBtnRef.current);
    } else {
      setAnchorEl(null);
    }
  }, [tutorialStep, file]);

  // Safe API call function
  const makeApiCall = async (endpoint: string, formData: FormData): Promise<ApiResponse> => {
    try {
      const response = await aiFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response || !response.ok) {
        return {
          success: false,
          error: `HTTP ${response?.status || 'No response'}`,
        };
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const text = await response.text();
        return { success: true, data: text };
      }
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  // Main processing function
  const handleProcess = async () => {
    if (!file) {
      setErrorPopup({ open: true, message: "Please select a file first." });
      return;
    }

    if (!candidateName.trim() || !candidateSurname.trim() || !candidateEmail.trim()) {
      setErrorPopup({ open: true, message: "Please fill in all candidate details." });
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      setErrorPopup({ open: true, message: "Please upload a PDF or Word document." });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorPopup({ open: true, message: "File size must be less than 5MB." });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const AI_BASE = "http://localhost:5000";
      const uploadEndpoint = `${AI_BASE}/upload_cv?top_k=3`;
      const parseEndpoint = `${AI_BASE}/parse_resume`;

      console.log("Starting CV processing...");

      // Make API calls in parallel
      const [uploadResult, parseResult] = await Promise.all([
        makeApiCall(uploadEndpoint, formData),
        makeApiCall(parseEndpoint, formData),
      ]);

      console.log("API Results:", { uploadResult, parseResult });

      // Check if both calls failed
      if (!uploadResult.success && !parseResult.success) {
        throw new Error(`Upload: ${uploadResult.error}, Parse: ${parseResult.error}`);
      }

      // Process the data safely
      const processedData = extractDataSafely(parseResult.success ? parseResult.data : uploadResult.data);
      setProcessedData(processedData);

      // Create file URL for preview
      const fileUrl = URL.createObjectURL(file);

      // Prepare navigation data
      const navigationState = {
        aiUpload: uploadResult.success ? uploadResult.data : {},
        aiParse: parseResult.success ? parseResult.data : {},
        fileUrl,
        fileType: file.type,
        candidate: {
          firstName: candidateName.trim(),
          lastName: candidateSurname.trim(),
          email: candidateEmail.trim(),
        },
        processedData,
      };

      console.log("Navigating with state:", navigationState);

      // Navigate to results page
      navigate("/parsed-cv", { state: navigationState });

    } catch (error) {
      console.error("CV Processing Error:", error);
      setErrorPopup({
        open: true,
        message: error instanceof Error ? error.message : "Failed to process CV. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        setErrorPopup({ open: true, message: "Please select a PDF or Word document (.pdf, .doc, .docx)" });
        return;
      }

      setFile(selectedFile);
      
      // Create preview URL for PDFs
      if (selectedFile.type === 'application/pdf') {
        setPdfUrl(URL.createObjectURL(selectedFile));
      } else {
        setPdfUrl(null);
      }
    }
  };

  const handleRemove = () => {
    setFile(null);
    setProcessedData(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    
    // Reset file input
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // Tutorial handlers
  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };

  const handleCloseTutorial = () => setShowTutorial(false);

  const handleBrowseClick = () => {
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#1E1E1E", color: "#fff" }}>
      <Sidebar
        userRole={user?.role || "User"}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <AppBar position="static" sx={{ bgcolor: "#232A3B", boxShadow: "none" }}>
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <Tooltip title="Run Tutorial" arrow>
              <IconButton
                onClick={() => {
                  setShowTutorial(true);
                  setTutorialStep(0);
                  setFadeIn(true);
                }}
                sx={{ ml: 1, color: "#FFEB3B" }}
              >
                <LightbulbRoundedIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Help" arrow>
              <IconButton
                color="inherit"
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Box
              sx={{ display: "flex", alignItems: "center", ml: 2, cursor: "pointer" }}
              onClick={() => navigate("/settings")}
            >
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                {user ? `${user.first_name || user.email} (${user.role || "User"})` : "User"}
              </Typography>
            </Box>

            <IconButton color="inherit" onClick={() => navigate("/login")} sx={{ ml: 1 }}>
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
            Upload Candidate CV
          </Typography>

          <ConfigAlert />
          
          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, backgroundColor: "#DEDDEE" }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#000", mb: 2 }}>
              Upload a candidate's CV to automatically extract skills and project matches
            </Typography>

            {/* Upload Area */}
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
                bgcolor: "#cbd5e0",
              }}
            >
              <CloudUploadIcon fontSize="large" />
              <Typography variant="body2" sx={{ mb: 2 }}>
                Drag and drop CV File here
              </Typography>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Button
                variant="contained"
                sx={reviewButtonStyle}
                onClick={handleBrowseClick}
              >
                Browse Files
              </Button>
            </Box>

            {/* Candidate Details */}
            <Box ref={candidateDetailsRef}>
              <TextField
                label="Candidate Name"
                fullWidth
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                sx={{ mb: 3 }}
                InputLabelProps={{ sx: { color: "#000", fontWeight: "bold" } }}
              />

              <TextField
                label="Candidate Surname"
                fullWidth
                required
                value={candidateSurname}
                onChange={(e) => setCandidateSurname(e.target.value)}
                sx={{ mb: 3 }}
                InputLabelProps={{ sx: { color: "#000", fontWeight: "bold" } }}
              />

              <TextField
                label="Candidate Email"
                fullWidth
                required
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                sx={{ mb: 3 }}
                InputLabelProps={{ sx: { color: "#000", fontWeight: "bold" } }}
              />
            </Box>

            {/* File Preview */}
            {file && (
              <Box ref={cvTableRef}>
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
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              cursor: pdfUrl ? "pointer" : "default",
                              color: pdfUrl ? "#003cbd" : "#000",
                              textDecoration: pdfUrl ? "underline" : "none",
                            }}
                            onClick={() => pdfUrl && setPdfPreviewOpen(true)}
                          >
                            <PictureAsPdfIcon sx={{ mr: 1 }} />
                            {file.name}
                          </Box>
                        </TableCell>
                        <TableCell>{(file.size / 1024 / 1024).toFixed(2)} MB</TableCell>
                        <TableCell>
                          <IconButton color="error" onClick={handleRemove}>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Process Button */}
            <Box sx={{ textAlign: "center", mb: 2 }}>
              {file && (
                <Button
                  variant="contained"
                  sx={reviewButtonStyle}
                  onClick={handleProcess}
                  disabled={loading}
                  ref={processBtnRef}
                >
                  {loading ? "Processing..." : "Process CV"}
                </Button>
              )}
            </Box>

            <Typography variant="body2" color="#000">
              <strong>Requirements:</strong>
              <br />
              • Accepted formats: PDF, DOC, DOCX
              <br />
              • Maximum file size: 5MB
              <br />
              • Ensure CV contains clear section headings
            </Typography>
          </Paper>
        </Box>
      </Box>

      {/* Error Dialog */}
      <Dialog open={errorPopup.open} onClose={() => setErrorPopup({ ...errorPopup, open: false })}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography>{errorPopup.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorPopup({ ...errorPopup, open: false })}>OK</Button>
        </DialogActions>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onClose={() => setPdfPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview: {file?.name}</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title="PDF Preview"
              width="100%"
              height="600px"
              style={{ border: "none" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Tutorial Popover */}
      <Popover
        open={showTutorial && tutorialStep >= 0 && tutorialStep <= 3 && Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleCloseTutorial}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        componentsProps={{
          root: { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }
        }}
        disableRestoreFocus={false}
        disableAutoFocus={true}
        disableEnforceFocus={true}
      >
        <Fade in={fadeIn} timeout={250}>
          <Box sx={{ p: 2, minWidth: 280, textAlign: "center" }}>
            {tutorialStep === 0 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 1: Upload a CV
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Start by uploading a candidate's CV here. You can drag and drop or browse for a file.
                </Typography>
              </>
            )}
            {tutorialStep === 1 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 2: Candidate Details
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Enter the candidate's name, surname, and email address in these fields.
                </Typography>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 3: CV Table
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Here you can see the uploaded CV file. You can remove it if needed before processing.
                </Typography>
              </>
            )}
            {tutorialStep === 3 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 4: Process the CV
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  When you're ready, click <b>Process CV</b> to extract skills and information from the uploaded file.
                </Typography>
              </>
            )}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3, gap: 2 }}>
              <Button variant="text" size="small" onClick={handleCloseTutorial}>
                End Tutorial
              </Button>
              <Box sx={{ display: "flex", gap: 2 }}>
                {tutorialStep > 0 && (
                  <Button variant="outlined" onClick={() => handleStepChange(tutorialStep - 1)}>
                    Previous
                  </Button>
                )}
                {tutorialStep < 3 ? (
                  <Button variant="contained" onClick={() => handleStepChange(tutorialStep + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleCloseTutorial}>
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

const reviewButtonStyle = {
  background: "#232A3B",
  color: "#DEDDEE",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  "&:hover": {
    background: "#2d3748",
    transform: "translateY(-1px)",
  },
  "&:disabled": {
    background: "#6b7280",
  },
  textTransform: "none",
  transition: "all 0.3s ease",
};