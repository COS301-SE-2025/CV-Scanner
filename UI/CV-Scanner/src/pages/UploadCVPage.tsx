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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Popover,
  Fade,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import Sidebar from "./Sidebar";

export default function UploadCVPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [errorPopup, setErrorPopup] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: "",
  });

  const devUser = {
    email: "dev@example.com",
    password: "Password123",
    first_name: "John",
    last_name: "Doe",
    role: "Admin",
  };

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

  const uploadBoxRef = useRef<HTMLDivElement>(null);
  const additionalInfoRef = useRef<HTMLInputElement>(null);
  const processBtnRef = useRef<HTMLButtonElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

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
    setProcessedData(null);
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Calls FastAPI endpoint on 8081
      const response = await fetch("http://localhost:5000/upload_cv?top_k=3", {
        method: "POST",
        body: formData,
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore non-JSON
      }

      if (!response.ok) {
        const message =
          data?.detail ||
          data?.message ||
          `Failed to process CV. (${response.status})`;
        setErrorPopup({ open: true, message });
        return;
      }

      const fileUrl = URL.createObjectURL(file);
      const payload = data?.data ?? data;

      navigate("/parsed-cv", {
        state: {
          processedData: payload,
          fileUrl,
          fileType: file.type,
        },
      });
    } catch (error) {
      setErrorPopup({
        open: true,
        message: "An error occurred while processing the CV.",
      });
    }
  };

  const handleCloseModal = () => setIsModalOpen(false);
  const handleBrowseClick = () => {
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.click();
  };
  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setShowTutorial(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
        fontFamily: "Helvetica, sans-serif",
      }}
    >
      <Sidebar
        userRole={user?.role || devUser.role}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
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
            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                color="inherit"
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
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
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3 }}>
          <Typography
            variant="h5"
            sx={{
              mb: 3,
              fontWeight: "bold",
              fontFamily: "Helvetica, sans-serif",
            }}
          >
            Upload Candidate CV
          </Typography>

          <Paper
            elevation={6}
            sx={{ p: 4, borderRadius: 3, backgroundColor: "#DEDDEE" }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#000000ff",
                mb: 2,
                fontFamily: "Helvetica, sans-serif",
              }}
            >
              Upload a candidate's CV to automatically extract skills and
              project matches
            </Typography>

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
                  sx={reviewButtonStyle}
                  onClick={handleBrowseClick}
                >
                  Browse Files
                </Button>
              </Box>
            </Box>

            <TextField
              label="Contact Information"
              fullWidth
              variant="outlined"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              sx={{
                fontFamily: "Helvetica, sans-serif",
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#000000ff" },
                  fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                  color: "#000000ff",
                },
              }}
              InputLabelProps={{
                sx: {
                  color: "#000000ff",
                  "&.Mui-focused": { borderColor: "#204E20", color: "#204E20" },
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                },
              }}
            />

            <TextField
              label="Additional Information"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "#000000ff" },
                  fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                  color: "#fff",
                },
              }}
              InputLabelProps={{
                sx: {
                  "&.Mui-focused": { color: "#204E20" },
                  fontFamily: "Helvetica, sans-serif",
                  fontWeight: "bold",
                  color: "#000000ff",
                },
              }}
              inputRef={additionalInfoRef}
              InputProps={{
                sx: {
                  color: "#000000ff",
                  borderRadius: 2,
                  input: { color: "#000000ff" },
                  textarea: { color: "#000000ff" },
                  borderColor: "#204E20",
                },
              }}
            />

            {file && (
              <TableContainer sx={{ mb: 3 }}>
                <Table
                  sx={{
                    "& td, & th": {
                      color: "#000000ff",
                      fontFamily: "Helvetica, sans-serif",
                      fontSize: "1rem",
                    },
                  }}
                >
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

            <Box sx={{ textAlign: "center", mb: 2 }}>
              {file && (
                <Button
                  variant="contained"
                  sx={reviewButtonStyle}
                  onClick={handleProcess}
                  ref={processBtnRef}
                >
                  Process CV
                </Button>
              )}
            </Box>

            <Typography
              variant="body2"
              color="#000000ff"
              sx={{ fontFamily: "Helvetica, sans-serif", fontSize: "1rem" }}
            >
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

      <Dialog
        open={errorPopup.open}
        onClose={() => setErrorPopup({ ...errorPopup, open: false })}
      >
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <Typography>{errorPopup.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorPopup({ ...errorPopup, open: false })}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

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
                  Profile
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.profile || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Education:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.education || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Skills:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.skills || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Experience:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.experience || "N/A"}
                </Typography>
              </Box>
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
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Projects:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.projects || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Achievements:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.achievements || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Contact:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.contact || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Languages:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.languages || "N/A"}
                </Typography>
                <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                  Other:
                </Typography>
                <Typography sx={{ mb: 3, whiteSpace: "pre-line" }}>
                  {processedData.other || "N/A"}
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

// Review button style
const reviewButtonStyle = {
  background: "#232A3B",
  color: "DEDDEE",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background:
      "linear-gradient(45deg, #081158 0%, #022028 50%, #003cbdff 100%)",
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
