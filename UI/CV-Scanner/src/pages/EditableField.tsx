// src/pages/EditableField.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Popover,
  TextField,
  Button,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tempValue, setTempValue] = useState(value);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTempValue(value);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSave = () => {
    onSave(tempValue);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <Box sx={{ mb: 2 }}>
      {/* Label + edit icon */}
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: "bold", flex: 1 }}
        >
          {label}
        </Typography>
        <IconButton size="small" onClick={handleOpen}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Render plain text (no markdown) */}
      <Box sx={{ pl: 1, whiteSpace: "pre-line" }}>
        {value || (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </Box>

      {/* Popover editor */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2, maxWidth: 400 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Edit {label}
          </Typography>
          <TextField
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            multiline
            fullWidth
            minRows={4}
            size="small"
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button onClick={handleClose} sx={{ mr: 1 }}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave}>
              Save
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default EditableField;
