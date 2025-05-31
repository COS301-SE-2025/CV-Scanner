import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Avatar,
  Divider,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Badge
} from "@mui/material";
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import logo2 from '../assets/logo2.png';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: "Admin",
    lastName: "User",
    email: "admin@entelect.co.za",
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Handle profile updates
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:8081/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Profile updated successfully");
      } else {
        setError(data.message || "Failed to update profile");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password changes
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8081/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    // Clear any user data from storage
    localStorage.removeItem("authToken");
    navigate("/login");
  };

  // Handle form changes
  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#181c2f", color: "#fff" }}>
      {/* Sidebar */}
      <Box sx={{ width: 220, bgcolor: "#5a88ad", display: "flex", flexDirection: "column", p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <img src={logo2} alt="Entelect Logo" style={{ width: 120 }} />
        </Box>
        <Button fullWidth sx={navButtonStyle} startIcon={<DashboardIcon />} onClick={() => navigate("/dashboard")}>
          Dashboard
        </Button>
        <Button fullWidth sx={navButtonStyle} startIcon={<UploadFileIcon />} onClick={() => navigate("/upload")}>
          Upload CV
        </Button>
        <Button fullWidth sx={navButtonStyle} startIcon={<PeopleIcon />} onClick={() => navigate("/candidates")}>
          Candidates
        </Button>
        <Button fullWidth sx={navButtonStyle} startIcon={<SearchIcon />} onClick={() => navigate("/search")}>
          Search
        </Button>
       {/* <Button fullWidth sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }} startIcon={<SettingsIcon />}>
          Settings
        </Button> */}
        <Box sx={{ flexGrow: 1 }} />
      </Box>

    </Box>
  );
}

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