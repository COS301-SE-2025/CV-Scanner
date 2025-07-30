import { useState } from 'react';
import { AppBar, Toolbar } from "@mui/material";
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import logo3 from "../assets/logoNavbar.png"; // Import the third logo if needed

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      navigate('/login');
    }, 2000);
  };

  return (
    <>

    {/* Header */}
         <AppBar position="fixed" sx={{ bgcolor: "#0A2540", boxShadow: "none" }}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img src={logo3} alt="Logo" style={{ width: 80 }} />
            <Typography variant="h6" sx={{ ml: 2, fontWeight: "bold", color: "#fff" }}>
              CV Scanner
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
    <Box
      sx={{
          minHeight: "calc(100vh - 64px)",
        mt: 10,
        bgcolor: '#181c2f',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 3,
          borderRadius: 4,
          width: '100%',
          maxWidth: 420,
            bgcolor: "#1e2539",
             background: "linear-gradient(145deg, #1e2539, #2a314b)",
             boxShadow: "0px 8px 20px rgba(0,0,0,0.4)",
        }}
      >
         <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            background: "linear-gradient(to right, #6ddf6d, #b0e0ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Reset Password
        </Typography>
        <Typography
          align="center"
          sx={{ color: '#e0e0e0', mb: 3, fontSize: '1rem' }}
        >
          Enter your company email to receive a reset link
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Company Email"
            type="email"
            fullWidth
            required
            variant="filled"
            value={email}
            onChange={e => setEmail(e.target.value)}
            InputProps={{
              sx: {
                bgcolor: '#232a3b',
                color: '#fff',
                borderRadius: 2,
                input: { color: '#fff' },
              },
            }}
            InputLabelProps={{
              sx: { color: '#b0b8c1' },
            }}
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={sent}
            sx={{
              py: 1.5,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
              color: '#fff',
              boxShadow: 'none',
              mb: 2,
              '&:hover': {
                background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)',
                boxShadow: 'none',
              },
            }}
          >
            {sent ? 'Link Sent!' : 'Send Reset Link'}
          </Button>
        </Box>
        <Typography align="center">
          <Link to="/login" style={{ color: '#b0e0ff', textDecoration: 'underline', fontSize: '1rem' }}>
            Back to Login
          </Link>
        </Typography>
      </Paper>
    </Box>
    </>
  );
}