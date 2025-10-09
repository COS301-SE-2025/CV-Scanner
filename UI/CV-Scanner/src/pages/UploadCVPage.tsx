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
  Divider,
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
import { apiFetch } from "../lib/api";
import { useBrandLoader } from "../hooks/brandLoader";

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

interface ValidationErrors {
  candidateName?: string;
  candidateSurname?: string;
  candidateEmail?: string;
}

// safeAiFetch: calls local AI directly for localhost targets, otherwise routes through backend proxy
const safeAiFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  try {
    // First, try calling the target directly (works if AI allows CORS)
    try {
      console.debug("safeAiFetch: attempting direct call to", url);
      return await fetch(url, options);
    } catch (directErr) {
      // direct call failed (network/CORS) -> fallback to proxy below
      console.debug(
        "safeAiFetch: direct call failed, falling back to proxy",
        directErr
      );
    }

    // Fallback: proxy via backend so deployed backend can call external AI endpoints
    const proxyBody: any = {
      targetUrl: url,
      method: options.method || "POST",
      headers: {}, // optional: pass through headers if needed
      isFormData: false,
      fileName: null,
      contentType: null,
      body: null,
    };

    if (options.body instanceof FormData) {
      const file = options.body.get("file") as File | null;
      if (file) {
        proxyBody.isFormData = true;
        proxyBody.fileName = file.name;
        proxyBody.contentType = file.type || null;
        proxyBody.body = await fileToBase64(file); // base64 payload
      }
    } else if (options.body) {
      try {
        proxyBody.body =
          typeof options.body === "string"
            ? options.body
            : JSON.stringify(options.body);
      } catch {
        proxyBody.body = String(options.body);
      }
    }

    console.debug("safeAiFetch -> proxy payload:", {
      target: proxyBody.targetUrl,
      fileName: proxyBody.fileName,
    });

    const res = await apiFetch("/cv/proxy-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proxyBody),
    } as RequestInit);

    if (!res) throw new Error("No response from proxy endpoint");
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      console.error("proxy /cv/proxy-ai returned non-OK:", res.status, text);
      return new Response(text, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    return res;
  } catch (err: any) {
    console.error("safeAiFetch/proxy error:", err && err.message);
    const body = typeof err === "string" ? err : err?.message || "Proxy Error";
    return new Response(body, { status: 502, statusText: "Proxy Error" });
  }
};

