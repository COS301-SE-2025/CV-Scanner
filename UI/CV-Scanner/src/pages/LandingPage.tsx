import {
  Box,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  Grid, // use v2 Grid via named import
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DescriptionIcon from "@mui/icons-material/Description";
import InsightsIcon from "@mui/icons-material/Insights";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";

import logo from "../assets/logoNavbar.png";
import landingImage1 from "../assets/landingImage1.svg";
import landingImage2 from "../assets/landingImage2.svg";
import landingImage3 from "../assets/landingimage3.svg";
import landingImage4 from "../assets/landingImage4.svg";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#121436ff",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        mt: "64px",
      }}
    >
      {/* Top App Bar */}
      <AppBar position="fixed" sx={{ bgcolor: "#0A2540", boxShadow: "none" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img src={logo} alt="Logo" style={{ width: 80 }} />
            <Typography variant="h6" sx={{ ml: 2, fontWeight: "bold" }}>
              CV Scanner
            </Typography>
          </Box>
          <Button color="inherit" onClick={() => navigate("/login")}>
            Login
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ flexGrow: 1, px: 4, py: 6, bgcolor: "#121436ff" }}>
        <Grid
          container
          spacing={4}
          alignItems="center"
          justifyContent="center"
          sx={{
            maxWidth: "1200px",
            margin: "0 auto",
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          {/* Image */}
          <Grid xs={12} md={6} sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src={landingImage1}
              alt="Hero"
              sx={{ width: "100%", maxWidth: 500, height: "auto" }}
            />
          </Grid>

          {/* Text Content */}
          <Grid xs={12} md={6}>
            <Typography
              variant="h3"
              sx={{ fontWeight: "bold", mb: 2, color: "#e1f4ff" }}
            >
              Intelligent CV Screening
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, color: "#bce4ff" }}>
              Empower your hiring process with AI that filters and highlights
              the best candidates in seconds.
            </Typography>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate("/register")}
              sx={{
                background: "linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)",
                color: "#fff",
                fontSize: "1rem",
                fontWeight: "bold",
                px: 4,
                py: 1.5,
                borderRadius: 2,
                "&:hover": {
                  background:
                    "linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)",
                },
              }}
            >
              Get Started Free
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 6, px: 4, bgcolor: "#1e2235" }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", mb: 4 }}
        >
          Why Choose CV Scanner?
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {[
            {
              icon: <DescriptionIcon fontSize="large" />,
              title: "Upload CVs Easily",
              text: "Drag and drop multiple resumes in seconds.",
            },
            {
              icon: <InsightsIcon fontSize="large" />,
              title: "Smart Analysis",
              text: "Get insights and skill matches instantly.",
            },
            {
              icon: <SearchIcon fontSize="large" />,
              title: "Fast Search",
              text: "Filter CVs based on role requirements.",
            },
            {
              icon: <SecurityIcon fontSize="large" />,
              title: "Secure Storage",
              text: "All data is encrypted and safe.",
            },
          ].map((feature, idx) => (
            <Grid xs={12} sm={6} md={3} key={idx}>
              <Paper
                sx={{
                  p: 3,
                  textAlign: "center",
                  bgcolor: "#232a3b",
                  color: "#fff",
                  height: "100%",
                }}
                elevation={3}
              >
                {feature.icon}
                <Typography variant="h6" sx={{ mt: 2, fontWeight: "bold" }}>
                  {feature.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: "#bce4ff" }}>
                  {feature.text}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Process Overview Section */}
      <Box sx={{ py: 8, px: 4, bgcolor: "#141738" }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", mb: 10 }}
        >
          How CV Scanner Works
        </Typography>

        {/* Step 1 */}
        <Grid
          container
          spacing={6}
          alignItems="center"
          justifyContent="center"
          sx={{ maxWidth: "1200px", mx: "auto", mb: 12 }}
        >
          <Grid xs={12} md={6} sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src={landingImage2}
              alt="Upload CVs"
              sx={{ width: "100%", maxWidth: 400 }}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#bce4ff" }}
            >
              1. Upload CVs Instantly
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: "#e1f4ff" }}>
              Drag and drop CVs or upload in bulk. Our system parses each resume
              with precision.
            </Typography>
          </Grid>
        </Grid>

        {/* Step 2 */}
        <Grid
          container
          spacing={6}
          alignItems="center"
          justifyContent="center"
          sx={{ maxWidth: "1200px", mx: "auto", mb: 12 }}
        >
          <Grid xs={12} md={6}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#bce4ff" }}
            >
              2. Analyze With AI
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: "#e1f4ff" }}>
              Our intelligent engine extracts skills, experience, and education
              from each candidate.
            </Typography>
          </Grid>
          <Grid xs={12} md={6} sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src={landingImage3}
              alt="Analyze CVs"
              sx={{ width: "100%", maxWidth: 400 }}
            />
          </Grid>
        </Grid>

        {/* Step 3 */}
        <Grid
          container
          spacing={6}
          alignItems="center"
          justifyContent="center"
          sx={{ maxWidth: "1200px", mx: "auto" }}
        >
          <Grid xs={12} md={6} sx={{ textAlign: "center" }}>
            <Box
              component="img"
              src={landingImage4}
              alt="Filter Candidates"
              sx={{ width: "100%", maxWidth: 400 }}
            />
          </Grid>
          <Grid xs={12} md={6}>
            <Typography
              variant="h5"
              sx={{ fontWeight: "bold", color: "#bce4ff" }}
            >
              3. Filter & Shortlist
            </Typography>
            <Typography variant="body1" sx={{ mt: 2, color: "#e1f4ff" }}>
              Search and filter by skills, years of experience, and keywords to
              find your ideal hire.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Target Audience Section */}
      <Box sx={{ py: 8, px: 4, bgcolor: "#1e2235" }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: "bold", mb: 6 }}
        >
          Built for Every Recruiter
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {[
            {
              title: "Recruitment Agencies",
              text: "Scale your hiring process and reduce manual screening time.",
            },
            {
              title: "Corporate HR Teams",
              text: "Streamline internal hiring and match candidates to departments easily.",
            },
            {
              title: "Startups & SMEs",
              text: "Make data-driven hiring decisions from day one.",
            },
          ].map((item, idx) => (
            <Grid xs={12} md={4} key={idx}>
              <Paper
                elevation={4}
                sx={{
                  p: 4,
                  textAlign: "center",
                  bgcolor: "#2c324a",
                  color: "#fff",
                  height: "100%",
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: "bold", mb: 2 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "#bce4ff" }}>
                  {item.text}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          textAlign: "center",
          py: 2,
          bgcolor: "#0A2540",
          color: "#fff",
          mt: "auto",
        }}
      >
        <Typography variant="body2">
          &copy; {new Date().getFullYear()} Quantum Stack CV Scanner. All rights
          reserved.
        </Typography>
      </Box>
    </Box>
  );
}
