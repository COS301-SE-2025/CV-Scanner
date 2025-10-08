import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Slide,
  IconButton,
  LinearProgress,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { apiFetch } from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function ConfigAlert() {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(100);
  const navigate = useNavigate();

  // Logout handler: invalidate server session, clear client state, notify other tabs and redirect
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

  // Duration settings
  const displayDuration = 5000; // 5 seconds
  const intervalTime = 240000; // 2 minutes

  useEffect(() => {
    const showAlert = () => {
      setOpen(true);
      setProgress(100);

      // Countdown progress bar
      let start = Date.now();
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        const percent = Math.max(100 - (elapsed / displayDuration) * 100, 0);
        setProgress(percent);

        if (percent <= 0) {
          clearInterval(timer);
          setOpen(false);
        }
      }, 100);

      return () => clearInterval(timer);
    };

    // show immediately on page load
    showAlert();

    // repeat every 2 minutes
    const interval = setInterval(showAlert, intervalTime);
    return () => clearInterval(interval);
  }, []);

  return (
    <Slide direction="down" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          top: 70, // adjust to match your header height
          right: 20,
          minWidth: 350,
          maxWidth: 500,
          p: 3,
          borderRadius: 3,
          bgcolor: "rgba(46, 59, 78, 0.8)", // 50% transparent background
          color: "#fff",
          zIndex: 1500,
        }}
      >
        {/* Header with title + close button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            Config Update
          </Typography>
          <Box>
            <IconButton
              size="small"
              onClick={handleLogout}
              sx={{ color: "#fff", mr: 1 }}
            >
              <ExitToAppIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setOpen(false)}
              sx={{ color: "#fff" }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Message */}
        <Typography sx={{ mt: 1, mb: 2 }}>
          Config file has been changed, see on search page on what's new.
        </Typography>

        {/* Go to Search Button */}
        <Button
          variant="contained"
          size="small"
          sx={{ bgcolor: "#4CAF50", "&:hover": { bgcolor: "#45A049" } }}
          onClick={() => {
            navigate("/search");
            setOpen(false);
          }}
        >
          Go to Search
        </Button>

        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 2,
            height: 6,
            borderRadius: 5,
            bgcolor: "rgba(30,30,30,0.8)", // semi-transparent track
            "& .MuiLinearProgress-bar": { bgcolor: "#4CAF50" },
          }}
        />
      </Paper>
    </Slide>
  );
}
