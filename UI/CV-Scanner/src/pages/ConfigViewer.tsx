import { Box, Typography, Chip, Button } from "@mui/material";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function ConfigViewer() {
  const [config, setConfig] = useState<Record<string, string[]>>({});

  const fetchConfig = async () => {
    try {
      const res = await apiFetch("/auth/config/categories");
      if (!res.ok) {
        setConfig({});
        return;
      }
      const data = await res.json().catch(() => ({}));
      setConfig(data);
    } catch {
      setConfig({});
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <Box
      sx={{
        p: 0.5, // container padding
        fontFamily: "Helvetica, sans-serif",
        color: "#000",
        maxWidth: "clamp(300px, 100%, 1200px)",
        mx: "auto", // center horizontally
      }}
    >
      {/* Header with Title + Refresh Button */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: "bold", fontSize: "1rem" }}>
          System Search Config
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={fetchConfig}
          sx={{
            textTransform: "none",
            bgcolor: "#5a88ad",
            fontSize: "0.75rem",
            "&:hover": { bgcolor: "#487DA6" },
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Config Columns */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1.5,
        }}
      >
        {Object.entries(config).map(([category, values]) => (
          <Box key={category}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: "bold", mb: 0.5, fontSize: "0.85rem" }}
            >
              {category}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.3,
              }}
            >
              {values.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  disabled
                  size="small"
                  sx={{
                    backgroundColor: "#7A7A7A",
                    color: "#fff",
                    fontSize: "0.7rem",
                  }}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
