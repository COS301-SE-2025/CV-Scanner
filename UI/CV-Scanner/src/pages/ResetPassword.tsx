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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: '#3a7ca5',
          color: '#fff',
          px: 2,
          py: 1,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }}
      >
    <Box sx={{
      display: "flex",
      alignItems: "center",
      backgroundColor: "#3a7ca5", // Same as navbar
      padding: "4px 8px",
      borderRadius: "4px",
        marginRight: 2,
        
    }}>
      <img
        src={logo}
        alt="Team Logo"
        style={{
        height: 50,
        width: "auto",
        imageRendering: 'crisp-edges', // or 'crisp-edges'
     
      }}
      />
    </Box>
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