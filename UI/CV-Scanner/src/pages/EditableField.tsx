import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface EditableFieldProps {
  label: string;
  value?: string;
  onSave: (value: string) => void;
}

const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value = "",
  onSave,
}) => {
  const [open, setOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const navigate = useNavigate();

  const handleOpen = () => {
    setTempValue(value);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = () => {
    onSave(tempValue);
    setOpen(false);
  };

  // Logout handler: invalidate server session, clear client state and notify other tabs
  async function handleLogout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => null);
    } catch {
      // ignore network errors
    }
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");
      // notify other tabs / ProtectedRoute to re-check auth
      localStorage.setItem("auth-change", Date.now().toString());
    } catch {}
    navigate("/login", { replace: true });
  }

  return (
    <>
      {/* Display field */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
            {value || "N/A"}
          </Typography>
        </Box>
        <Box>
          <IconButton size="small" onClick={handleOpen}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleLogout} sx={{ ml: 0.5 }}>
            <ExitToAppIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Dialog positioned center-left */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            width: "40vw",
            maxHeight: "80vh",
          },
        }}
        sx={{
          "& .MuiDialog-container": {
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          },
          "& .MuiPaper-root": {
            marginLeft: "calc((100% - 1350px) / 2)", // 900px is dialog width
          },
        }}
      >
        <DialogTitle>Edit {label}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditableField;
