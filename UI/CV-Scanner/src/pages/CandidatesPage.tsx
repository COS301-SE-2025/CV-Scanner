import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Pagination,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import EntelectLogo from '../assets/logo.png';

export default function CandidatesPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Candidates';
  }, []);

  const candidates = [
    { name: 'Jane Smith', skills: '.NET, Azure, SQL', experience: '5 Years', fit: 'Technical (92%)' },
    { name: 'Mike Johnson', skills: 'React, Node.js', experience: '3 Years', fit: 'Collaborative (85%)' },
    { name: 'Peter Griffin', skills: 'C++, C, Python', experience: '4 Years', fit: 'Technical (64%)' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181c2f', color: '#fff' }}>
      {/* Sidebar */}
      <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src={EntelectLogo} alt="Entelect Logo" style={{ width: 120 }} />
        </Box>
        <Button fullWidth sx={navButtonStyle} startIcon={<DashboardIcon />} onClick={() => navigate('/')}>Dashboard</Button>
        <Button fullWidth sx={navButtonStyle} startIcon={<UploadFileIcon />} onClick={() => navigate('/upload')}>Upload CV</Button>
        <Button fullWidth sx={{ ...navButtonStyle, bgcolor: '#d8f0ff', color: '#000' }} startIcon={<PeopleIcon />}>Candidates</Button>
        <Button fullWidth sx={navButtonStyle} startIcon={<SearchIcon />}>Search</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button fullWidth sx={navButtonStyle} startIcon={<SettingsIcon />}>Settings</Button>
      </Box>

      {/* Main Content */}
      
    </Box>
  );
}

const navButtonStyle = {
  justifyContent: 'flex-start',
  mb: 1,
  color: '#fff',
  backgroundColor: 'transparent',
  '&:hover': {
    backgroundColor: '#487DA6',
  },
  textTransform: 'none',
  fontWeight: 'bold',
};

const reviewButtonStyle = {
  background: 'linear-gradient(45deg, #0a1172 0%, #00b300 100%)',
  color: 'white',
  fontWeight: 'bold',
  padding: '6px 16px',
  borderRadius: '4px',
  textTransform: 'none',
  '&:hover': {
    background: 'linear-gradient(45deg, #081158 0%, #009a00 100%)',
  },
};
