import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import Sidebar from "./Sidebar";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import logo from "../assets/logo.png"; // Update path as needed
import logo3 from "../assets/logoNavbar.png"; // Update path as needed

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [configContent, setConfigContent] = useState("");
const [editing, setEditing] = useState(false);
const [configObj, setConfigObj] = useState<any>({});


const CONFIG_BASE = "http://localhost:8081";

  // For dev fallback user
  const devUser = {
    email: "dev@example.com",
    password: "Password123",
    first_name: "John",
    last_name: "Doe",
    role: "Admin",
  };

  useEffect(() => {
    // Try to get user from API, fallback to devUser if fails
    const email = localStorage.getItem("userEmail") || devUser.email;
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(devUser));
  }, []);

  useEffect(() => {
    // Only allow admin users (loaded user or devUser)
    const isAdmin =
      (user && user.role && user.role.toLowerCase() === "admin") ||
      devUser.role === "Admin";
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

const loadConfig = async () => {
  try {
    const res = await fetch(`${CONFIG_BASE}/auth/config/categories`);
    if (!res.ok) throw new Error(`Failed (${res.status})`);
    const json = await res.json();
    setConfigObj(json);
    setEditing(false);
  } catch (e) {
    alert("Could not load configuration.");
    console.error(e);
  }
};


useEffect(() => {
  loadConfig();
}, []);

const handleSaveConfig = async () => {
  let parsed: any;
  try {
    parsed = JSON.parse(configContent);
  } catch {
    alert("Invalid JSON. Please fix before saving.");
    return;
  }

  try {
    const res = await fetch(`${CONFIG_BASE}/auth/config/categories`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configObj),
    });

    if (!res.ok) {
      let msg = `Failed to save configuration (${res.status})`;
      try {
        const j = await res.json();
        msg = j?.detail || msg;
      } catch {}
      alert(msg);
      return;
    }

    alert("Config saved successfully!");
    setEditing(false);
  } catch (err) {
    console.error("Save error:", err);
    alert("Could not save configuration: " + err.message);
  }
};


  // Local state for blacklist and whitelist
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [blackInput, setBlackInput] = useState("");
  const [whiteInput, setWhiteInput] = useState("");
  const [blackSearch, setBlackSearch] = useState("");
  const [whiteSearch, setWhiteSearch] = useState("");

  // Placeholder: fetch lists from API when implemented
  useEffect(() => {
    // Example: fetch("/api/blacklist").then(...)
    // For now, use localStorage for demo
    const bl = JSON.parse(localStorage.getItem("blacklist") || "[]");
    const wl = JSON.parse(localStorage.getItem("whitelist") || "[]");
    setBlacklist(bl);
    setWhitelist(wl);
  }, []);

  // Add to blacklist
  const handleAddBlacklist = () => {
    if (blackInput.trim() && !blacklist.includes(blackInput.trim())) {
      const updated = [...blacklist, blackInput.trim()];
      setBlacklist(updated);
      localStorage.setItem("blacklist", JSON.stringify(updated)); // Replace with API call
      setBlackInput("");
    }
  };

  // Add to whitelist
  const handleAddWhitelist = () => {
    if (whiteInput.trim() && !whitelist.includes(whiteInput.trim())) {
      const updated = [...whitelist, whiteInput.trim()];
      setWhitelist(updated);
      localStorage.setItem("whitelist", JSON.stringify(updated)); // Replace with API call
      setWhiteInput("");
    }
  };

  // Remove from blacklist
  const handleRemoveBlacklist = (item: string) => {
    const updated = blacklist.filter((i) => i !== item);
    setBlacklist(updated);
    localStorage.setItem("blacklist", JSON.stringify(updated)); // Replace with API call
  };

  // Remove from whitelist
  const handleRemoveWhitelist = (item: string) => {
    const updated = whitelist.filter((i) => i !== item);
    setWhitelist(updated);
    localStorage.setItem("whitelist", JSON.stringify(updated)); // Replace with API call
  };
// --- helpers for rename / remove (place above return)
const handleRenameCategory = (oldKey: string, newKeyRaw: string) => {
  const newKey = (newKeyRaw || "").trim();
  if (newKey === oldKey) return; // nothing to do
  if (!newKey) {
    alert("Category name cannot be empty.");
    return;
  }

  setConfigObj((prev: any) => {
    if (prev[newKey]) {
      alert("A category with that name already exists.");
      return prev;
    }
    const updated: any = { ...prev };
    updated[newKey] = updated[oldKey];
    delete updated[oldKey];
    return updated;
  });
};

