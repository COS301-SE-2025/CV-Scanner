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

  const handleOpen = () => {
    setTempValue(value);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = () => {
    onSave(tempValue);
    setOpen(false);
  };

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
        <IconButton size="small" onClick={handleOpen}>
          <EditIcon fontSize="small" />
        </IconButton>
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