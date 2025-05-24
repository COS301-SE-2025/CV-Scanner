import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Paper, Alert, MenuItem } from '@mui/material';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Mock validation
    setTimeout(() => {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
      } else if (!formData.email || !formData.name) {
        setError('Please fill all fields');
      } else {
        console.log('Mock registration:', formData);
        navigate('/login');
      }
      setLoading(false);
    }, 1000);
  };

  return (
    <Box sx={{ 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      bgcolor: '#181c2f'
    }}>
      <Paper elevation={8} sx={{ 
        p: 4, 
        width: '100%', 
        maxWidth: 400,
        borderRadius: 4,
        background: 'linear-gradient(135deg, #171058 0%, #487DA6 100%)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
      }}>
        <Typography variant="h5" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
          Create Account
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            label="Full Name"
            name="name"
            fullWidth
            margin="normal"
            value={formData.name}
            onChange={handleChange}
            required
            variant="filled"
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
          />
          
          <TextField
            label="Email"
            type="email"
            name="email"
            fullWidth
            margin="normal"
            value={formData.email}
            onChange={handleChange}
            required
            variant="filled"
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
          />
        <TextField
            select
            label="Role"
            name="role"
            fullWidth
            margin="normal"
            value={formData.role}
            onChange={handleChange}
            required
            variant="filled"
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
          >
            <MenuItem value="">Select a role</MenuItem>
            <MenuItem value="Uploader">Uploader</MenuItem>
            <MenuItem value="Editor">Editor</MenuItem>
            <MenuItem value="Admin">Admin</MenuItem>
          </TextField>
          <TextField
            label="Password"
            type="password"
            name="password"
            fullWidth
            margin="normal"
            value={formData.password}
            onChange={handleChange}
            required
            variant="filled"
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
          />
          
          <TextField
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            fullWidth
            margin="normal"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            variant="filled"
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
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              mt: 3, mb: 2, py: 1.5,
              fontWeight: 'bold',
              fontSize: '1.1rem',
              background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
              color: '#fff',
              boxShadow: 'none',
              '&:hover': {
                background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)',
                boxShadow: 'none',
              },
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
          
          <Typography align="center" color='#fff' sx={{ mt: 2 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ textDecoration: 'underline', color: '#b0e0ff', fontWeight: 'bold' }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}