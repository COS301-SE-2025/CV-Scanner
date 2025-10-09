import React, { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * Redirects to the unified CandidateReviewSummary page.
 * All candidate data is now on one scrollable page.
 */
export default function CandidateSkillsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const candidateId =
      id || searchParams.get("id") || localStorage.getItem("lastCandidateId");

    if (candidateId) {
      navigate(`/candidate/${candidateId}`, { replace: true });
    } else {
      console.warn("No candidate ID found, redirecting to search");
      navigate("/search", { replace: true });
    }
  }, [id, searchParams, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      <Box sx={{ textAlign: "center" }}>
        <CircularProgress size={48} sx={{ color: "#0073c1", mb: 2 }} />
        <Typography variant="h6">
          Redirecting to candidate profile...
        </Typography>
      </Box>
    </Box>
  );
}
