import React, { useState } from "react";
import { 
  Box, 
  Button, 
  IconButton,
  Tooltip 
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import { useNavigate, useLocation } from "react-router-dom";
import logoNavbar from "../assets/logoNavbar.png";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import Typography from "@mui/material/Typography";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import StorageIcon from "@mui/icons-material/Storage"; 
import { apiFetch } from "../lib/api";

interface SidebarProps {
  userRole?: string;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

// Fixed: Use the location parameter
const isActive = (path: string, currentLocation: any) => currentLocation.pathname.indexOf(path) === 0;

const getButtonStyle = (path: string, currentLocation: any) => ({
  ...navButtonStyle,
  ...(isActive(path, currentLocation) && {
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
  const location = useLocation(); // This is the React Router location
  const [isAnimating, setIsAnimating] = useState(false);
  const [isCollapsing, setIsCollapsing] = useState(false);

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
      // notify other tabs / ProtectedRoute to re-check auth
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

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
          width: 60,
          maxWidth: 220,
          bgcolor: "#232A3B",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
        {/* Logo */}
        <Box
          component="img"
          src={logoNavbar}
          alt="Logo"
          sx={{
            width: 40,
            height: 40,
            mb: 2,
          }}
        />

        {/* Navigation Icons with Tooltips and Active States */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%", alignItems: "center" }}>
          <Tooltip title="Dashboard" placement="right" arrow>
            <IconButton
              onClick={() => navigate("/dashboard")}
              sx={{
                color: isActive("/dashboard", location) ? "#d8f0ff" : "#fff",
                bgcolor: isActive("/dashboard", location) ? "#487DA6" : "transparent",
                "&:hover": { bgcolor: "#487DA6" },
              }}
            >
              <DashboardIcon />
            </IconButton>
          </Tooltip>

          {(userRole === "Editor" || userRole === "Admin") && (
            <Tooltip title="Upload CV" placement="right" arrow>
              <IconButton
                onClick={() => navigate("/upload")}
                sx={{
                  color: isActive("/upload", location) ? "#d8f0ff" : "#fff",
                  bgcolor: isActive("/upload", location) ? "#487DA6" : "transparent",
                  "&:hover": { bgcolor: "#487DA6" },
                }}
              >
                <UploadFileIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Search" placement="right" arrow>
            <IconButton
              onClick={() => navigate("/search")}
              sx={{
                color: isActive("/search", location) ? "#d8f0ff" : "#fff",
                bgcolor: isActive("/search", location) ? "#487DA6" : "transparent",
                "&:hover": { bgcolor: "#487DA6" },
              }}
            >
              <SearchIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Compare" placement="right" arrow>
            <IconButton
              onClick={() => navigate("/compare")}
              sx={{
                color: isActive("/compare", location) ? "#d8f0ff" : "#fff",
                bgcolor: isActive("/compare", location) ? "#487DA6" : "transparent",
                "&:hover": { bgcolor: "#487DA6" },
              }}
            >
              <CompareArrowsIcon />
            </IconButton>
          </Tooltip>

          {userRole === "Admin" && (
            <Tooltip title="Manage Data" placement="right" arrow>
              <IconButton
                onClick={() => navigate("/manage-data")}
                sx={{
                  color: isActive("/manage-data", location) ? "#d8f0ff" : "#fff",
                  bgcolor: isActive("/manage-data", location) ? "#487DA6" : "transparent",
                  "&:hover": { bgcolor: "#487DA6" },
                }}
              >
                <StorageIcon />
              </IconButton>
            </Tooltip>
          )}

          {userRole === "Admin" && (
            <>
              <Tooltip title="User Management" placement="right" arrow>
                <IconButton
                  onClick={() => navigate("/user-management")}
                  sx={{
                    color: isActive("/user-management", location) ? "#d8f0ff" : "#fff",
                    bgcolor: isActive("/user-management", location) ? "#487DA6" : "transparent",
                    "&:hover": { bgcolor: "#487DA6" },
                  }}
                >
                  <PeopleIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="System Settings" placement="right" arrow>
                <IconButton
                  onClick={() => navigate("/system-settings")}
                  sx={{
                    color: isActive("/system-settings", location) ? "#d8f0ff" : "#fff",
                    bgcolor: isActive("/system-settings", location) ? "#487DA6" : "transparent",
                    "&:hover": { bgcolor: "#487DA6" },
                  }}
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Logout at bottom */}
        <Box sx={{ mt: "auto", mb: 2 }}>
          <Tooltip title="Logout" placement="right" arrow>
            <IconButton
              onClick={handleLogout}
              sx={{
                color: "#fff",
                "&:hover": { bgcolor: "#487DA6" },
              }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Expand Button - Fixed positioning */}
        <Box sx={{ 
          position: "fixed", 
          bottom: 16, 
          left: 14,
          zIndex: 1300 
        }}>
          <IconButton
            onClick={handleExpand}
            sx={{
              bgcolor: "#487DA6",
              color: "#fff",
              borderRadius: "50%",
              width: 32,
              height: 32,
              "&:hover": {
                bgcolor: "#375f87",
              },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: collapsed ? 60 : 220,
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
      {/* Collapse Button - Fixed positioning */}
      <Box sx={{ 
        position: "fixed", 
        bottom: 16, 
        left: 205,
        zIndex: 1300 
      }}>
        <IconButton
          onClick={handleCollapse}
          sx={{
            bgcolor: "#487DA6",
            color: "#fff",
            borderRadius: "50%",
            width: 40,
            height: 40,
            transition: "transform 0.3s",
            "&:hover": {
              bgcolor: "#375f87",
            },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
      </Box>

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

      {/* Fixed: Pass location to getButtonStyle */}
      <Button
        fullWidth
        sx={getButtonStyle("/dashboard", location)}
        className={isActive("/dashboard", location) ? "active" : ""}
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
      {(userRole === "Editor" || userRole === "Admin") && (
        <Button
          fullWidth
          sx={getButtonStyle("/upload", location)}
          className={isActive("/upload", location) ? "active" : ""}
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
      )}
      <Button
        fullWidth
        sx={getButtonStyle("/search", location)}
        className={isActive("/search", location) ? "active" : ""}
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
      <Button
        fullWidth
        sx={getButtonStyle("/compare", location)}
        className={isActive("/compare", location) ? "active" : ""}
        startIcon={<CompareArrowsIcon />}
        onClick={() => navigate("/compare")}
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
          Compare
        </span>
      </Button>
      {userRole === "Admin" && (
        <Button
          fullWidth
          sx={getButtonStyle("/manage-data", location)}
          className={isActive("/manage-data", location) ? "active" : ""}
          startIcon={<StorageIcon />}
          onClick={() => navigate("/manage-data")}
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
            Manage Data
          </span>
        </Button>
      )}
      {userRole === "Admin" && (
        <>
          <Button
            fullWidth
            sx={getButtonStyle("/user-management", location)}
            className={isActive("/user-management", location) ? "active" : ""}
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
            sx={getButtonStyle("/system-settings", location)}
            className={isActive("/system-settings", location) ? "active" : ""}
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

      {/* Logout button placed at the bottom of the expanded sidebar */}
      {!collapsed && (
        <Box sx={{ mt: "auto", pt: 1 }}>
          <Button
            fullWidth
            sx={{
              justifyContent: "flex-start",
              mb: 1,
              color: "#fff",
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "#487DA6" },
              textTransform: "none",
              fontWeight: "bold",
            }}
            startIcon={<ExitToAppIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
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