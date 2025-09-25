import { useEffect, useState, useRef } from "react";
import { Snackbar, Alert } from "@mui/material";
import { apiFetch } from "../lib/api";

export default function ConfigAlert() {
  const [open, setOpen] = useState(false);
  const prevConfig = useRef<any>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await apiFetch("/auth/config/categories");
        const config = res && res.ok ? await res.json() : null;

        if (prevConfig.current && JSON.stringify(config) !== JSON.stringify(prevConfig.current)) {
          setOpen(true);
        }
        prevConfig.current = config;
      } catch {
        // fail silently
      }
    };

    checkConfig(); // run once
    const interval = setInterval(checkConfig, 10000); // check every 10s
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