const handleRemoveCategory = (key: string) => {
  if (!window.confirm(`Remove category "${key}" and all its items?`)) return;
  setConfigObj((prev: any) => {
    const updated: any = { ...prev };
    delete updated[key];
    return updated;
  });
};

// --- small inner component for editing a category header
function CategoryHeaderEditor({
  originalKey,
  editing,
  onRename,
  onRemove,
}: {
  originalKey: string;
  editing: boolean;
  onRename: (oldKey: string, newKey: string) => void;
  onRemove: (key: string) => void;
}) {
  const [localName, setLocalName] = useState(originalKey);

  // Sync when parent key changes (rename committed from elsewhere)
  useEffect(() => {
    setLocalName(originalKey);
  }, [originalKey]);

  const commit = () => {
    if (localName.trim() === originalKey) {
      // no change
      return;
    }
    onRename(originalKey, localName);
  };

  if (!editing)
    return (
      <Typography variant="h6" sx={{ color: "#000", mb: 1 }}>
        {originalKey}
      </Typography>
    );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
      <input
        // keep input key tied to originalKey so it's stable while editing
        key={`hdr-${originalKey}`}
        type="text"
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // commit on Enter
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            // cancel editing the name and restore
            setLocalName(originalKey);
            (e.target as HTMLInputElement).blur();
          }
        }}
        style={{
          flex: 1,
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
          fontFamily: "Helvetica, sans-serif",
          fontSize: "1rem",
        }}
      />
      <Button
        variant="outlined"
        color="error"
        onClick={() => onRemove(originalKey)}
      >
        Remove
      </Button>
    </Box>
  );
}

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
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
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

        {/* System Settings Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 3 ,fontFamily: "Helvetica, sans-serif", color: "#fff"}}>
            System Settings
          </Typography>

          {/* Search bars OUTSIDE the blacklist/whitelist boxes */}
          <Box sx={{ display: "flex", gap: 4, mb: 2 }}>
            <Box sx={{ flex: 1, fontFamily: "Helvetica, sans-serif" }}>
              <input
                type="text"
                value={blackSearch}
                onChange={(e) => setBlackSearch(e.target.value)}
                placeholder="Search blacklist"
                style={{
                  width: "98%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#d1dbe5ff",
                  color: "#fff",
                  marginBottom: "8px",
                  fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <input
                type="text"
                value={whiteSearch}
                onChange={(e) => setWhiteSearch(e.target.value)}
                placeholder="Search whitelist"
                style={{
                  width: "98%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #444",
                  background: "#d1dbe5ff",
                  color: "#fff",
                  marginBottom: "8px",
                  fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                }}
              />
            </Box>
          </Box>

          {/* Blacklist and Whitelist Section */}
          <Box sx={{ display: "flex", gap: 4, mt: 2 }}>
            {/* Blacklist */}
            <Box sx={{ flex: 1, bgcolor: "#DEDDEE", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#000000ff" , fontFamily: "Helvetica, sans-serif", fontWeight: "bold"}}>
                Blacklist
              </Typography>
              <Box sx={{ mb: 2, fontFamily: "Helvetica, sans-serif" }}>
                {blacklist.filter((item) =>
                  item.toLowerCase().includes(blackSearch.toLowerCase())
                ).length === 0 ? (
                  <Typography sx={{ color: "#aaa", fontFamily: "Helvetica, sans-serif" }}>
                    No blacklisted items.
                  </Typography>
                ) : (
                  blacklist
                    .filter((item) =>
                      item.toLowerCase().includes(blackSearch.toLowerCase())
                    )
                    .map((item) => (
                      <Box
                        key={item}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 1,
                          bgcolor: "#a8bbe2ff",
                          color: "#000000ff",
                          p: 1,
                          borderRadius: 1,
                          fontFamily: "Helvetica, sans-serif",
                          fontSize: "1rem",
                        }}
                      >
                        <Typography sx={{ flex: 1, fontFamily: "Helvetica, sans-serif", fontSize: "1rem" }}>{item}</Typography>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleRemoveBlacklist(item)}
                          sx={{ ml: 2 }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <input
                  type="text"
                  value={blackInput}
                  onChange={(e) => setBlackInput(e.target.value)}
                  placeholder="Add to blacklist"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    background: "#d1dbe5ff",
                    color: "#fff",
                    fontFamily: "Helvetica, sans-serif",
                  fontSize: "1rem",
                  }}
                />
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleAddBlacklist}
                  sx={{ minWidth: 0, px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>
            {/* Whitelist */}
            <Box sx={{ flex: 1, bgcolor: "#DEDDEE", p: 2, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, color: "#000000ff", fontFamily: "Helvetica, sans-serif", fontWeight: "bold" }}>
                Whitelist
              </Typography>
              <Box sx={{ mb: 2, fontFamily: "Helvetica, sans-serif" }}>
                {whitelist.filter((item) =>
                  item.toLowerCase().includes(whiteSearch.toLowerCase())
                ).length === 0 ? (
                  <Typography sx={{ color: "#aaa", fontFamily: "Helvetica, sans-serif" }}>
                    No whitelisted items.
                  </Typography>
                ) : (
                  whitelist
                    .filter((item) =>
                      item.toLowerCase().includes(whiteSearch.toLowerCase())
                    )
                    .map((item) => (
                      <Box
                        key={item}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          mb: 1,
                          bgcolor: "#a8bbe2ff",
                          color: "#000000ff",
                          p: 1,
                          borderRadius: 1,
                          fontFamily: "Helvetica, sans-serif",
                          fontSize: "1rem",
                        }}
                      >
                        <Typography sx={{ flex: 1, fontFamily: "Helvetica, sans-serif", fontSize: "1rem" }}>{item}</Typography>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleRemoveWhitelist(item)}
                          sx={{ ml: 2 }}
                        >
                          Remove
                        </Button>
                      </Box>
                    ))
                )}
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <input
                  type="text"
                  value={whiteInput}
                  onChange={(e) => setWhiteInput(e.target.value)}
                  placeholder="Add to whitelist"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #444",
                    background: "#d1dbe5ff",
                    color: "#fff",
                    fontFamily: "Helvetica, sans-serif",
                    fontSize: "1rem",
                  }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAddWhitelist}
                  sx={{ minWidth: 0, px: 2 }}
                >
                  Add
                </Button>
              </Box>
            </Box>

          </Box>
                      {/* CV Extraction Config Editor */}
