import React, { useState } from "react";
import {
  Box,
  Button,
  IconButton,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, useLocation } from "react-router-dom";
import logoNavbar from "../assets/logoNavbar.png";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

interface SidebarProps {
  userRole?: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (collapsed) {
    return (
      <Box
        sx={{
          width: 40,
          bgcolor: "#232A3B",
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
          <ChevronRightIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 220,
        bgcolor: "#232A3B",
        display: "flex",
        flexDirection: "column",
        p: 2,
        position: "relative",
      }}
    >
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
        <img src={logoNavbar} alt="Team Logo" style={{ width: 120 }} />
      </Box>

    <Button
  fullWidth
  sx={navButtonStyle}
  className={location.pathname.indexOf("/dashboard") ? "active" : ""}
  startIcon={<DashboardIcon />}
  onClick={() => navigate("/dashboard")}
>
  Dashboard
</Button>

<Button
  fullWidth
  sx={navButtonStyle}
  className={location.pathname.indexOf("/upload") ? "active" : ""}
  startIcon={<UploadFileIcon />}
  onClick={() => navigate("/upload")}
>
  Upload CV
</Button>

<Button
  fullWidth
  sx={navButtonStyle}
  className={location.pathname.indexOf("/candidates") ? "active" : ""}
  startIcon={<PeopleIcon />}
  onClick={() => navigate("/candidates")}
>
  Candidates
</Button>

<Button
  fullWidth
  sx={navButtonStyle}
  className={location.pathname.indexOf("/search") ? "active" : ""}
  startIcon={<SearchIcon />}
  onClick={() => navigate("/search")}
>
  Search
</Button>

{userRole === "Admin" && (
  <>
    <Button
      fullWidth
      sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
      className={location.pathname.indexOf("/user-management") ? "active" : ""}
      startIcon={<SettingsIcon />}
      onClick={() => navigate("/user-management")}
    >
      User Management
    </Button>
    <Button
      fullWidth
      sx={navButtonStyle}
      className={location.pathname.indexOf("/system-settings") ? "active" : ""}
      startIcon={<SettingsIcon />}
      onClick={() => navigate("/system-settings")}
    >
      System Settings
    </Button>
  </>
)}

    </Box>
  );
};

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

export default Sidebar;