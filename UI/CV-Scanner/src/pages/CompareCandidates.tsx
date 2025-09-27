import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  TextField,
  InputAdornment,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
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

// Dev user fallback
const devUser = {
  email: "dev@example.com",
  password: "Password123",
  first_name: "John",
  last_name: "Doe",
  role: "Admin",
};

export default function CompareCandidates() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateA, setCandidateA] = useState<any | null>(null);
  const [candidateB, setCandidateB] = useState<any | null>(null);
  const [compareResult, setCompareResult] = useState<string | null>(null);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [selectedCandidateSkills, setSelectedCandidateSkills] = useState<string[]>([]);
  const [selectedCandidateName, setSelectedCandidateName] = useState("");
  const [searchTermA, setSearchTermA] = useState("");
  const [searchTermB, setSearchTermB] = useState("");
  const [user, setUser] = useState<any>(null);

  // Responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  useEffect(() => {
    // Try to get user from localStorage or use dev fallback
    const email = localStorage.getItem("userEmail") || devUser.email;
    // Simulate API call - in real app, you'd use apiFetch here
    const fetchUser = async () => {
      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if we have user data in localStorage
        const userData = localStorage.getItem("userData");
        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          setUser(devUser);
        }
      } catch {
        setUser(devUser);
      }
    };
    
    fetchUser();
  }, []);

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
      setSearchTermA(""); // Clear search when showing all candidates
    } else {
      setCandidateB(null);
      setSearchTermB(""); // Clear search when showing all candidates
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

  // Filter candidates based on search term and block the candidate selected on the other side
  const getFilteredCandidates = (side: 'A' | 'B') => {
    const searchTerm = side === 'A' ? searchTermA : searchTermB;
    const otherSideCandidate = side === 'A' ? candidateB : candidateA;
    
    return candidates.filter(candidate => {
      // If this candidate is selected on the other side, exclude them
      if (otherSideCandidate && candidate.id === otherSideCandidate.id) {
        return false;
      }
      
      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          candidate.firstName.toLowerCase().includes(searchLower) ||
          candidate.lastName.toLowerCase().includes(searchLower) ||
          candidate.email.toLowerCase().includes(searchLower) ||
          candidate.skills.some((skill: string) => 
            skill.toLowerCase().includes(searchLower)
          )
        );
      }
      
      return true;
    });
  };

  const renderCandidateCard = (candidate: any, side: 'A' | 'B') => {
    const isSelected = side === 'A' 
      ? candidateA?.id === candidate.id 
      : candidateB?.id === candidate.id;
    
    // Check if candidate is blocked (selected on the other side)
    const isBlocked = side === 'A' 
      ? candidateB?.id === candidate.id 
      : candidateA?.id === candidate.id;

    // Responsive skill chips display
    const maxSkillsToShow = isMobile ? 3 : isTablet ? 5 : 8;
    const skillsToShow = candidate.skills.slice(0, maxSkillsToShow);
    const remainingSkillsCount = candidate.skills.length - maxSkillsToShow;

    return (
      <Card 
        key={candidate.id}
        sx={{ 
          mb: 2, 
          bgcolor: isBlocked ? "#f5f5f5" : (isSelected ? "#DEDDEE" : "#adb6beff"),
          color: "#000",
          border: isSelected ? "2px solid #93AFF7" : (isBlocked ? "2px solid #ff6b6b" : "none"),
          cursor: isBlocked ? "not-allowed" : "pointer",
          opacity: isBlocked ? 0.6 : 1,
          transition: "all 0.3s ease",
          '&:hover': {
            bgcolor: isBlocked ? "#f5f5f5" : (isSelected ? "#c9c8d9" : "#adb6beff"),
            boxShadow: isBlocked ? "none" : "0 4px 8px rgba(0,0,0,0.2)",
            transform: isBlocked ? "none" : "translateY(-2px)",
          }
        }}
        onClick={() => !isBlocked && handleSelectCandidate(candidate, side)}
      >
        <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
          {isBlocked && (
            <Box sx={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              bgcolor: "#ff6b6b", 
              color: "white",
              p: 0.5,
              mb: 1,
              borderRadius: 1,
            }}>
              <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                Selected on other side
              </Typography>
            </Box>
          )}
          
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Avatar sx={{ 
              bgcolor: isBlocked ? "#ccc" : "#93AFF7", 
              mr: 2, 
              width: isMobile ? 40 : 56, 
              height: isMobile ? 40 : 56 
            }}>
              {candidate.firstName[0]}
              {candidate.lastName[0]}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ 
                fontWeight: "bold", 
                color: isBlocked ? "#666" : "#000" 
              }}>
                {candidate.firstName} {candidate.lastName}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: isBlocked ? "#888" : "#333", 
                wordBreak: "break-word" 
              }}>
                {candidate.email}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            mb: 1, 
            flexWrap: 'wrap', 
            gap: 1 
          }}>
            <Typography variant="body2" sx={{ color: isBlocked ? "#888" : "#333" }}>
              Uploaded: {candidate.uploaded}
            </Typography>
            <Chip 
              label={candidate.match} 
              sx={{ 
                bgcolor: isBlocked ? "#ccc" : "#93AFF7",
                color: isBlocked ? "#666" : "#204E20",
                fontWeight: "bold",
                fontSize: isMobile ? "0.75rem" : "0.875rem"
              }} 
            />
          </Box>

          <Typography
            sx={{
              fontWeight: "bold",
              color: isBlocked ? "#666" : "#204E20",
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
                  bgcolor: isBlocked ? "#e0e0e0" : "#93AFF7",
                  color: isBlocked ? "#666" : "#204E20",
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
                  bgcolor: isBlocked ? "#666" : "#204E20",
                  color: isBlocked ? "#e0e0e0" : "#93AFF7",
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
              color: isBlocked ? "#666" : "#204E20",
              fontSize: isMobile ? "0.875rem" : "1rem"
            }}
          >
            Project Fit: {candidate.match}
          </Typography>

          {!isBlocked && (
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
          )}
        </CardContent>
      </Card>
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
        userRole={user?.role || devUser.role}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      
      <Box sx={{ 
        flexGrow: 1, 
        display: "flex", 
        flexDirection: "column",
        width: 0,
        minWidth: 0,
      }}>
        {/* AppBar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#232A3B", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>
            <Tooltip title="Go to Help Page" arrow>
              <IconButton
                onClick={() => navigate("/help")}
                sx={{ ml: 1, color: "#90ee90" }}
              >
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            
            {/* User Info */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                ml: 2,
                cursor: "pointer",
                "&:hover": { opacity: 0.8 },
              }}
              onClick={() => navigate("/settings")}
            >
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">
                {user
                  ? user.first_name
                    ? `${user.first_name} ${user.last_name || ""} (${
                        user.role || "User"
                      })`
                    : (user.username || user.email) +
                      (user.role ? ` (${user.role})` : "")
                  : "User"}
              </Typography>
            </Box>
            
            {/* Logout */}
            <IconButton
              color="inherit"
              onClick={() => navigate("/login")}
              sx={{ ml: 1 }}
            >
              <ExitToAppIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ 
          flexGrow: 1, 
          p: isMobile ? 2 : isTablet ? 3 : 4,
          overflow: "auto", // Allow main content to scroll naturally
        }}>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
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

          {/* Two Candidate Lists with improved scrolling */}
          <Box sx={{ 
            display: "flex", 
            gap: isMobile ? 2 : isTablet ? 3 : 4, 
            mb: 4,
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "center" : "stretch",
            height: isMobile ? "auto" : "70vh",
            minHeight: isMobile ? "auto" : "500px",
            overflow: isMobile ? "visible" : "hidden",
          }}>
            {/* Candidate A Column */}
            <Box sx={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column",
              minWidth: isMobile ? "100%" : isTablet ? "280px" : "320px",
              maxWidth: isMobile ? "100%" : "500px",
            }}>
              <Paper
                elevation={4}
                sx={{
                  flex: 1,
                  p: isMobile ? 1.5 : isTablet ? 2 : 3,
                  borderRadius: 3,
                  bgcolor: "#DEDDEE",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
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
                    flexShrink: 0,
                  }}
                >
                  Candidate A {candidateA && "(Selected)"}
                </Typography>
                
                {/* Search Bar */}
                {!candidateA && (
                  <TextField
                    fullWidth
                    placeholder="Search candidates..."
                    value={searchTermA}
                    onChange={(e) => setSearchTermA(e.target.value)}
                    sx={{ 
                      mb: 2,
                      flexShrink: 0,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover fieldset': {
                          borderColor: '#93AFF7',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#204E20',
                        },
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#204E20' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                
                {/* Scrollable candidates list */}
                <Box sx={{ 
                  flex: 1, 
                  overflow: "auto",
                  minHeight: "200px",
                }}>
                  {getFilteredCandidates('A').length === 0 ? (
                    <Typography 
                      sx={{ 
                        textAlign: "center", 
                        color: "#666", 
                        fontStyle: "italic",
                        mt: 2
                      }}
                    >
                      {searchTermA ? "No candidates match your search" : "No candidates available"}
                    </Typography>
                  ) : (
                    getFilteredCandidates('A').map(candidate => renderCandidateCard(candidate, 'A'))
                  )}
                </Box>
                
                {candidateA && (
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
                      flexShrink: 0,
                      '&:hover': {
                        borderColor: "#93AFF7",
                        color: "#93AFF7"
                      }
                    }}
                    onClick={() => handleDeselect('A')}
                  >
                    Show All Candidates
                  </Button>
                )}
              </Paper>
            </Box>

            {/* Candidate B Column */}
            <Box sx={{ 
              flex: 1, 
              display: "flex", 
              flexDirection: "column",
              minWidth: isMobile ? "100%" : isTablet ? "280px" : "320px",
              maxWidth: isMobile ? "100%" : "500px",
            }}>
              <Paper
                elevation={4}
                sx={{
                  flex: 1,
                  p: isMobile ? 1.5 : isTablet ? 2 : 3,
                  borderRadius: 3,
                  bgcolor: "#DEDDEE",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
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
                    flexShrink: 0,
                  }}
                >
                  Candidate B {candidateB && "(Selected)"}
                </Typography>
                
                {/* Search Bar */}
                {!candidateB && (
                  <TextField
                    fullWidth
                    placeholder="Search candidates..."
                    value={searchTermB}
                    onChange={(e) => setSearchTermB(e.target.value)}
                    sx={{ 
                      mb: 2,
                      flexShrink: 0,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'white',
                        '&:hover fieldset': {
                          borderColor: '#93AFF7',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#204E20',
                        },
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: '#204E20' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
                
                {/* Scrollable candidates list */}
                <Box sx={{ 
                  flex: 1, 
                  overflow: "auto",
                  minHeight: "200px",
                }}>
                  {getFilteredCandidates('B').length === 0 ? (
                    <Typography 
                      sx={{ 
                        textAlign: "center", 
                        color: "#666", 
                        fontStyle: "italic",
                        mt: 2
                      }}
                    >
                      {searchTermB ? "No candidates match your search" : "No candidates available"}
                    </Typography>
                  ) : (
                    getFilteredCandidates('B').map(candidate => renderCandidateCard(candidate, 'B'))
                  )}
                </Box>
                
                {candidateB && (
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
                      flexShrink: 0,
                      '&:hover': {
                        borderColor: "#93AFF7",
                        color: "#93AFF7"
                      }
                    }}
                    onClick={() => handleDeselect('B')}
                  >
                    Show All Candidates
                  </Button>
                )}
              </Paper>
            </Box>
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
            fullScreen={isMobile}
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
    </Box>
  );
}