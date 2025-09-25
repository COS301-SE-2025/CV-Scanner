import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import Sidebar from "./Sidebar";
import { apiFetch } from "../lib/api";

export default function CompareCandidates() {
  const [collapsed, setCollapsed] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateA, setCandidateA] = useState<any | null>(null);
  const [candidateB, setCandidateB] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch("/cv/candidates");
        const list = res && res.ok ? await res.json() : [];
        setCandidates(list);
      } catch {
        setCandidates([]);
      }
    })();
  }, []);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#1E1E1E", color: "#fff" }}>
      <Sidebar userRole="Admin" collapsed={collapsed} setCollapsed={setCollapsed} />
      <Box sx={{ flexGrow: 1, p: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
          Compare Candidates
        </Typography>

        {/* Selectors */}
        <Box sx={{ display: "flex", gap: 4, mb: 4 }}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: "#fff" }}>Select Candidate A</InputLabel>
            <Select
              value={candidateA?.id || ""}
              onChange={(e) => {
                const cand = candidates.find((c) => c.id === e.target.value);
                setCandidateA(cand);
              }}
              sx={{ bgcolor: "#2E3B4E", color: "#fff" }}
            >
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel sx={{ color: "#fff" }}>Select Candidate B</InputLabel>
            <Select
              value={candidateB?.id || ""}
              onChange={(e) => {
                const cand = candidates.find((c) => c.id === e.target.value);
                setCandidateB(cand);
              }}
              sx={{ bgcolor: "#2E3B4E", color: "#fff" }}
            >
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Comparison */}
        {candidateA && candidateB && (
          <Box sx={{ display: "flex", gap: 4 }}>
            {[candidateA, candidateB].map((c, i) => (
              <Paper
                key={i}
                elevation={4}
                sx={{
                  flex: 1,
                  p: 3,
                  borderRadius: 3,
                  bgcolor: "#2E3B4E",
                  color: "#fff",
                }}
              >
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {c.firstName} {c.lastName}
                </Typography>
                <Divider sx={{ mb: 2, bgcolor: "#555" }} />
                <Typography>📧 {c.email}</Typography>
                <Typography>🎯 Match: {c.match || "N/A"}</Typography>
                <Typography>🛠 Skills: {c.skills?.join(", ") || "None"}</Typography>
                <Typography>📂 Project: {c.project || "Unknown"}</Typography>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
