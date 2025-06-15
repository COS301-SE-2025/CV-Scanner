import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
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
  
const location = useLocation();

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

 /* const handleLogout = async () => {
  try {
    // Optional: Tell backend to clear session / cookies
    await fetch("http://localhost:8081/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.warn("Logout request failed, continuing with client-side logout.");
  }

  // Clear client-side storage
  localStorage.removeItem("authToken");
  // Optionally: clear more app state here (e.g., Redux, Context)

  // Redirect
  navigate("/login");
};*/


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
          <img src={logo2} alt="Team Logo" style={{ width: 120 }} />
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

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
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

        {/* Settings Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
            User Settings
          </Typography>

          <Paper elevation={6} sx={{ p: 4, borderRadius: 3, bgcolor: "#e1f4ff", maxWidth: 800 }}>
            {/* Error/Success Alerts */}
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

            {/* Profile Section */}
            <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#0073c1", mb: 2 }}>
                Profile Information
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: '#0073c1', fontSize: '2rem', mr: 3 }}>
                  {profileForm.firstName[0]}{profileForm.lastName[0]}
                </Avatar>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <TextField
                  name="firstName"
                  label="First Name"
                  value={profileForm.firstName}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
                <TextField
                  name="lastName"
                  label="Last Name"
                  value={profileForm.lastName}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
                <TextField
                  name="email"
                  label="Email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
              </Box>

              <Button 
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ 
                  mt: 2,
                  background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)',
                  }
                }}
              >
                {loading ? "Updating..." : "Update Profile"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Password Section */}
            <Box component="form" onSubmit={handlePasswordChange} sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: "#0073c1", mb: 2 }}>
                Change Password
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                <TextField
                  name="currentPassword"
                  label="Current Password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
                <Box></Box>
                <TextField
                  name="newPassword"
                  label="New Password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
                <TextField
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChangeInput}
                  fullWidth
                  variant="outlined"
                  sx={{ mb: 2 }}
                  InputProps={{ sx: { bgcolor: '#fff', borderRadius: 1 } }}
                />
              </Box>

              <Button 
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={<LockResetIcon />}
                sx={{ 
                  mt: 2,
                  background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
                  color: '#fff',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)',
                  }
                }}
              >
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Danger Zone */}
            <Box>
              
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  sx={{ 
                    bgcolor: '#f44336',
                    color: '#fff',
                    '&:hover': { bgcolor: '#d32f2f' }
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
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
  '&.active': {
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '4px',
    backgroundColor: '#0073c1',
    borderRadius: '0 4px 4px 0'
  }
}
};