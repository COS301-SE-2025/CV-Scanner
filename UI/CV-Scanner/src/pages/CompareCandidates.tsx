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
  Chip,
  Avatar,
  Button,
} from "@mui/material";
import Sidebar from "./Sidebar";
// import { apiFetch } from "../lib/api"; // Comment out for mock

// --- MOCK DATA ---
const mockCandidates = [
  {
    id: 1,
    firstName: "Talhah",
    lastName: "Karodia",
    email: "talhah.karodia@email.com",
    match: "92%",
    skills: [
      "angular",
      "azure",
      "cicd",
      "css",
      "figma",
      "git",
      "github",
      "html",
      "java",
      "javascript",
      "node.js",
      "php",
      "python",
      "react",
      "sql",
    ],
    project: "CV.pdf",
    uploaded: "3 days ago",
  },
  {
    id: 2,
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@email.com",
    match: "85%",
    skills: [
      "react",
      "typescript",
      "css",
      "figma",
      "git",
      "html",
      "python",
      "sql",
    ],
    project: "JaneCV.pdf",
    uploaded: "2 days ago",
  },
  {
    id: 3,
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@email.com",
    match: "92%",
    skills: ["angular", "azure", "java", "node.js", "php", "sql"],
    project: "JohnCV.pdf",
    uploaded: "1 day ago",
  },
];

export default function CompareCandidates() {
  const [collapsed, setCollapsed] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateA, setCandidateA] = useState<any | null>(null);
  const [candidateB, setCandidateB] = useState<any | null>(null);
  const [compareResult, setCompareResult] = useState<string | null>(null);

  useEffect(() => {
    
    // For mock: set mockCandidates directly
    setCandidates(mockCandidates);

    // For real API:
    // (async () => {
    //   try {
    //     const res = await apiFetch("/cv/candidates");
    //     const list = res && res.ok ? await res.json() : [];
    //     setCandidates(list);
    //   } catch {
    //     setCandidates([]);
    //   }
    // })();
  }, []);
useEffect(() => {
  if (!candidateA || !candidateB) {
    setCompareResult(null);
  }
}, [candidateA, candidateB]);
  // Example comparison logic: highest "match" wins, fallback to most skills
  const handleCompare = () => {
    if (!candidateA || !candidateB) return;

    // Try to parse match as number, fallback to 0 if N/A or missing
    const matchA = parseInt((candidateA.match || "0").replace("%", "")) || 0;
    const matchB = parseInt((candidateB.match || "0").replace("%", "")) || 0;

    let winner;
    if (matchA > matchB) winner = candidateA;
    else if (matchB > matchA) winner = candidateB;
    else {
      // If match is equal, fallback to most skills
      if ((candidateA.skills?.length || 0) > (candidateB.skills?.length || 0))
        winner = candidateA;
      else if (
        (candidateB.skills?.length || 0) > (candidateA.skills?.length || 0)
      )
        winner = candidateB;
      else winner = null; // Tie
    }

    if (winner) {
      setCompareResult(
        `${winner.firstName} ${winner.lastName} is the best suited candidate!`
      );
    } else {
      setCompareResult("Both candidates are equally suited.");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#1E1E1E",
        color: "#fff",
      }}
    >
      <Sidebar
        userRole="Admin"
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
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
                const val = e.target.value;
                if (!val) setCandidateA(null); // Deselect
                else {
                  const cand = candidates.find((c) => c.id === val);
                  setCandidateA(cand);
                }
              }}
              sx={{ bgcolor: "#2E3B4E", color: "#fff" }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
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
                const val = e.target.value;
                if (!val) setCandidateB(null); // Deselect
                else {
                  const cand = candidates.find((c) => c.id === val);
                  setCandidateB(cand);
                }
              }}
              sx={{ bgcolor: "#2E3B4E", color: "#fff" }}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Compare Button */}
        {candidateA && candidateB && (
          <Button
            variant="contained"
            color="primary"
            sx={{ mb: 3 }}
            onClick={handleCompare}
          >
            Compare
          </Button>
        )}

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
                  bgcolor: "#aab3bb",
                  color: "#222",
                  minWidth: 320,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Avatar sx={{ bgcolor: "#90a4ae", mr: 2 }}>
                    {c.firstName[0]}
                    {c.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {c.firstName} {c.lastName}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#333" }}>
                      Uploaded: {c.uploaded}
                    </Typography>
                  </Box>
                </Box>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    color: "#204E20",
                    mt: 1,
                  }}
                >
                  File: {c.project}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    my: 2,
                  }}
                >
                  {c.skills.map((skill: string) => (
                    <Chip
                      key={skill}
                      label={skill}
                      sx={{
                        bgcolor: "#7eb6ff",
                        color: "#222",
                        fontWeight: "bold",
                        fontSize: "1rem",
                        borderRadius: "12px",
                        px: 1.5,
                        textTransform: "lowercase",
                      }}
                    />
                  ))}
                </Box>
                <Typography
                  sx={{
                    fontWeight: "bold",
                    color: "#204E20",
                  }}
                >
                  Project Fit: {c.match}
                </Typography>
              </Paper>
            ))}
          </Box>
        )}

        {/* Result */}
        {compareResult && (
          <Box sx={{ mt: 4 }}>
            <Typography
              variant="h6"
              sx={{
                color: "#204E20",
                fontWeight: "bold",
                bgcolor: "#deddee",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
              }}
            >
              {compareResult}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
