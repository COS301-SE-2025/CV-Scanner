import React, { useState, useEffect, useRef } from "react";
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
  Popover,
  Fade,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import Sidebar from "./Sidebar";
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
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import logo2 from "../assets/logo2.png";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import logo from "../assets/logo.png";
import logoNavbar from "../assets/logoNavbar.png";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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

const devUser = {
      email: "dev@example.com",
      password: "Password123",
      first_name: "John",
      last_name: "Doe",
      role: "Admin",
    };

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "",
  });

  const [tutorialStep, setTutorialStep] = useState(-1); // -1 means not showing
  const [fadeIn, setFadeIn] = useState(true);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Tutorial refs
  const searchRef = useRef<HTMLInputElement>(null);
  const filterBoxRef = useRef<HTMLDivElement>(null);
  const addUserRef = useRef<HTMLButtonElement>(null);
  const firstEditRef = useRef<HTMLButtonElement>(null);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      email: user.email || "",
      role: user.role || "",
    });
    setOpenEditDialog(true);
  };

  const handleEditClose = () => {
    setOpenEditDialog(false);
    setEditingUser(null);
  };

  const handleEditSave = () => {
    fetch("http://localhost:8081/auth/edit-user", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editFormData),
    })
      .then((res) => res.text())
      .then((msg) => {
        // Optionally show a toast/snackbar here
        setUsers((prev) =>
          prev.map((u) =>
            u.email === editFormData.email ? { ...u, ...editFormData } : u
          )
        );
        handleEditClose();
      })
      .catch(() => {
        // Optionally show an error toast/snackbar here
      });
  };
  const handleDeleteUser = (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.email}?`))
      return;
    fetch(
      `http://localhost:8081/auth/delete-user?email=${encodeURIComponent(
        user.email
      )}`,
      {
        method: "DELETE",
      }
    )
      .then((res) => res.text())
      .then((msg) => {
        // Optionally show a toast/snackbar here
        // Refresh the user list
        setUsers((prev) => prev.filter((u) => u.email !== user.email));
      })
      .catch(() => {
        // Optionally show an error toast/snackbar here
      });
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

  useEffect(() => {
    let url = "http://localhost:8081/auth/all-users";
    if (roleFilter !== "All Roles") {
      url = `http://localhost:8081/auth/filter-users?role=${encodeURIComponent(
        roleFilter
      )}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => setUsers([]));
  }, [roleFilter]);

  // Set anchorEl for tutorial popover
  useEffect(() => {
    if (tutorialStep === 0 && searchRef.current) setAnchorEl(searchRef.current);
    else if (tutorialStep === 1 && filterBoxRef.current)
      setAnchorEl(filterBoxRef.current);
    else if (tutorialStep === 2 && addUserRef.current)
      setAnchorEl(addUserRef.current);
    else if (tutorialStep === 3 && firstEditRef.current)
      setAnchorEl(firstEditRef.current);
    else setAnchorEl(null);
  }, [tutorialStep]);

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setTutorialStep(-1);

  const paginatedUsers = users.slice(
    (currentPage - 1) * usersPerPage,
    currentPage * usersPerPage
  );

  const totalPages = Math.ceil(users.length / usersPerPage);

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
          sx={{ bgcolor: "#232A3B ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            {/* Tutorial icon */}
            <Tooltip title="Run Tutorial" arrow>
              <IconButton
                onClick={() => {
                  setTutorialStep(0);
                  setFadeIn(true);
                }}
                sx={{ ml: 1, color: "#FFEB3B" }}
              >
                <LightbulbRoundedIcon />
              </IconButton>
            </Tooltip>

            {/* Help / FAQ icon */}
            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
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

        {/* User Management Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontFamily: 'Helvetica, sans-serif', fontWeight: "bold", mb: 3, color: "#fff " }}>
            User Management
          </Typography>

          {/* Search and Filter Section */}
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            
            <TextField
              inputRef={searchRef}
              placeholder="Search users..."
              variant="outlined"
              fullWidth
              sx={{ bgcolor: "#DEDDEE", borderRadius: 1 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            <div ref={filterBoxRef}>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                sx={{ bgcolor: "#DEDDEE", borderRadius: 1, minWidth: 150 }}
              >
                <MenuItem value="All Roles">All Roles</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Editor">Editor</MenuItem>
                <MenuItem value="User">User</MenuItem>
              </Select>
            </div>
            <Button
              variant="contained"
              sx={{ bgcolor: "#0D9488", color: "#fff", textTransform: "none" }}
              onClick={() => navigate("/add-user")}
              ref={addUserRef}
            >
              + Add New User
            </Button>
          </Box>

          {/* User Table */}
          <Paper
            elevation={6}
            sx={{ p: 3, borderRadius: 3, bgcolor: "#DEDDEE" }}
          >
            <TableContainer>
              <Table sx={{"& td, & th": { fontFamily: 'Helvetica, sans-serif'}}}>
                {/* 2. Update the table headers: */}
                <TableHead sx={{ "& th": {fontSize: 16 } }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Username</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      First Name
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Last Name</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>
                      Last Active
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                {/* 3. Update the table rows: */}
                <TableBody sx={{ "& td": { fontSize: 18, fontWeight: 400 } }}>
                  {paginatedUsers.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{user.username || ""}</TableCell>
                      <TableCell>{user.first_name || ""}</TableCell>
                      <TableCell>{user.last_name || ""}</TableCell>

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
                                : "#10B981",
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
                          ref={idx === 0 ? firstEditRef : null}
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
            <Button
              variant="text"
              sx={{ color: "#0073c1" }}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i}
                variant="text"
                sx={{
                  color: currentPage === i + 1 ? "#fff" : "#0073c1",
                  bgcolor: currentPage === i + 1 ? "#0073c1" : "transparent",
                }}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="text"
              sx={{ color: "#0073c1" }}
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            >
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
                label="Username"
                fullWidth
                value={editFormData.username}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, username: e.target.value })
                }
              />
              <TextField
                label="First Name"
                fullWidth
                value={editFormData.first_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    first_name: e.target.value,
                  })
                }
              />
              <TextField
                label="Last Name"
                fullWidth
                value={editFormData.last_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    last_name: e.target.value,
                  })
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
                displayEmpty
              >
                <MenuItem value="">Select Role</MenuItem>
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Editor">Editor</MenuItem>
                <MenuItem value="User">User</MenuItem>
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

        {/* Tutorial Popover */}
        <Popover
          open={tutorialStep >= 0 && tutorialStep <= 3 && Boolean(anchorEl)}
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
                    Search Users
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    Use this bar to search for users by <b>name</b>,{" "}
                    <b>email</b>, or <b>role</b>.
                  </Typography>
                </>
              )}
              {tutorialStep === 1 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    Filter by Role
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    Use these filters to view <b>Admins</b>, <b>Editors</b>,{" "}
                    <b>Users</b>, or <b>All</b>.
                  </Typography>
                </>
              )}
              {tutorialStep === 2 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    Add a User
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    Click <b>Add User</b> to invite a new user to your
                    organization.
                  </Typography>
                </>
              )}
              {tutorialStep === 3 && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                    Edit or Delete Users
                  </Typography>
                  <Typography sx={{ mb: 2 }}>
                    Use <b>Edit</b> to update user details or <b>Delete</b> to
                    remove a user.
                  </Typography>
                </>
              )}
              {/* Shared navigation buttons */}
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
