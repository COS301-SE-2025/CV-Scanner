import React from "react";
import { Box, Typography, CircularProgress, Fade } from "@mui/material";

/** Minimal, fixed-look brand loader */
export default function BrandLoading() {
  return (
    <Fade in mountOnEnter>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          // dark navy you use site-wide
          background:
            "radial-gradient(1200px 700px at 10% -10%, rgba(90,136,173,0.06), transparent), #181c2f",
          display: "grid",
          placeItems: "center",
          fontFamily: "Helvetica, sans-serif",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          {/* ONE icon only: round spinner */}
          <CircularProgress
            size={58}
            thickness={4}
            sx={{
              color: "#5a88ad",              // brand accent
              mb: 2.2,
              "& svg circle": { strokeLinecap: "round" },
            }}
          />
          <Typography
            variant="h6"
            sx={{ color: "#DEDDEE", fontWeight: 800, letterSpacing: 0.2 }}
          >
            Preparing your workspace…
          </Typography>
          <Typography variant="body2" sx={{ color: "#cbd5e0", opacity: 0.85, mt: 0.5 }}>
            Please wait while we set things up.
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}
