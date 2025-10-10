import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AppBar,
  Toolbar,
  IconButton,
  Button,
  Paper,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import logoNavbar from "../assets/logoNavbar.png";
import { apiFetch } from "../lib/api";

const devUser = {
  email: "dev@example.com",
  first_name: "John",
  last_name: "Doe",
  role: "Admin",
};

export default function HelpPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  // Load user data
  useEffect(() => {
    (async () => {
      try {
        const email = localStorage.getItem("userEmail") || devUser.email;
        try {
          const meRes = await apiFetch(
            `/auth/me?email=${encodeURIComponent(email)}`
          );
          if (meRes && meRes.ok) {
            const meJson = await meRes.json().catch(() => null);
            setUser(meJson);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } catch (e) {
        console.warn("Failed loading user:", e);
        setUser(null);
      }
    })();
  }, []);

  const manualHref = new URL("../assets/USER_MANUAL_FINAL.pdf", import.meta.url).href;

  // Logout handler: invalidate server session, clear client state and notify other tabs
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  const faqs = [
    {
      question: "How do I upload a CV?",
      answer:
        'Go to the Upload CV page, click on "Browse Files," select a PDF or Word document from your computer, and then click "Process CV." Ensure the file format is supported and meets size requirements.',
    },
    {
      question: "What file formats are supported?",
      answer:
        "You can upload CVs in PDF or Microsoft Word formats (.pdf, .doc, .docx).",
    },
    {
      question: "How do I manage users?",
      answer:
        "User management is restricted to administrators. Navigate to the User Management page to add, update, or remove users and assign roles.",
    },
    {
      question: "Can I edit candidate information after upload?",
      answer:
        'Yes. Navigate to the Candidates page, click the "Review" button next to a candidate, then naviagte to either "Skills" if you would like to add a new skill or "Recruiter Notes" if you want add additional informations. You can update skills by typing and clicking "ADD" or using the Recruiter Notes section to type then press "Save Notes".',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Main content area with header */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
         <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
             <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
             <Typography variant="h6" sx={{fontFamily: 'Helvetica, sans-serif', ml: 2, fontWeight: 'bold' }}>
                           CV Scanner Help
                          </Typography>
          </Box>
          

            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>

            <Box
              onClick={() => navigate("/settings")}
              sx={{
                display: "flex",
                alignItems: "center",
                ml: 2,
                cursor: "pointer",
              }}
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

        {/* FAQ Section */}
        <Box sx={{ p: 4, flexGrow: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/dashboard")}
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
            Back to Dashboard
          </Button>
          
          <Typography
            variant="h5"
            sx={{
              fontFamily: "Helvetica, sans-serif",
              fontWeight: "bold",
              mb: 3,
            }}
          >
            Frequently Asked Questions
          </Typography>

          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              sx={{ mb: 2, bgcolor: "#e1f4ff", color: "#000", borderRadius: 1 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontFamily: "Helvetica, sans-serif",
                    fontWeight: "bold",
                  }}
                >
                  {faq.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* PDF Button */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <Button
              variant="contained"
              href={manualHref}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                bgcolor: "#93AFF7",
                color: "#0D1B2A",
                fontWeight: "bold",
                px: 4,
                py: 1.5,
                "&:hover": {
                  bgcolor: "#7A9FE8",
                },
              }}
            >
              View Help Guide (PDF)
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{ textAlign: "center", py: 2, bgcolor: "#232A3B", color: "#fff" }}
        >
          <Typography variant="body2">
            &copy; {new Date().getFullYear()} Entelect CV Scanner Help Center
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}