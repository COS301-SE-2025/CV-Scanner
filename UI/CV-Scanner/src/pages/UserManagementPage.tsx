import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useLocation } from 'react-router-dom';
import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import logo2 from "../assets/logo2.png";

export default function UserManagementPage() {
  const navigate = useNavigate();
  const userRole = "Admin"; // Replace with dynamic role logic

  const location = useLocation();

  const users = [
    {
      name: "Admin User",
      email: "admin@entelect.co.za",
      role: "Admin",
      lastActive: "Today 09:15",
    },
    {
      name: "Editor User",
      email: "editor@entelect.co.za",
      role: "Editor",
      lastActive: "Yesterday, 14:30",
    },
    {
      name: "Uploader User",
      email: "uploader@entelect.co.za",
      role: "Uploader",
      lastActive: "2 days ago",
    },
  ];

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
          <img src={logo2} alt="Team Logo" style={{ width: 120 }} />
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
        {userRole === "Admin" && (
          <Button
            fullWidth
             sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/user-management")}
          >
            User Management
          </Button>
        )}
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
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
    display: 'flex',
    alignItems: 'center',
    ml: 2,
    cursor: 'pointer',
    '&:hover': { opacity: 0.8 },
  }}
  onClick={() => navigate('/settings')}
>
  <AccountCircleIcon sx={{ mr: 1 }} />
  <Typography variant="subtitle1">Admin User</Typography>
</Box>

            <IconButton
              color="inherit"
              onClick={() => {
                navigate("/login"); // Redirect to login page
              }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* User Management Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: "bold", mb: 3 }}>
            User Management
          </Typography>

          {/* Search and Filter Section */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              placeholder="Search by name, skills, or project type..."
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "#fff", borderRadius: 1 }}
            />
            <Select
              defaultValue="All Roles"
              sx={{ bgcolor: "#fff", borderRadius: 1, minWidth: 150 }}
            >
              <MenuItem value="All Roles">All Roles</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Editor">Editor</MenuItem>
              <MenuItem value="Uploader">Uploader</MenuItem>
            </Select>
            <Button
              variant="contained"
              sx={{ bgcolor: "#4caf50", color: "#fff", textTransform: "none" }}
              onClick={() => navigate("/add-user")}
            >
              + Add New User
            </Button>
          </Box>

          {/* User Table */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#e1f4ff" }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Last Active
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor:
                              user.role === "Admin"
                                ? "#f44336"
                                : user.role === "Editor"
                                ? "#ff9800"
                                : "#4caf50",
                            color: "#fff",
                            textTransform: "none",
                            fontWeight: "bold",
                            pointerEvents: "none",
                          }}
                        >
                          {user.role}
                        </Button>
                      </TableCell>
                      <TableCell>{user.lastActive}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: "#0073c1",
                            color: "#fff",
                            textTransform: "none",
                            mr: 1,
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: "#f44336",
                            color: "#fff",
                            textTransform: "none",
                          }}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Pagination */}
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Button variant="text" sx={{ color: "#0073c1" }}>
              Previous
            </Button>
            <Button variant="text" sx={{ color: "#0073c1" }}>
              1
            </Button>
            <Button variant="text" sx={{ color: "#0073c1" }}>
              2
            </Button>
            <Button variant="text" sx={{ color: "#0073c1" }}>
              3
            </Button>
            <Button variant="text" sx={{ color: "#0073c1" }}>
              Next
            </Button>
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