<Box sx={{ mt: 5, bgcolor: "#DEDDEE", p: 3, borderRadius: 2 }}>
  <Typography variant="h6" sx={{ mb: 2, color: "#000", fontWeight: "bold" }}>
    CV Extraction Config Editor
  </Typography>

{Object.entries(configObj).map(([category, items]) => (
  <Box key={category} sx={{ mb: 4 }}>
    {/* Category header (editable when editing=true) */}
    <CategoryHeaderEditor
      originalKey={category}
      editing={editing}
      onRename={handleRenameCategory}
      onRemove={handleRemoveCategory}
    />

    {/* Items */}
    {(items as string[]).map((item, idx) => (
      <Box
        key={idx}
        sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}
      >
        <input
          type="text"
          value={item}
          disabled={!editing}
          onChange={(e) => {
            // immutable update of the array
            setConfigObj((prev: any) => {
              const updated = { ...prev };
              const arr = Array.isArray(updated[category])
                ? [...updated[category]]
                : [];
              arr[idx] = e.target.value;
              updated[category] = arr;
              return updated;
            });
          }}
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontFamily: "Helvetica, sans-serif",
            fontSize: "1rem",
          }}
        />
        {editing && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setConfigObj((prev: any) => {
                const updated = { ...prev };
                updated[category] = (updated[category] || []).filter(
                  (_: any, i: number) => i !== idx
                );
                return updated;
              });
            }}
          >
            Remove
          </Button>
        )}
      </Box>
    ))}

    {/* Add item button */}
    {editing && (
      <Button
        variant="contained"
        size="small"
        onClick={() => {
          setConfigObj((prev: any) => {
            const updated = { ...prev };
            updated[category] = [...(updated[category] || []), ""];
            return updated;
          });
        }}
      >
        Add {category} Item
      </Button>
    )}
  </Box>
))}

{/* Add New Category */}
{editing && (
  <Box sx={{ mt: 2 }}>
    <Button
      variant="contained"
      color="secondary"
      onClick={() => {
        setConfigObj((prev: any) => {
          const updated = { ...prev };
          let newKey = "NewCategory";
          let counter = 1;
          while (updated[newKey]) {
            newKey = `NewCategory${counter++}`;
          }
          updated[newKey] = [];
          return updated;
        });
      }}
    >
      Add Category
    </Button>
  </Box>
)}

{/* Save/Cancel */}
<Box sx={{ mt: 2, display: "flex", gap: 2 }}>
  {editing ? (
    <>
      <Button
        variant="contained"
        color="success"
        onClick={async () => {
          await handleSaveConfig();
          loadConfig();
        }}
      >
        Save
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        onClick={() => {
          loadConfig();
          setEditing(false);
        }}
      >
        Cancel
      </Button>
    </>
  ) : (
    <Button variant="contained" onClick={() => setEditing(true)}>
      Edit Config
    </Button>
  )}
</Box>

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
