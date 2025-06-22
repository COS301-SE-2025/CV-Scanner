import { Box, Typography, Button, AppBar, Toolbar, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo2 from '../assets/logo2.png';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#181c2f', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      
     

         {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#5a88ad', color: '#fff' }}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Quantum Stack CV Scanner. All rights reserved.</Typography>
      </Box>
    </Box>

  );
}