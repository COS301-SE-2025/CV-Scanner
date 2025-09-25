import { useEffect, useState } from "react";
import { Snackbar, Alert } from "@mui/material";

export default function ConfigAlert() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // show immediately when page loads
    setOpen(true);

    // show again every 2 minutes (120000 ms)
    const interval = setInterval(() => {
      setOpen(true);
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
      <Alert
        onClose={() => setOpen(false)}
        severity="info"
        sx={{ bgcolor: "#2E3B4E", color: "#fff", fontWeight: "bold" }}
      >
        Config file has been changed, see on search page on what's new
      </Alert>
    </Snackbar>
  );
}
