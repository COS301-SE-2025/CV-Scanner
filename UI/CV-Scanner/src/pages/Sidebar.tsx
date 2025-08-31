import React, { useState } from "react";
import { Box, Button, IconButton } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, useLocation } from "react-router-dom";
import logoNavbar from "../assets/logoNavbar.png";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Typography from "@mui/material/Typography";

interface SidebarProps {
  userRole?: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const isActive = (path: string) => location.pathname.indexOf(path) === 0;

const getButtonStyle = (path: string) => ({
  ...navButtonStyle,
  ...(isActive(path) && {
    bgcolor: "#d8f0ff",
    color: "#000",
  }),
});

const Sidebar: React.FC<SidebarProps> = ({
  userRole,
  collapsed,
  setCollapsed,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

  const handleCollapse = () => {
    setIsCollapsing(true);
    setIsAnimating(true);
    setTimeout(() => {
      setIsCollapsing(false);
      setCollapsed(true);
      setTimeout(() => setIsAnimating(false), 300);
    }, 300);
  };

  const handleExpand = () => {
    setCollapsed(false);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

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
          position: "relative",
          transition: "width 0.3s cubic-bezier(0.7,0.2,0.2,1)",
          overflow: "hidden",
          ...(isAnimating && {
            animation: "sidebarOpen 0.3s cubic-bezier(0.7,0.2,0.2,1)",
          }),
          "@keyframes sidebarOpen": {
            from: { opacity: 0.5, transform: "scaleX(0.8) translateX(-40px)" },
            to: { opacity: 1, transform: "scaleX(1) translateX(0)" },
          },
        }}
      >
        <IconButton
          onClick={handleExpand}
          sx={{
            position: "fixed",
            bottom: 16,
            left: 0,
            bgcolor: "#487DA6",
            color: "#fff",
            borderRadius: "50%",
            width: 40,
            height: 40,
            zIndex: 1300,
            "&:hover": {
              bgcolor: "#375f87",
            },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: collapsed ? 40 : 220,
        bgcolor: "#232A3B",
        display: "flex",
        flexDirection: "column",
        p: collapsed ? 1 : 2,
        position: "relative",
        mt: -2.2,
        transition:
          "width 0.3s cubic-bezier(0.7,0.2,0.2,1), padding 0.3s cubic-bezier(0.7,0.2,0.2,1)",
        overflow: "hidden",
        ...(isCollapsing && {
          animation:
            "sidebarCloseCrush 0.3s cubic-bezier(0.7,0.2,0.2,1) forwards",
        }),
        ...(isAnimating &&
          !isCollapsing && {
            animation: "sidebarOpen 0.3s cubic-bezier(0.7,0.2,0.2,1)",
          }),
        "@keyframes sidebarCloseCrush": {
          from: { opacity: 1, transform: "scaleX(1) translateX(0)" },
          to: { opacity: 0.5, transform: "scaleX(0.8) translateX(-220px)" },
        },
        "@keyframes sidebarOpen": {
          from: { opacity: 0.5, transform: "scaleX(0.8) translateX(-40px)" },
          to: { opacity: 1, transform: "scaleX(1) translateX(0)" },
        },
      }}
    >
      <IconButton
        onClick={handleCollapse}
        sx={{
          position: "fixed",
          bottom: 16,
          left: collapsed ? 0 : 205,
          bgcolor: "#487DA6",
          color: "#fff",
          borderRadius: "50%",
          width: 40,
          height: 40,
          zIndex: 1300,
          transition: "transform 0.3s",
          "&:hover": {
            bgcolor: "#375f87",
          },
        }}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          pt: 2,
          pb: 3,
          gap: 1,
        }}
      >
        <Box
          component="img"
          src={logoNavbar}
          alt="Logo"
          sx={{
            width: 50,
            height: 50,
          }}
        />
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            color: "#fff",
            fontSize: "1.1rem",
            // Animate text disappearing from right to left
            overflow: "hidden",
            display: "inline-block",
            whiteSpace: "nowrap",
            transition: "width 0.3s, opacity 0.3s",
            width: isCollapsing ? 0 : "auto",
            opacity: isCollapsing ? 0 : 1,
          }}
        >
          Quantum Stack
        </Typography>
      </Box>

      {/* Animate each button's label to disappear right-to-left */}
      <Button
        fullWidth
        sx={getButtonStyle("/dashboard")}
        className={isActive("/dashboard") ? "active" : ""}
        startIcon={<DashboardIcon />}
        onClick={() => navigate("/dashboard")}
      >
        <span
          style={{
            display: "inline-block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "width 0.3s, opacity 0.3s",
            width: isCollapsing ? 0 : "auto",
            opacity: isCollapsing ? 0 : 1,
          }}
        >
          Dashboard
        </span>
      </Button>

      <Button
        fullWidth
        sx={getButtonStyle("/upload")}
        className={isActive("/upload") ? "active" : ""}
        startIcon={<UploadFileIcon />}
        onClick={() => navigate("/upload")}
      >
        <span
          style={{
            display: "inline-block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "width 0.3s, opacity 0.3s",
            width: isCollapsing ? 0 : "auto",
            opacity: isCollapsing ? 0 : 1,
          }}
        >
          Upload CV
        </span>
      </Button>

      <Button
        fullWidth
        sx={getButtonStyle("/search")}
        className={isActive("/search") ? "active" : ""}
        startIcon={<SearchIcon />}
        onClick={() => navigate("/search")}
      >
        <span
          style={{
            display: "inline-block",
            overflow: "hidden",
            whiteSpace: "nowrap",
            transition: "width 0.3s, opacity 0.3s",
            width: isCollapsing ? 0 : "auto",
            opacity: isCollapsing ? 0 : 1,
          }}
        >
          Search
        </span>
      </Button>

      {userRole === "Admin" && (
        <>
          <Button
            fullWidth
            sx={getButtonStyle("/user-management")}
            className={isActive("/user-management") ? "active" : ""}
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/user-management")}
          >
            <span
              style={{
                display: "inline-block",
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "width 0.3s, opacity 0.3s",
                width: isCollapsing ? 0 : "auto",
                opacity: isCollapsing ? 0 : 1,
              }}
            >
              User Management
            </span>
          </Button>
          <Button
            fullWidth
            sx={getButtonStyle("/system-settings")}
            className={isActive("/system-settings") ? "active" : ""}
            startIcon={<SettingsIcon />}
            onClick={() => navigate("/system-settings")}
          >
            <span
              style={{
                display: "inline-block",
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "width 0.3s, opacity 0.3s",
                width: isCollapsing ? 0 : "auto",
                opacity: isCollapsing ? 0 : 1,
              }}
            >
              System Settings
            </span>
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
