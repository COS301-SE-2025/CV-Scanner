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
  TextField,
  Stack,
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
import { apiFetch } from "../lib/api";

export default function SystemSettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [configContent, setConfigContent] = useState("");
  //const [editing, setEditing] = useState(false);
  const [configObj, setConfigObj] = useState<any>({});
  const [editing, setEditing] = useState<boolean>(false); // which category is being edited
  const [tempCategoryName, setTempCategoryName] = useState<string | null>(null);
  const [tempItems, setTempItems] = useState<string[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [categoryKeys, setCategoryKeys] = useState<Record<string, string>>({});

  // Permission guard: check current user and show forbidden panel if not allowed
  const [forbidden, setForbidden] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // show forbidden warning when user isn't allowed
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
    (async () => {
      try {
        const res = await apiFetch(
          `/auth/me?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) {
          setUser(devUser);
          return;
        }
        const data = await res.json().catch(() => null);
        setUser(data ?? devUser);
      } catch {
        setUser(devUser);
      } finally {
        // Ensure we always mark the auth check complete so the UI unblocks
        setAuthChecked(true);
      }
    })();
  }, []);

  useEffect(() => {
    // Determine permission and show forbidden warning instead of immediately navigating away.
    const isAdmin =
      (user && user.role && String(user.role).toLowerCase() === "admin") ||
      devUser.role === "Admin";
    setForbidden(!isAdmin);
  }, [user]);

  const loadConfig = async () => {
    try {
      const res = await apiFetch("/auth/config/categories");
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const json = await res.json();

      let reordered: Record<string, any> = {};

      if (categoryOrder.length > 0) {
        // Respect existing order (for edits)
        categoryOrder.forEach((key) => {
          if (json[key] !== undefined) reordered[key] = json[key];
        });
        // Add any new keys not in categoryOrder
        Object.keys(json).forEach((key) => {
          if (!reordered[key]) reordered[key] = json[key];
        });
      } else {
        // First load, just use JSON as is
        reordered = { ...json };
        // Initialize categoryOrder
        setCategoryOrder(Object.keys(json));
      }

      setConfigObj(reordered);
      setEditing(false);
    } catch (e) {
      alert("Could not load configuration.");
      console.error(e);
    }
  };

  const startEditing = () => {
    (async () => {
      try {
        const res = await apiFetch("/auth/config/categories");
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const json = await res.json();

        // Build new configObj
        const newConfig: Record<string, any> = {};
        const newCategoryKeys: Record<string, string> = { ...categoryKeys };

        // Put new categories first
        Object.keys(json).forEach((key) => {
          newConfig[key] = json[key];
          // Keep existing React key or generate a new one
          if (!newCategoryKeys[key]) {
            newCategoryKeys[key] = `cat-${Date.now()}-${Math.random()}`;
          }
        });

        // Update categoryOrder: new/external categories first, existing ones after
        const newCategoryOrder = Object.keys(newConfig);

        setConfigObj(newConfig);
        setCategoryKeys(newCategoryKeys);
        setCategoryOrder(newCategoryOrder);
        setEditing(true);
      } catch (err) {
        console.error(err);
        alert("Could not load configuration.");
      }
    })();
  };

  useEffect(() => {
    loadConfig();
  }, []);
  // This runs whenever configObj changes
  useEffect(() => {
    const keys: Record<string, string> = {};
    categoryOrder.forEach((cat) => {
      keys[cat] = categoryKeys[cat] || `cat-${Date.now()}-${Math.random()}`;
    });
    setCategoryKeys(keys);
  }, [configObj, categoryOrder]);

  const handleSaveConfig = async () => {
    try {
      // Reorder configObj to match categoryOrder
      const orderedObj: Record<string, any> = {};
      categoryOrder.forEach((key) => {
        if (configObj[key] !== undefined) orderedObj[key] = configObj[key];
      });

      const res = await apiFetch("/auth/config/categories", {
        method: "PUT",
        body: JSON.stringify(orderedObj),
      });

      if (!res.ok) {
        let msg = `Failed to save configuration (${res.status})`;
        try {
          const j = await res.json().catch(() => null);
          msg = j?.detail || msg;
        } catch {}
        alert(msg);
        return;
      }

      alert("Config saved successfully!");
      setEditing(false);

      // Keep local state in sync
      setConfigObj(orderedObj);
    } catch (err) {
      console.error("Save error:", err);
      alert("Could not save configuration: " + err.message);
    }
  };
  const handleAddCategory = () => {
    let newKey = "NewCategory";
    let counter = 1;
    const updated = { ...configObj };
    while (updated[newKey]) {
      newKey = `NewCategory${counter++}`;
    }
    updated[newKey] = [];
    setConfigObj(updated);

    // Prepend to categoryOrder
    setCategoryOrder((prev) => [newKey, ...prev]);

    // Generate a unique React key for this category
    setCategoryKeys((prev) => ({
      ...prev,
      [newKey]: `cat-${Date.now()}-${Math.random()}`,
    }));
  };

  // --- helpers for rename / remove (place above return)
  const handleRenameCategory = (oldKey: string, newKeyRaw: string) => {
    const newKey = (newKeyRaw || "").trim();
    if (newKey === oldKey) return;
    if (!newKey) return alert("Category name cannot be empty.");
    if (configObj[newKey]) return alert("Category name already exists.");

    // Update config object
    setConfigObj((prev) => {
      const updated: any = { ...prev };
      updated[newKey] = updated[oldKey];
      delete updated[oldKey];
      return updated;
    });

    // Keep the same position in order
    setCategoryOrder((prev) => prev.map((k) => (k === oldKey ? newKey : k)));

    // Keep React keys consistent
    setCategoryKeys((prev) => {
      const updated: any = { ...prev };
      updated[newKey] = prev[oldKey];
      delete updated[oldKey];
      return updated;
    });
  };

  const handleRemoveCategory = (key: string) => {
    if (!window.confirm(`Remove category "${key}" and all its items?`)) return;

    setConfigObj((prev) => {
      const updated: any = { ...prev };
      delete updated[key];
      return updated;
    });

    setCategoryOrder((prev) => prev.filter((k) => k !== key));
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

  if (!authChecked) {
    return <div style={{ padding: 24 }}>Checking permissions…</div>;
  }

  if (forbidden) {
    return (
      <div style={{ padding: 24 }}>
        <div
          role="alert"
          style={{
            maxWidth: 900,
            margin: "0 auto",
            background: "#fff6f6",
            border: "1px solid #f5c2c2",
            color: "#7a1f1f",
            borderRadius: 6,
            padding: 16,
          }}
        >
          <strong>Forbidden</strong>
          <div style={{ marginTop: 8 }}>
            You do not have permission to view System Settings. If you believe
            this is an error, contact your administrator or sign in with an
            administrator account.
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </button>
            <button
              onClick={async () => {
                const email = localStorage.getItem("userEmail");
                try {
                  const url = email
                    ? `/auth/me?email=${encodeURIComponent(email)}`
                    : `/auth/me`;
                  const res = await apiFetch(url);
                  if (res && res.ok) {
                    const data = await res.json().catch(() => null);
                    const isAdmin =
                      data &&
                      (String(data.role).toLowerCase() === "admin" ||
                        (Array.isArray(data.roles) &&
                          data.roles.includes("admin")));
                    setForbidden(!isAdmin);
                    setAuthChecked(true);
                  }
                } catch {
                  // keep forbidden true
                }
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
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
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              mb: 3,
              fontFamily: "Helvetica, sans-serif",
              color: "#fff",
            }}
          >
            System Settings
          </Typography>

          {/* CV Extraction Config Editor */}
          <Box sx={{ mt: 5, bgcolor: "#DEDDEE", p: 3, borderRadius: 2 }}>
            <Typography
              variant="h6"
              sx={{ mb: 2, color: "#000", fontWeight: "bold" }}
            >
              CV Extraction Config Editor
            </Typography>

            {/* Edit / Save / Cancel buttons */}
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                {editing ? (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={async () => {
                        await handleSaveConfig();
                        loadConfig();
                      }}
                      sx={{ minWidth: 100 }}
                    >
                      Save
                    </Button>

                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={async () => {
                        try {
                          const res = await apiFetch("/auth/config/categories");
                          if (!res.ok)
                            throw new Error(`Failed (${res.status})`);
                          const json = await res.json();

                          setConfigObj(json);
                          setCategoryOrder(Object.keys(json)); // reset order to match server
                          setEditing(false);
                        } catch (e) {
                          alert("Could not reload configuration.");
                          console.error(e);
                        }
                      }}
                      sx={{
                        minWidth: 100,
                        color: "#727272ff",
                        borderColor: "#727272ff",
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={handleAddCategory}
                    >
                      Add Category
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="contained"
                    onClick={startEditing}
                    sx={{ minWidth: 120 }}
                  >
                    Edit Config
                  </Button>
                )}
              </Stack>
            </Box>

            {/* Categories */}
            {categoryOrder.map((category) => (
              <Box
                key={categoryKeys[category]}
                sx={{ border: "1px solid #ddd", borderRadius: 2, p: 2 }}
              >
                {/* Parent Heading */}
                {editing && (
                  <Typography sx={{ fontWeight: "bold", mb: 1, color: "#000" }}>
                    Category
                  </Typography>
                )}

                {/* Category Name */}
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  {editing ? (
                    <input
                      type="text"
                      value={category}
                      onChange={(e) =>
                        handleRenameCategory(category, e.target.value)
                      }
                      onKeyDown={(e) => {
                        if (
                          e.key === "Backspace" &&
                          (e.target as HTMLInputElement).value === ""
                        ) {
                          e.stopPropagation();
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
                  ) : (
                    <Typography
                      sx={{
                        flex: 1,
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                        color: "#000",
                      }}
                    >
                      {category}
                    </Typography>
                  )}

                  {editing && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveCategory(category)}
                    >
                      Remove
                    </Button>
                  )}
                </Box>

                {/* Children Heading */}
                {editing && (
                  <Typography sx={{ fontWeight: "bold", mb: 1, color: "#000" }}>
                    Category Tags
                  </Typography>
                )}

                {/* Items */}
                <Box
                  sx={{
                    mt: 1,
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 1,
                  }}
                >
                  {configObj[category].length === 0 && (
                    <Typography sx={{ fontStyle: "italic", color: "#555" }}>
                      No tags in this list
                    </Typography>
                  )}

                  {configObj[category].map((item: string, idx: number) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0, // ensures input shrinks if needed
                      }}
                    >
                      <input
                        type="text"
                        value={item}
                        disabled={!editing}
                        onChange={(e) => {
                          const updated = [...configObj[category]];
                          updated[idx] = e.target.value;
                          setConfigObj((prev) => ({
                            ...prev,
                            [category]: updated,
                          }));
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "6px",
                          borderRadius: "4px",
                          border: "1px solid #ccc",
                          fontFamily: "Helvetica, sans-serif",
                          fontSize: "0.9rem",
                        }}
                      />
                      {editing && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => {
                            const updated = configObj[category].filter(
                              (_, i) => i !== idx
                            );
                            setConfigObj((prev) => ({
                              ...prev,
                              [category]: updated,
                            }));
                          }}
                          sx={{ flexShrink: 0 }}
                        >
                          Remove
                        </Button>
                      )}
                    </Box>
                  ))}

                  {editing && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() =>
                        setConfigObj((prev) => ({
                          ...prev,
                          [category]: [...prev[category], ""],
                        }))
                      }
                      sx={{ mt: 1 }}
                    >
                      Add Item
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
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
