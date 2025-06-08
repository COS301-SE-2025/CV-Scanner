import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

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
<Box
  sx={{
    display: "flex",
    alignItems: "center",
    bgcolor: "#3a7ca5",
    color: "#fff",
    px: 2,
    py: 2,
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
    position: "relative",
    overflow: "hidden",
    height: 80
  }}
>
  {/* Logo in left corner */}
  <Box 
    sx={{
      position: "absolute",
      left: 20,
      zIndex: 2,
      "&:hover": {
        transform: "rotate(-5deg)",
        transition: "transform 0.3s ease"
      }
    }}
  >
    <img 
      src={logo} 
      alt="Quantum Stack Logo" 
      style={{ 
        width: 75,
        height: "auto",
        filter: "none" // Removed shadow
      }} 
    />
  </Box>

  {/* Sliding Text Container - full width */}
  <Box 
    sx={{
      position: "absolute",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      left: 0,
      overflow: "hidden"
    }}
  >
    <Typography
      variant="h4"
      sx={{
        fontWeight: 800,
        letterSpacing: 4,
        textTransform: "uppercase",
        fontFamily: "'Orbitron', sans-serif",
        background: "linear-gradient(to right, #fff, #d1faff)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        whiteSpace: "nowrap",
        position: "absolute",
        left: "100%", // Start off-screen right
        animation: "slideText 20s linear infinite",
        "@keyframes slideText": {
          "0%": { 
            transform: "translateX(0)",
            left: "100%" 
          },
          "10%": { 
            left: "100%",
            transform: "translateX(0)" 
          },
          "100%": { 
            left: "0%",
            transform: "translateX(-100%)" 
          }
        }
      }}
    >
      QUANTUM STACK
    </Typography>
  </Box>

  {/* Subtle background shine animation */}
  <Box sx={{
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
    animation: "shine 15s infinite linear",
    "@keyframes shine": {
      "0%": { transform: "translateX(-100%)" },
      "100%": { transform: "translateX(100%)" }
    }
  }}/>
</Box>

      {/* Main Content */}
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#181c2f',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 4,
          borderRadius: 4,
          width: '100%',
          maxWidth: 350,
          background: 'linear-gradient(135deg, #171058 0%, #487DA6 100%)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}
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