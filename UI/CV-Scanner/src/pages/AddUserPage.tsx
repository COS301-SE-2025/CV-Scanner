import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  FormControl,
  InputLabel,
  FormHelperText,
  Tooltip,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import logo from "../assets/logoNavbar.png";
import Sidebar from "./Sidebar";

export default function AddUserPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const [formData, setFormData] = React.useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = React.useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { ...errors };

    // First Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
      isValid = false;
    } else {
      newErrors.first_name = "";
    }

    // Last Name validation
    if (!formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
      isValid = false;
    } else {
      newErrors.last_name = "";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      newErrors.email = "Invalid email address";
      isValid = false;
    } else {
      newErrors.email = "";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role is required";
      isValid = false;
    } else {
      newErrors.role = "";
    }

    // Password validation
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    } else {
      newErrors.password = "";
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    } else {
      newErrors.confirmPassword = "";
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else {
      newErrors.username = "";
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else {
      newErrors.username = "";
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      fetch("http://localhost:8081/auth/add-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        }),
      })
        .then((res) => res.text())
        .then((msg) => {
          navigate("/user-management");
        })
        .catch(() => {
          // Optionally show an error toast/snackbar here
        });
    }
  };

  const devUser = {
      email: "dev@example.com",
      password: "Password123",
      first_name: "John",
      last_name: "Doe",
      role: "Admin",
    };

  const [user, setUser] = React.useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  React.useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      <Sidebar 
  userRole={user?.role || devUser.role} 
  collapsed={collapsed} 
  setCollapsed={setCollapsed} 
/>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Top App Bar */}

           <AppBar
                                     position="static"
                                     sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
                                   >
                                     <Toolbar sx={{ justifyContent: "flex-end" }}>
          
                             {/* Help / FAQ icon */}
                             <Tooltip title="Go to Help Page" arrow>
                               <IconButton
                                 onClick={() => navigate("/help")}
                                 sx={{ ml: 1, color: '#90ee90' }}
                               >
                                 <HelpOutlineIcon />
                               </IconButton>
                             </Tooltip>
                           
                             {/* User Info */}
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
                           
                             {/* Logout */}
                             <IconButton
                               color="inherit"
                               onClick={() => navigate("/login")}
                               sx={{ ml: 1 }}
                             >
                               <ExitToAppIcon />
                             </IconButton>
                           </Toolbar>
                                     
                                   </AppBar>

        {/* Add User Content */}
        <Box
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            height: "100%", // Take full height of container
          }}
        >
          {/* Keep header at top */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
            
            <Typography variant="h5" sx={{fontFamily: 'Helvetica, sans-serif', mb: 3, fontWeight: "bold" }}>
              Add New User
            </Typography>
            
          </Box>
          
          {/* Center form vertically and horizontally */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flex: 1, // Take remaining space
            }}
          >
            <Paper
              elevation={6}
              sx={{
                p: 3,
                borderRadius: 3,
                 backgroundColor: "#DEDDEE",
                width: "100%",
                maxWidth: 600,
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <FormControl error={!!errors.username}>
                  <TextField
                    label="Username"
                    fullWidth
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    error={!!errors.username}
                    helperText={errors.username}
                  />
                </FormControl>

                <FormControl error={!!errors.first_name}>
                  <TextField
                    label="First Name"
                    fullWidth
                    value={formData.first_name}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                    error={!!errors.first_name}
                    helperText={errors.first_name}
                  />
                </FormControl>

                <FormControl error={!!errors.last_name}>
                  <TextField
                    label="Last Name"
                    fullWidth
                    value={formData.last_name}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                    error={!!errors.last_name}
                    helperText={errors.last_name}
                  />
                </FormControl>

                <FormControl error={!!errors.email}>
                  <TextField
                    label="Email Address"
                    fullWidth
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    error={!!errors.email}
                    helperText={errors.email}
                  />
                </FormControl>

                <FormControl error={!!errors.role}>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={formData.role}
                    label="Role"
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                  >
                    <MenuItem value="Admin">Admin</MenuItem>
                    <MenuItem value="Editor">Editor</MenuItem>
                    <MenuItem value="User">User</MenuItem>
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role}</FormHelperText>
                  )}
                </FormControl>

                <FormControl error={!!errors.password}>
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    error={!!errors.password}
                    helperText={errors.password}
                  />
                </FormControl>

                <FormControl error={!!errors.confirmPassword}>
                  <TextField
                    label="Confirm Password"
                    type="password"
                    fullWidth
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                  />
                </FormControl>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <Button
                     variant="contained"
                sx={{ backgroundColor: "#d0d0d0", color: "#000" }}
                    onClick={() => navigate("/user-management")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSubmit}
                    sx={{ background: "#232A3B",
  color: "DEDDEE",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background: "linear-gradient(45deg, #081158 0%, #022028 50%, #003cbdff 100%)",
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
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)",
  }, }}
                  >
                    Create User
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
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
};
