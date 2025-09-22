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
  Stack
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
//const [editing, setEditing] = useState(false);
const [configObj, setConfigObj] = useState<any>({});
const [editing, setEditing] = useState<string | null>(null); // which category is being edited
const [tempCategoryName, setTempCategoryName] = useState<string | null>(null);
const [tempItems, setTempItems] = useState<string[]>([]);
const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
const [categoryKeys, setCategoryKeys] = useState<Record<string, string>>({});


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

    const res = await fetch(`${CONFIG_BASE}/auth/config/categories`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderedObj),
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
  
{/* CV Extraction Config Editor */}
<Box sx={{ mt: 5, bgcolor: "#DEDDEE", p: 3, borderRadius: 2 }}>
  <Typography variant="h6" sx={{ mb: 2, color: "#000", fontWeight: "bold" }}>
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
                const res = await fetch(`${CONFIG_BASE}/auth/config/categories`);
                if (!res.ok) throw new Error(`Failed (${res.status})`);
                const json = await res.json();

                setConfigObj(json);
                setCategoryOrder(Object.keys(json)); // reset order to match server
                setEditing(false);
              } catch (e) {
                alert("Could not reload configuration.");
                console.error(e);
              }
            }}
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>


          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              let newKey = "NewCategory";
              let counter = 1;
              const updated = { ...configObj };
              while (updated[newKey]) {
                newKey = `NewCategory${counter++}`;
              }
              updated[newKey] = [];
              setConfigObj(updated);

              // Prepend the new category in order
              setCategoryOrder((prev) => [newKey, ...prev]);
            }}
          >
            Add Category
          </Button>
        </>
      ) : (
        <Button
          variant="contained"
          onClick={() => setEditing(true)}
          sx={{ minWidth: 120 }}
        >
          Edit Config
        </Button>
      )}
    </Stack>
  </Box>

  {/* Categories */}
  {categoryOrder.map((category) => (
    <Box key={categoryKeys[category]} sx={{ mb: 4, border: "1px solid #ddd", borderRadius: 2, p: 2 }}>
      {/* Parent Heading */}
      {editing && <Typography sx={{ fontWeight: "bold", mb: 1 }}>Parent</Typography>}

      {/* Category Name */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        {editing ? (
          <input
            type="text"
            value={category}
            onChange={(e) => handleRenameCategory(category, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && (e.target as HTMLInputElement).value === "") {
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
{editing && <Typography sx={{ fontWeight: "bold", mb: 1 }}>Children Items</Typography>}

{/* Items */}
<Box sx={{ mt: 1 }}>
  {configObj[category] && configObj[category].length > 0 ? (
    configObj[category].map((item: string, idx: number) => (
      <Box key={idx} sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1 }}>
        <input
          type="text"
          value={item}
          disabled={!editing}
          onChange={(e) => {
            const updated = [...configObj[category]];
            updated[idx] = e.target.value;
            setConfigObj((prev) => ({ ...prev, [category]: updated }));
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
              const updated = configObj[category].filter((_, i) => i !== idx);
              setConfigObj((prev) => ({ ...prev, [category]: updated }));
            }}
          >
            Remove
          </Button>
        )}
      </Box>
    ))
  ) : (
    <Typography sx={{ fontStyle: "italic", color: "#666" }}>
      No tags in list
    </Typography>
  )}

  {/* Add Child Item */}
  {editing && (
    <Button
      variant="contained"
      size="small"
      onClick={() =>
        setConfigObj((prev) => ({ ...prev, [category]: [...(prev[category] || []), ""] }))
      }
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