// Helper to convert file to base64 for proxy
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Validation functions
const validateName = (name: string): string => {
  if (!name.trim()) {
    return "Name is required";
  }
  if (name.length < 2) {
    return "Name must be at least 2 characters long";
  }
  if (name.length > 50) {
    return "Name must be less than 50 characters";
  }
  if (!/^[a-zA-Z\s\-'\.]+$/.test(name)) {
    return "Name can only contain letters, spaces, hyphens, apostrophes, and periods";
  }
  return "";
};

const validateSurname = (surname: string): string => {
  if (!surname.trim()) {
    return "Surname is required";
  }
  if (surname.length < 2) {
    return "Surname must be at least 2 characters long";
  }
  if (surname.length > 50) {
    return "Surname must be less than 50 characters";
  }
  if (!/^[a-zA-Z\s\-'\.]+$/.test(surname)) {
    return "Surname can only contain letters, spaces, hyphens, apostrophes, and periods";
  }
  return "";
};

const validateEmail = (email: string): string => {
  if (!email.trim()) {
    return "Email is required";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  if (email.length > 100) {
    return "Email must be less than 100 characters";
  }
  return "";
};

export default function UploadCVPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateSurname, setCandidateSurname] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiUploadData, setAiUploadData] = useState<any | null>(null);
  const [aiParseData, setAiParseData] = useState<any | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );

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
  const [sidebarAnimating, setSidebarAnimating] = useState(false);

  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const loader = useBrandLoader();

  const navigate = useNavigate();

  // Validate individual field
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case "candidateName":
        return validateName(value);
      case "candidateSurname":
        return validateSurname(value);
      case "candidateEmail":
        return validateEmail(value);
      default:
        return "";
    }
  };

  // Validate all fields
  const validateAllFields = (): boolean => {
    const errors: ValidationErrors = {
      candidateName: validateName(candidateName),
      candidateSurname: validateSurname(candidateSurname),
      candidateEmail: validateEmail(candidateEmail),
    };

    setValidationErrors(errors);
    return (
      !errors.candidateName &&
      !errors.candidateSurname &&
      !errors.candidateEmail
    );
  };

  // Handle field change with validation
  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case "candidateName":
        setCandidateName(value);
        break;
      case "candidateSurname":
        setCandidateSurname(value);
        break;
      case "candidateEmail":
        setCandidateEmail(value);
        break;
    }

    // Clear validation error for this field when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // Validate field on blur
  const handleFieldBlur = (field: string, value: string) => {
    const error = validateField(field, value);
    setValidationErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  // Logout handler: invalidate server session, clear client state and notify other tabs
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore network errors
    }
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      // notify other tabs / ProtectedRoute to re-check auth
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  // Helper function for safe extraction
  const safeExtract = (obj: any, key: string): string => {
    if (!obj || typeof obj !== "object") return "";

    const value = obj[key];
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean")
      return String(value);

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  };

  // Safe data extraction
  const extractDataSafely = (data: any): ProcessedData => {
    // Ensure we have an object to work with
    const safeData = data && typeof data === "object" ? data : {};
    const result = safeData.result || safeData;

    return {
      profile: safeExtract(result, "profile"),
      education: safeExtract(result, "education"),
      skills: safeExtract(result, "skills"),
      experience: safeExtract(result, "experience"),
      projects: safeExtract(result, "projects"),
      achievements: safeExtract(result, "achievements"),
      contact: safeExtract(result, "contact"),
      languages: safeExtract(result, "languages"),
      other: safeExtract(result, "other"),
    };
  };

  // Safe API call function
  const makeApiCall = async (
    endpoint: string,
    formData: FormData
  ): Promise<ApiResponse> => {
    try {
      const response = await safeAiFetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response || !response.ok) {
        // attempt to read body text to provide more detail
        const txt = await response.text().catch(() => "");
        return {
          success: false,
          error: `HTTP ${response?.status || "No response"} - ${
            txt || response?.statusText || ""
          }`,
        };
      }

      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
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
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };

  // Upload helper (call proxy endpoint with FormData)
  async function handleUpload(file: File) {
    try {
      const form = new FormData();
      form.append("file", file); // backend expects key "file"

      // Use apiFetch which preserves FormData correctly
      const res = await apiFetch("/cv/proxy-ai", {
        method: "POST",
        body: form,
      } as RequestInit);

      if (!res || !res.ok) {
        const text = await res?.text().catch(() => "");
        throw new Error(`Upload failed: ${res?.status ?? "no-res"} ${text}`);
      }

      const json = await res.json();
      return { success: true, data: json } as ApiResponse;
    } catch (err: any) {
      console.error("Upload/parse error", err);
      return { success: false, error: err?.message || "Upload error" };
    }
  }

  // Load user on component mount
  useEffect(() => {
    const loadUser = async () => {
      const email = localStorage.getItem("userEmail") || "admin@email.com";
      try {
        const res = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
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

  // Main processing function
  const handleProcess = async () => {
    if (!file) {
      setErrorPopup({ open: true, message: "Please select a file first." });
      return;
    }

    // Validate all fields before processing
    if (!validateAllFields()) {
      setErrorPopup({
        open: true,
        message: "Please fix the validation errors before processing.",
      });
      return;
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!validTypes.includes(file.type)) {
      setErrorPopup({
        open: true,
        message: "Please upload a PDF or Word document.",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorPopup({
        open: true,
        message: "File size must be less than 5MB.",
      });
      return;
    }
    loader.show();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Use deployed AI service
      const AI_BASE =
        "https://cv-scanner-ai-cee2d5g9epb0hcg6.southafricanorth-01.azurewebsites.net";
      const uploadEndpoint = `${AI_BASE}/upload_cv?top_k=3`;
      const parseEndpoint = `${AI_BASE}/parse_resume`;

      console.log("Starting CV processing with safe AI fetch...");

      // Make API calls in parallel using safeAiFetch
      const [uploadResult, parseResult] = await Promise.all([
        makeApiCall(uploadEndpoint, formData),
        makeApiCall(parseEndpoint, formData),
      ]);

      // Save raw AI responses into state for later display
      setAiUploadData(uploadResult.success ? uploadResult.data : null);
      setAiParseData(parseResult.success ? parseResult.data : null);

      console.log("Safe API Results:", {
        uploadSuccess: uploadResult.success,
        parseSuccess: parseResult.success,
        uploadError: uploadResult.error,
        parseError: parseResult.error,
      });

      // Check if both calls failed
      if (!uploadResult.success && !parseResult.success) {
        throw new Error(
          `Upload: ${uploadResult.error}, Parse: ${parseResult.error}`
        );
      }

      // Process the data safely - prefer parse, fallback to upload
      let processedData = extractDataSafely(
        parseResult.success ? parseResult.data : uploadResult.data
      );
      // If parse didn't provide skills/education/etc, try to pull from uploadResult
      if (
        uploadResult.success &&
        (!processedData.skills || processedData.skills === "")
      ) {
        try {
          const up = uploadResult.data || {};
          // common shapes: applied => { Skills: [...] }  or raw => { Skills: { top_k: [...] } }
          const appliedSkills = up?.applied?.Skills;
          if (Array.isArray(appliedSkills) && appliedSkills.length) {
            processedData.skills = appliedSkills.join(", ");
          } else {
            const rawSkills = up?.raw?.Skills?.top_k;
            if (Array.isArray(rawSkills) && rawSkills.length) {
              processedData.skills = rawSkills
                .map((t: any) => t.label)
                .join(", ");
            }
          }
        } catch {
          /* ignore */
        }
      }

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
        message:
          error instanceof Error
            ? error.message
            : "Failed to process CV. Please try again.",
      });
    } finally {
      setLoading(false);
      loader.hide();
    }
  };

  // File handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!validTypes.includes(selectedFile.type)) {
        setErrorPopup({
          open: true,
          message: "Please select a PDF or Word document (.pdf, .doc, .docx)",
        });
        return;
      }

      setFile(selectedFile);

      // Create preview URL for PDFs
      if (selectedFile.type === "application/pdf") {
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
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
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
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleCloseModal = () => setIsModalOpen(false);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

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
        userRole={user?.role || "User"}
        collapsed={collapsed}
        setCollapsed={(val) => {
          setCollapsed(val);
          setSidebarAnimating(true);
          setTimeout(() => setSidebarAnimating(false), 300);
        }}
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

            <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
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

          <ConfigAlert />

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

            {/* Candidate Details */}
            <Box ref={candidateDetailsRef}>
              <TextField
                label="Candidate Name"
                fullWidth
                required
                variant="outlined"
                value={candidateName}
                onChange={(e) =>
                  handleFieldChange("candidateName", e.target.value)
                }
                onBlur={(e) => handleFieldBlur("candidateName", e.target.value)}
                error={!!validationErrors.candidateName}
                helperText={validationErrors.candidateName}
                sx={{
                  fontFamily: "Helvetica, sans-serif",
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: validationErrors.candidateName
                        ? "#d32f2f"
                        : "#000000ff",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                    color: "#000000ff",
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: validationErrors.candidateName
                      ? "#d32f2f"
                      : "#000000ff",
                    "&.Mui-focused": {
                      borderColor: validationErrors.candidateName
                        ? "#d32f2f"
                        : "#204E20",
                      color: validationErrors.candidateName
                        ? "#d32f2f"
                        : "#204E20",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontWeight: "bold",
                  },
                }}
              />

              <TextField
                label="Candidate Surname"
                fullWidth
                required
                variant="outlined"
                value={candidateSurname}
                onChange={(e) =>
                  handleFieldChange("candidateSurname", e.target.value)
                }
                onBlur={(e) =>
                  handleFieldBlur("candidateSurname", e.target.value)
                }
                error={!!validationErrors.candidateSurname}
                helperText={validationErrors.candidateSurname}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: validationErrors.candidateSurname
                        ? "#d32f2f"
                        : "#000000ff",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                    color: "#000000ff",
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: validationErrors.candidateSurname
                      ? "#d32f2f"
                      : "#000000ff",
                    "&.Mui-focused": {
                      color: validationErrors.candidateSurname
                        ? "#d32f2f"
                        : "#204E20",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontWeight: "bold",
                  },
                }}
              />

              <TextField
                label="Candidate Email"
                fullWidth
                required
                type="email"
                variant="outlined"
                value={candidateEmail}
                onChange={(e) =>
                  handleFieldChange("candidateEmail", e.target.value)
                }
                onBlur={(e) =>
                  handleFieldBlur("candidateEmail", e.target.value)
                }
                error={!!validationErrors.candidateEmail}
                helperText={validationErrors.candidateEmail}
                sx={{
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: validationErrors.candidateEmail
                        ? "#d32f2f"
                        : "#000000ff",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                    color: "#000000ff",
                  },
                }}
                InputLabelProps={{
                  sx: {
                    color: validationErrors.candidateEmail
                      ? "#d32f2f"
                      : "#000000ff",
                    "&.Mui-focused": {
                      color: validationErrors.candidateEmail
                        ? "#d32f2f"
                        : "#204E20",
                    },
                    fontFamily: "Helvetica, sans-serif",
                    fontWeight: "bold",
                  },
                }}
              />
            </Box>

            {/* File Preview */}
            {file && (
              <Box ref={cvTableRef}>
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
                        <TableCell sx={{ fontWeight: "bold" }}>
                          Action
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              cursor: "pointer",
                              color: "#003cbdff",
                              textDecoration: "underline",
                              "&:hover": { color: "#204E20" },
                            }}
                            onClick={() => setPdfPreviewOpen(true)}
                          >
                            <PictureAsPdfIcon sx={{ mr: 1 }} />
                            {file.name}
                          </Box>
                        </TableCell>
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

      {/* Error Dialog */}
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

      {/* Processed Data Modal */}
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
          {/* Show raw AI upload/parse JSON for debugging / visibility */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ px: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
              AI Upload Result (raw)
            </Typography>
            <Box
              sx={{
                bgcolor: "#ffffff",
                color: "#000",
                p: 1,
                borderRadius: 1,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                maxHeight: "20vh",
                overflow: "auto",
                fontSize: 12,
              }}
            >
              <pre style={{ margin: 0 }}>
                {aiUploadData
                  ? JSON.stringify(aiUploadData, null, 2)
                  : "No upload result"}
              </pre>
            </Box>

            <Typography
              variant="subtitle2"
              sx={{ fontWeight: "bold", mt: 2, mb: 1 }}
            >
              AI Parse Result (raw)
            </Typography>
            <Box
              sx={{
                bgcolor: "#ffffff",
                color: "#000",
                p: 1,
                borderRadius: 1,
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                maxHeight: "20vh",
                overflow: "auto",
                fontSize: 12,
              }}
            >
              <pre style={{ margin: 0 }}>
                {aiParseData
                  ? JSON.stringify(aiParseData, null, 2)
                  : "No parse result"}
              </pre>
            </Box>
          </Box>
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

      {/* PDF Preview Dialog */}
      <Dialog
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
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
        open={
          showTutorial &&
          tutorialStep >= 0 &&
          tutorialStep <= 3 &&
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
        componentsProps={{
          root: {
            onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
          },
        }}
        disableRestoreFocus={false}
        disableAutoFocus={true}
        disableEnforceFocus={true}
        PaperProps={{
          sx: {
            p: 2,
            bgcolor: "#fff",
            color: "#181c2f",
            borderRadius: 2,
            boxShadow: 6,
            minWidth: 280,
            zIndex: 1502,
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
                  Step 2: Candidate Details
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Enter the candidate's name, surname, and email address in
                  these fields.
                </Typography>
              </>
            )}
            {tutorialStep === 2 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 3: CV Table
                </Typography>
                <Typography sx={{ mb: 2 }}>
                  Here you can see the uploaded CV file. You can remove it if
                  needed before processing.
                </Typography>
              </>
            )}
            {tutorialStep === 3 && (
              <>
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                  Step 4: Process the CV
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
                {tutorialStep < 3 ? (
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
  color: "#DEDDEE",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background: "#2d3748",
    transform: "translateY(-1px)",
  },
  "&:disabled": {
    background: "#6b7280",
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

async function safeApiFetch(file: File) {
  const results = {
    parseSuccess: false,
    uploadSuccess: false,
    parseError: null as string | null,
    uploadError: null as string | null,
    parseData: null as any,
    uploadData: null as any,
  };

  // Use FormData for both endpoints
  const formData = new FormData();
  formData.append("file", file);

  // Parse endpoint
  try {
    formData.append("targetUrl", "/parse_resume");
    const parseRes = await fetch("/cv/proxy-ai", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (parseRes.ok) {
      results.parseData = await parseRes.json();
      results.parseSuccess = true;
    } else {
      const errText = await parseRes.text();
      results.parseError = `HTTP ${parseRes.status} - ${errText}`;
    }
  } catch (err: any) {
    results.parseError = err?.message || String(err);
  }

  // Upload/classification endpoint
  try {
    const uploadFormData = new FormData();
    uploadFormData.append("file", file);
    uploadFormData.append("targetUrl", "/upload_cv");
    uploadFormData.append("top_k", "3");

    const uploadRes = await fetch("/cv/proxy-ai", {
      method: "POST",
      credentials: "include",
      body: uploadFormData,
    });

    if (uploadRes.ok) {
      results.uploadData = await uploadRes.json();
      results.uploadSuccess = true;
    } else {
      const errText = await uploadRes.text();
      results.uploadError = `HTTP ${uploadRes.status} - ${errText}`;
    }
  } catch (err: any) {
    results.uploadError = err?.message || String(err);
  }

  return results;
}
