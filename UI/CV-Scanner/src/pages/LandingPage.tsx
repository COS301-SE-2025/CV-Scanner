import { Box, Typography, Button, AppBar, Toolbar, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo2 from '../assets/logo2.png';
import logo from '../assets/logo.png';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#181c2f', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      
        {/* Top App Bar */}
        <AppBar position="static" sx={{ bgcolor: '#1A82AE', boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="Logo" style={{ width: 100 }} />
            <Typography variant="h6" sx={{ ml: 2, fontWeight: 'bold' }}>
              CV Scanner
               </Typography>
          </Box>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Login
          </Button>
        </Toolbar>
      </AppBar>

     {/* Main Section */}
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Box sx={{ maxWidth: 600, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 3, color: '#e1f4ff' }}>
            Welcome to CV Scanner
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, color: '#bce4ff' }}>
            Effortlessly upload, filter, and match candidate CVs with our intelligent scanning system.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, color: '#fff' }}>
            Don't have an account?
          </Typography>
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/register')}
            sx={{
              background: 'linear-gradient(90deg, #232a3b 0%, #6ddf6d 100%)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              borderRadius: 2,
              '&:hover': {
                background: 'linear-gradient(90deg, #232a3b 0%, #4bb34b 100%)',
              },
            }}
          >
            Register
          </Button>
        </Box>
      </Box>

         {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#1A82AE', color: '#fff' }}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Quantum Stack CV Scanner. All rights reserved.</Typography>
      </Box>
    </Box>

  );
}