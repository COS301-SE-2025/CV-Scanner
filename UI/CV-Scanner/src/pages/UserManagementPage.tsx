import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import DeleteIcon from "@mui/icons-material/Delete";
import logo2 from "../assets/logo2.png";

export default function UserManagementPage() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const userRole = "Admin";
  const navigate = useNavigate();
  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string;
    email?: string;
  } | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");


  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
  });

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
    });
    setOpenEditDialog(true);
  };

  const handleEditClose = () => {
    setOpenEditDialog(false);
    setEditingUser(null);
  };

  const handleEditSave = () => {
    console.log("Saving user:", editFormData);
    handleEditClose();
  };

  const handleDeleteUser = (user) => {
    console.log("Deleting user:", user);
  };

  useEffect(() => {
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user && user.role && user.role.toLowerCase() !== "admin") {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    fetch("http://localhost:8081/auth/all-users")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      let url = "http://localhost:8081/auth/all-users";
      if (search.trim() !== "") {
        url = `http://localhost:8081/auth/search-users?query=${encodeURIComponent(
          search
        )}`;
      }
      fetch(url)
        .then((res) => res.json())
        .then((data) => setUsers(data))
        .catch(() => setUsers([]));
    };
    fetchUsers();
  }, [search]);

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
            sx={navButtonStyle}
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

          <Button
            fullWidth
            sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
            className={location.pathname === "/user-management" ? "active" : ""}
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/user-management")}
          >
            User Management
          </Button>
        </Box>
      ) : (
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
              onClick={() => {
                navigate("/login");
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
              placeholder="Search users..."
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "#fff", borderRadius: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                      <TableCell>
                        {user.first_name || ""} {user.last_name || ""}{" "}
                        {user.username ? `(${user.username})` : ""}
                      </TableCell>
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
                      <TableCell>{user.lastActive || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={{
                            bgcolor: "#0073c1",
                            color: "#fff",
                            textTransform: "none",
                            mr: 1,
                          }}
                          onClick={() => handleEditClick(user)}
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
                          onClick={() => handleDeleteUser(user)}
                          startIcon={<DeleteIcon />}
                        >
                          Delete
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

        {/* Edit User Dialog */}
        <Dialog
          open={openEditDialog}
          onClose={handleEditClose}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: "#5a88ad", color: "#fff" }}>
            Edit User
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
            >
              <TextField
                label="Name"
                fullWidth
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
              />
              <TextField
                label="Email"
                fullWidth
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, email: e.target.value })
                }
              />
              <Select
                value={editFormData.role}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, role: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Editor">Editor</MenuItem>
                <MenuItem value="Uploader">Uploader</MenuItem>
              </Select>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleEditClose} sx={{ color: "#666" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEditSave}
              sx={{ bgcolor: "#4caf50", color: "#fff" }}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
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
  position: "relative",
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
