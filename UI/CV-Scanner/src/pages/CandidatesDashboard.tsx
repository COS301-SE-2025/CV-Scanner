import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  Modal,
  Fade,
  Backdrop,
  Popover,
  Tooltip,
} from "@mui/material";
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import { useNavigate, useLocation } from "react-router-dom";
import logo2 from "../assets/logo2.png";
import logo from "../assets/logo.png";
import logo3 from "../assets/logoNavbar.png"; // Import the third logo if needed
import DashboardIcon from "@mui/icons-material/Dashboard";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
//import NotificationsIcon from "@mui/icons-material/Notifications";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LightbulbRoundedIcon from "@mui/icons-material/LightbulbRounded";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export default function CandidatesDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0); // For future multi-step
  const [fadeIn, setFadeIn] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const devUser = {
      email: "dev@example.com",
      password: "Password123",
      first_name: "John",
      last_name: "Doe",
      role: "Admin",
    };

  const [user, setUser] = useState<{
    first_name?: string;
    last_name?: string;
    username?: string;
    role?: string; // <-- add this
    email?: string; // <-- and this
  } | null>(null);

  const reviewBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.title = "Candidates Dashboard";

    // Fetch user info from API
    const email = localStorage.getItem("userEmail") || "admin@email.com";
    fetch(`http://localhost:8081/auth/me?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (reviewBtnRef.current) {
      setAnchorEl(reviewBtnRef.current);
    }
  }, [showTutorial]);

  const handleStepChange = (nextStep: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setTutorialStep(nextStep);
      setFadeIn(true);
    }, 250);
  };
  const handleCloseTutorial = () => setShowTutorial(false);

//Mock data for graphs 

const candidateTrends = [
  { month: 'Jan', candidates: 30 },
  { month: 'Feb', candidates: 45 },
  { month: 'Mar', candidates: 60 },
  { month: 'Apr', candidates: 50 },
  { month: 'May', candidates: 80 },
];

const skillDistribution = [
  { name: '.NET', value: 400 },
  { name: 'React', value: 300 },
  { name: 'Java', value: 300 },
  { name: 'Python', value: 200 },
];

const projectFitData = [
  { type: 'Technical', value: 50 },
  { type: 'Collaborative', value: 30 },
  { type: 'Autonomous', value: 20 },
];

const groupedBarData = [
  { name: 'Week 1', ".NET": 40, React: 24, Python: 24 },
  { name: 'Week 2', ".NET": 30, React: 13, Python: 22 },
  { name: 'Week 3', ".NET": 20, React: 98, Python: 22 },
  { name: 'Week 4', ".NET": 27, React: 39, Python: 20 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "#0c0e18ff",
        color: "#fff",
      }}
    >
      {/* Sidebar */}
      {!collapsed ? (
        <Box
          sx={{
            width: 220,
            minWidth: "220px",
            maxWidth: "220px", 
            bgcolor: "#0A2540 ",
            display: "flex",
            flexDirection: "column",
            p: 2,
            position: "relative",
          }}
        >
          {/* Collapse Button */}
          <IconButton
            onClick={() => setCollapsed(true)}
            sx={{
              color: "#fff",
              position: "absolute",
              top: 8,
              left: 8,
              zIndex: 1,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="6" width="18" height="2" fill="currentColor" />
              <rect x="3" y="11" width="18" height="2" fill="currentColor" />
              <rect x="3" y="16" width="18" height="2" fill="currentColor" />
            </svg>
          </IconButton>

          <Box sx={{ display: "flex", justifyContent: "center", mb: 3, mt: 5 }}>
            <img src={logo3} alt="Team Logo" style={{ width: 120 }} />
          </Box>

          <Button
            fullWidth
            sx={{ ...navButtonStyle, bgcolor: "#d8f0ff", color: "#000" }}
            className={location.pathname === "/dashboard" ? "active" : ""}
            startIcon={<DashboardIcon />}
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/upload" ? "active" : ""}
            startIcon={<UploadFileIcon />}
            onClick={() => navigate("/upload")}
          >
            Upload CV
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/candidates" ? "active" : ""}
            startIcon={<PeopleIcon />}
            onClick={() => navigate("/candidates")}
          >
            Candidates
          </Button>

          <Button
            fullWidth
            sx={navButtonStyle}
            className={location.pathname === "/search" ? "active" : ""}
            startIcon={<SearchIcon />}
            onClick={() => navigate("/search")}
          >
            Search
          </Button>

          {/* Only show User Management if user is Admin */}
          {(user?.role === "Admin" || devUser.role === "Admin") && (
            <Button
              fullWidth
              sx={navButtonStyle}
              className={
                location.pathname === "/user-management" ? "active" : ""
              }
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/user-management")}
            >
              User Management
            </Button>
          )}
          {(user?.role === "Admin" || devUser.role === "Admin") && (
            <Button
              fullWidth
              sx={navButtonStyle}
              className={location.pathname === "/system-settings" ? "active" : ""}
              startIcon={<SettingsIcon />}
              onClick={() => navigate("/system-settings")}
            >
              System Settings
            </Button>
          )}          
        </Box>
      ) : (
        // Expand Icon when sidebar is collapsed
        <Box
          sx={{
            width: 40,
            bgcolor: "#0A2540 ",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            pt: 1,
          }}
        >
          <IconButton
            onClick={() => setCollapsed(false)}
            sx={{ color: "#fff" }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        {/* Top AppBar */}
        <AppBar
          position="static"
          sx={{ bgcolor: "#0A2540 ", boxShadow: "none" }}
        >
          <Toolbar sx={{ justifyContent: "flex-end" }}>

  {/* Tutorial icon */}
  <Tooltip title="Run Tutorial" arrow>
    <IconButton
      onClick={() => {
        setShowTutorial(true);
        setTutorialStep(0);
        setFadeIn(true);
      }}
      sx={{ml: 1, color: '#FFEB3B'}}
    >
      <LightbulbRoundedIcon />
    </IconButton>
  </Tooltip>

  {/* Help / FAQ icon */}
  <Tooltip title="Go to Help Page" arrow>
    <IconButton
      onClick={() => navigate("/help")}
      sx={{ ml: 1, color: '#90ee90' }}
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
          ? `${user.first_name} ${user.last_name || ""} (${user.role || "User"})`
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

        {/* Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
            Candidates Dashboard
          </Typography>

          {/* Stat Cards */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 4 }}>
            {[
              { label: "Candidates", value: "142" },
              { label: "Pending Review", value: "24" },
              { label: "Top Technology", value: ".NET" },
              { label: "Technical Matches", value: "78%" },
            ].map((stat, i) => (
              <Paper key={i} elevation={6} sx={statCardStyle}>
                <Typography variant="h4">{stat.value}</Typography>
                <Typography variant="subtitle1">{stat.label}</Typography>
              </Paper>
            ))}
          </Box>

            {/* Dashboard Graphs */}
        <Box sx={{ 
  display: "flex", 
  flexWrap: "wrap", 
  gap: 4, 
  mb: 4,
  '& > *': { // Ensures all child elements have these properties
    flex: "1 1 350px",
    minWidth: 0 // Prevents overflow issues
  }
}}>

   {/* Line Chart: Light Blue */}
  <Paper sx={{ 
    p: 2, 
    borderRadius: 3, 
    backgroundColor: "#75a29dff", 
    color: "#000",
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-4px)' }
  }}>
    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Monthly Candidate Uploads</Typography>
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={candidateTrends}>
        <CartesianGrid stroke="#ccc" strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="candidates" 
          stroke="#0A2540 " 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, fill: "#0A2540 " }}
        />
      </LineChart>
    </ResponsiveContainer>
  </Paper>

  {/* Bar Chart: Dark Blue */}
  <Paper sx={{ 
    p: 2, 
    borderRadius: 3, 
    backgroundColor: "#2b3a55", 
    color: "#fff",
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-4px)' }
  }}>
    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Weekly Tech Usage</Typography>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={groupedBarData}>
        <CartesianGrid stroke="#4a5568" strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#fff" />
        <YAxis stroke="#fff" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#2b3a55',
            borderColor: '#4a5568'
          }}
        />
        <Legend />
        <Bar dataKey=".NET" fill="#8884d8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="React" fill="#82ca9d" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Python" fill="#ffc658" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Paper>

  {/* Pie Chart: Teal Accent */}
  <Paper sx={{ 
    p: 2, 
    borderRadius: 3, 
    backgroundColor: "#75a29dff", 
    color: "#000",
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-4px)' }
  }}>
    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Skill Distribution</Typography>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={skillDistribution}
          dataKey="value"
          cx="50%"
          cy="50%"
          outerRadius={60}
          labelLine={true}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
        >
          {skillDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value, name, props) => [
            value, 
            `${name}: ${(props.payload.percent * 100).toFixed(1)}%`
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  </Paper>

  {/* Doughnut Chart: Dark Blue */}
  <Paper sx={{ 
    p: 2, 
    borderRadius: 3, 
    backgroundColor: "#2b3a55", 
    color: "#fff",
    transition: 'transform 0.2s',
    '&:hover': { transform: 'translateY(-4px)' }
  }}>
    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>Project Fit Types</Typography>
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={projectFitData}
          dataKey="value"
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={60}
          label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
          labelLine={true}
        >
          {projectFitData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#2b3a55',
            borderColor: '#4a5568'
          }}
          formatter={(value, name, props) => [
            value, 
            `${name}: ${(props.payload.percent * 100).toFixed(1)}%`
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  </Paper>

</Box>

          {/* Recent Table */}
          <Paper
            elevation={6}
            sx={{ p: 2, borderRadius: 3, backgroundColor: "#75a29dff" }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: "#0073c1", mb: 2 }}
            >
              Recently Processed
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                      Candidate
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                      Top Skills
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                      Project Fit
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", fontSize: "1.2rem" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    {
                      name: "Jane Smith",
                      skills: ".NET, Azure, SQL",
                      fit: "Technical (92%)",
                    },
                    {
                      name: "Mike Johnson",
                      skills: "React, Node.js",
                      fit: "Collaborative (85%)",
                    },
                    {
                      name: "Peter Griffin",
                      skills: "C++, C, Python",
                      fit: "Technical (64%)",
                    },
                  ].map((candidate, idx) => (
                    <TableRow key={candidate.name}>
                      <TableCell>{candidate.name}</TableCell>
                      <TableCell>{candidate.skills}</TableCell>
                      <TableCell>{candidate.fit}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={reviewButtonStyle}
                          onClick={() => navigate("/candidate-review")}
                          ref={idx === 0 ? reviewBtnRef : null}
                        >
                          Review
                        </Button>

                        {idx === 0 && (
                          <Popover
                            open={showTutorial && Boolean(anchorEl)}
                            anchorEl={anchorEl}
                            onClose={handleCloseTutorial}
                            anchorOrigin={{
                              vertical: "top",
                              horizontal: "center",
                            }}
                            transformOrigin={{
                              vertical: "bottom",
                              horizontal: "center",
                            }}
                            PaperProps={{
                              sx: {
                                p: 2,
                                bgcolor: "#fff",
                                color: "#181c2f",
                                borderRadius: 2,
                                boxShadow: 6,
                                minWidth: 280,
                                zIndex: 1500,
                                textAlign: "center",
                              },
                            }}
                          >
                            <Fade in={fadeIn} timeout={250}>
                              <Box sx={{ position: "relative" }}>
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: "bold", mb: 1 }}
                                >
                                  Quick Tip
                                </Typography>
                                <Typography sx={{ mb: 2 }}>
                                  Click <b>Review</b> to view and assess this
                                  candidate's CV.
                                </Typography>

                                {/* Shared navigation buttons */}

                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mt: 3,
                                    gap: 2,
                                  }}
                                >
                                  <Button
                                    variant="text"
                                    size="small"
                                    onClick={handleCloseTutorial}
                                    sx={{
                                      color: "#888",
                                      fontSize: "0.85rem",
                                      textTransform: "none",
                                      minWidth: "auto",
                                      p: 0,
                                    }}
                                  >
                                    End Tutorial
                                  </Button>
                                  <Box sx={{ display: "flex", gap: 2 }}>
                                    <Button
                                      variant="contained"
                                      onClick={handleCloseTutorial}
                                      sx={{
                                        bgcolor: "#5a88ad",
                                        color: "#fff",
                                        fontWeight: "bold",
                                        textTransform: "none",
                                        "&:hover": { bgcolor: "#487DA6" },
                                      }}
                                    >
                                      Finish
                                    </Button>
                                  </Box>
                                </Box>
                              </Box>
                            </Fade>
                          </Popover>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

// Styles
const navButtonStyle = {
  justifyContent: "flex-start",
  mb: 1,
  color: "#fff",
  backgroundColor: "transparent",
  "&:hover": {
    backgroundColor: "#487DA6",
  },
  textTransform: "none",
  fontWeight: "bold",
  position: "relative",
  "&.active": {
    "&::before": {
      content: '""',
      position: "absolute",
      left: 0,
      top: 0,
      height: "100%",
      width: "4px",
      backgroundColor: "black",
      borderRadius: "0 4px 4px 0",
    },
  },
};

const statCardStyle = {
  p: 2,
  minWidth: 140,
  borderRadius: 3,
  backgroundColor: "#888a8aff",
  textAlign: "center",
  color: "#000",
};

const reviewButtonStyle = {
  background: "linear-gradient(45deg, #0a1172 0%, #032c3b 50%, #00b300 100%)",
  color: "white",
  fontWeight: "bold",
  padding: "8px 20px",
  borderRadius: "4px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  "&:hover": {
    background: "linear-gradient(45deg, #081158 0%, #022028 50%, #009a00 100%)",
    transform: "translateY(-1px)",
  },
  textTransform: "none",
  transition: "all 0.3s ease",
  position: "relative",
  overflow: "hidden",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)",
  },
};

const graphCardBase = {
  p: 2,
  borderRadius: 3,
  width: { xs: "100%", sm: "45%", md: "30%" },
  minWidth: 300,
  height: 300,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};
