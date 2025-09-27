import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Avatar,
  Chip,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Sidebar from "./Sidebar";

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
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedCandidateSkills, setSelectedCandidateSkills] = useState<string[]>([]);
  const [selectedCandidateName, setSelectedCandidateName] = useState("");

  // Responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    // For mock: set mockCandidates directly
    setCandidates(mockCandidates);
  }, []);

  useEffect(() => {
    if (!candidateA || !candidateB) {
      setCompareResult(null);
    }
  }, [candidateA, candidateB]);

  const handleSelectCandidate = (candidate: any, side: 'A' | 'B') => {
    if (side === 'A') {
      setCandidateA(candidateA?.id === candidate.id ? null : candidate);
    } else {
      setCandidateB(candidateB?.id === candidate.id ? null : candidate);
    }
  };

  const handleDeselect = (side: 'A' | 'B') => {
    if (side === 'A') {
      setCandidateA(null);
    } else {
      setCandidateB(null);
    }
  };

  const handleViewAllSkills = (candidate: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCandidateSkills(candidate.skills);
    setSelectedCandidateName(`${candidate.firstName} ${candidate.lastName}`);
    setSkillsDialogOpen(true);
  };

  const handleCloseSkillsDialog = () => {
    setSkillsDialogOpen(false);
    setSelectedCandidateSkills([]);
    setSelectedCandidateName("");
  };

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

  const renderCandidateCard = (candidate: any, side: 'A' | 'B') => {
    const isSelected = side === 'A' 
      ? candidateA?.id === candidate.id 
      : candidateB?.id === candidate.id;
    
    // Responsive skill chips display
    const maxSkillsToShow = isMobile ? 3 : isTablet ? 5 : 8;
    const skillsToShow = candidate.skills.slice(0, maxSkillsToShow);
    const remainingSkillsCount = candidate.skills.length - maxSkillsToShow;

    return (
      <Card 
        key={candidate.id}
        sx={{ 
          mb: 2, 
          bgcolor: isSelected ? "#DEDDEE" : "#adb6beff",
          color: "#000",
          border: isSelected ? "2px solid #93AFF7" : "none",
          cursor: "pointer",
          transition: "all 0.3s ease",
          '&:hover': {
            bgcolor: isSelected ? "#c9c8d9" : "#adb6beff",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            transform: "translateY(-2px)",
          }
        }}
        onClick={() => handleSelectCandidate(candidate, side)}
      >
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Avatar sx={{ 
              bgcolor: "#93AFF7", 
              mr: 2, 
              width: isMobile ? 40 : 56, 
              height: isMobile ? 40 : 56 
            }}>
              {candidate.firstName[0]}
              {candidate.lastName[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}> {/* Prevents text overflow */}
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: "bold", color: "#000" }}>
                {candidate.firstName} {candidate.lastName}
              </Typography>
              <Typography variant="body2" sx={{ color: "#333", wordBreak: "break-word" }}>
                {candidate.email}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" sx={{ color: "#333" }}>
              Uploaded: {candidate.uploaded}
            </Typography>
            <Chip 
              label={candidate.match} 
              sx={{ 
                bgcolor: "#93AFF7",
                color: "#204E20",
                fontWeight: "bold",
                fontSize: isMobile ? "0.75rem" : "0.875rem"
              }} 
            />
          </Box>

          <Typography
            sx={{
              fontWeight: "bold",
              color: "#204E20",
              mb: 1,
              fontSize: isMobile ? "0.875rem" : "1rem"
            }}
          >
            File: {candidate.project}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.5,
              my: 2,
            }}
          >
            {skillsToShow.map((skill: string) => (
              <Chip
                key={skill}
                label={skill}
                size={isMobile ? "small" : "medium"}
                sx={{
                  bgcolor: "#93AFF7",
                  color: "#204E20",
                  fontWeight: "bold",
                  fontSize: isMobile ? "0.7rem" : "0.875rem",
                  borderRadius: "12px",
                  px: 1,
                  textTransform: "lowercase",
                }}
              />
            ))}
            {remainingSkillsCount > 0 && (
              <Chip
                label={`+${remainingSkillsCount}`}
                size={isMobile ? "small" : "medium"}
                sx={{
                  bgcolor: "#204E20",
                  color: "#93AFF7",
                  fontWeight: "bold",
                  fontSize: isMobile ? "0.7rem" : "0.875rem",
                  borderRadius: "12px",
                  px: 1,
                }}
              />
            )}
          </Box>

          <Typography
            sx={{
              fontWeight: "bold",
              color: "#204E20",
              fontSize: isMobile ? "0.875rem" : "1rem"
            }}
          >
            Project Fit: {candidate.match}
          </Typography>

          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {isSelected && (
              <Button 
                variant="outlined" 
                size="small" 
                sx={{ 
                  color: "#204E20",
                  borderColor: "#204E20",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                  '&:hover': {
                    borderColor: "#93AFF7",
                    color: "#93AFF7"
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeselect(side);
                }}
              >
                Deselect
              </Button>
            )}

            <Button 
              variant="text" 
              size="small" 
              sx={{ 
                color: "#204E20",
                fontSize: isMobile ? "0.75rem" : "0.875rem",
                '&:hover': {
                  color: "#93AFF7"
                }
              }}
              onClick={(e) => handleViewAllSkills(candidate, e)}
            >
              View All Skills ({candidate.skills.length})
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderCandidateList = (side: 'A' | 'B') => {
    const selectedCandidate = side === 'A' ? candidateA : candidateB;
    const candidatesToShow = selectedCandidate ? [selectedCandidate] : candidates;

    return (
      <Paper
        elevation={4}
        sx={{
          flex: 1,
          p: isMobile ? 1.5 : isTablet ? 2 : 3,
          borderRadius: 3,
          bgcolor: "#DEDDEE",
          minWidth: isMobile ? "100%" : isTablet ? "280px" : "320px",
          maxWidth: isMobile ? "100%" : "500px",
          maxHeight: isMobile ? "500px" : "600px",
          overflow: "auto",
        }}
      >
        <Typography 
          variant={isMobile ? "subtitle1" : "h6"} 
          sx={{ 
            mb: 2, 
            textAlign: "center", 
            color: "#000",
            fontWeight: "bold",
            fontFamily: "Helvetica, sans-serif",
          }}
        >
          Candidate {side} {selectedCandidate && "(Selected)"}
        </Typography>
        
        {candidatesToShow.map(candidate => renderCandidateCard(candidate, side))}
        
        {selectedCandidate && (
          <Button 
            variant="outlined" 
            fullWidth 
            size={isMobile ? "small" : "medium"}
            sx={{ 
              mt: 2, 
              color: "#204E20", 
              borderColor: "#204E20",
              fontFamily: "Helvetica, sans-serif",
              fontSize: isMobile ? "0.75rem" : "0.875rem",
              '&:hover': {
                borderColor: "#93AFF7",
                color: "#93AFF7"
              }
            }}
            onClick={() => handleDeselect(side)}
          >
            Show All Candidates
          </Button>
        )}
      </Paper>
    );
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
      
      <Box sx={{ 
        flexGrow: 1, 
        p: isMobile ? 2 : isTablet ? 3 : 4,
        width: 0, // Prevents flexbox squishing issues
        minWidth: 0, // Prevents flexbox squishing issues
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          sx={{ 
            mb: 3, 
            fontWeight: "bold",
            fontFamily: "Helvetica, sans-serif",
            color: "#fff",
            textAlign: isMobile ? "center" : "left",
          }}
        >
          Compare Candidates
        </Typography>

        {/* Two Candidate Lists */}
        <Box sx={{ 
          display: "flex", 
          gap: isMobile ? 2 : isTablet ? 3 : 4, 
          mb: 4,
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "center" : "stretch",
        }}>
          {renderCandidateList('A')}
          {renderCandidateList('B')}
        </Box>

        {/* Compare Button */}
        {candidateA && candidateB && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
            <Button
              variant="contained"
              size={isMobile ? "medium" : "large"}
              sx={{ 
                px: isMobile ? 3 : 4, 
                py: isMobile ? 1 : 1.5, 
                fontSize: isMobile ? "0.9rem" : "1.1rem",
                bgcolor: "#93AFF7",
                color: "#204E20",
                fontWeight: "bold",
                fontFamily: "Helvetica, sans-serif",
                '&:hover': {
                  bgcolor: "#7b9fe3"
                }
              }}
              onClick={handleCompare}
            >
              Compare Selected Candidates
            </Button>
          </Box>
        )}

        {/* Comparison Result */}
        {compareResult && (
          <Box sx={{ mt: 4 }}>
            <Typography
              variant={isMobile ? "body1" : "h6"}
              sx={{
                color: "#204E20",
                fontWeight: "bold",
                bgcolor: "#DEDDEE",
                p: 2,
                borderRadius: 2,
                textAlign: "center",
                fontFamily: "Helvetica, sans-serif",
                fontSize: isMobile ? "1rem" : "1.25rem",
              }}
            >
              {compareResult}
            </Typography>
          </Box>
        )}

        {/* Skills Dialog */}
        <Dialog 
          open={skillsDialogOpen} 
          onClose={handleCloseSkillsDialog}
          maxWidth="md"
          fullWidth
          fullScreen={isMobile} // Fullscreen on mobile
        >
          <DialogTitle sx={{ 
            bgcolor: "#DEDDEE", 
            color: "#000", 
            fontFamily: "Helvetica, sans-serif",
            fontSize: isMobile ? "1.1rem" : "1.25rem"
          }}>
            Skills for {selectedCandidateName}
          </DialogTitle>
          <DialogContent sx={{ bgcolor: "#DEDDEE", color: "#000", py: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {selectedCandidateSkills.map((skill: string) => (
                <Chip
                  key={skill}
                  label={skill}
                  size={isMobile ? "small" : "medium"}
                  sx={{
                    bgcolor: "#93AFF7",
                    color: "#204E20",
                    fontWeight: "bold",
                    fontSize: isMobile ? "0.8rem" : "1rem",
                    borderRadius: "12px",
                    px: 1,
                    textTransform: "lowercase",
                    mb: 1,
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ bgcolor: "#DEDDEE" }}>
            <Button 
              onClick={handleCloseSkillsDialog}
              sx={{ 
                color: "#204E20", 
                fontFamily: "Helvetica, sans-serif",
                fontSize: isMobile ? "0.875rem" : "1rem"
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}