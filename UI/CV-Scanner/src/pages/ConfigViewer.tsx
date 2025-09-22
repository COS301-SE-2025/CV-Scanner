import { Box, Typography, Chip, Paper, Button } from "@mui/material";
import { useEffect, useState } from "react";

export default function ConfigViewer() {
  const [config, setConfig] = useState<Record<string, string[]>>({});

  const fetchConfig = () => {
    const CONFIG_BASE = "http://localhost:8081"; // your base URL
    fetch(`${CONFIG_BASE}/auth/config/categories`)
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => setConfig({}));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <Paper
      elevation={6}
      sx={{
        p: 3,
        borderRadius: 3,
        backgroundColor: "#DEDDEE",
        color: "#000",
        fontFamily: "Helvetica, sans-serif",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold" }}>
          System Search Config
        </Typography>
        <Button
          variant="contained"
          size="small"
          onClick={fetchConfig}
          sx={{ textTransform: "none", bgcolor: "#5a88ad", "&:hover": { bgcolor: "#487DA6" } }}
        >
          Refresh
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 4,
          flexWrap: "wrap", // wrap if too many categories
        }}
      >
        {Object.entries(config).map(([category, values]) => (
          <Box
            key={category}
            sx={{
              display: "flex",
              flexDirection: "column", // stack chips vertically
              minWidth: 180, // adjust width of each column
              maxWidth: 220,
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 1, fontSize: "1rem" }}
            >
              {category}
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {values.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  disabled
                  sx={{
                    backgroundColor: "#7A7A7A", // dark grey
                    color: "#fff", // white text
                  }}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
