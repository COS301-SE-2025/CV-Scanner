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
  AppBar,
  Toolbar,
  IconButton,
  Badge
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import logo2 from '../assets/logo2.png';

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
      <Box sx={{
           display: "flex",
           alignItems: "center",
           backgroundColor: "#5a88ad", // Same as navbar
           padding: "4px 8px",
           borderRadius: "4px",
             marginRight: 2,
             
         }}>
           <img
             src={logo2}
             alt="Team Logo"
             style={{
             height: 50,
             width: "auto",
             imageRendering: 'crisp-edges', // or 'crisp-edges'
          
           }}
           />
         </Box>
        <Button fullWidth sx={navButtonStyle} startIcon={<DashboardIcon />} onClick={() => navigate('/dashboard')}>
  Dashboard
</Button>
<Button fullWidth sx={navButtonStyle} startIcon={<UploadFileIcon />} onClick={() => navigate('/upload')}>
  Upload CV
</Button>
<Button fullWidth sx={navButtonStyle} startIcon={<PeopleIcon />} onClick={() => navigate('/candidates')}>
  Candidates
</Button>
<Button fullWidth sx={navButtonStyle} startIcon={<SearchIcon />} onClick={() => navigate('/search')}>
  Search
</Button>

      </Box>

      {/* Main Content with Top Bar */}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {/* Top App Bar */}
        <AppBar position="static" sx={{ bgcolor: '#5a88ad', boxShadow: 'none' }}>
          <Toolbar sx={{ justifyContent: 'flex-end' }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <AccountCircleIcon sx={{ mr: 1 }} />
              <Typography variant="subtitle1">Admin User</Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ p: 3 }}>
          <Paper elevation={6} sx={{ p: 3, borderRadius: 3, backgroundColor: '#d0f0ff' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0073c1', mb: 2 }}>
              Candidate Directory
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search by name, skills, or project type..."
                variant="outlined"
                size="small"
                sx={{ backgroundColor: '#fff', borderRadius: 1 }}
              />
              <Button variant="contained" sx={{ backgroundColor: '#4cb0ff', color: '#fff' }}>Search</Button>
              <Button variant="contained" sx={{ backgroundColor: '#d0d0d0', color: '#000' }}>Filter</Button>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><b>Candidate</b></TableCell>
                    <TableCell><b>Top Skills</b></TableCell>
                    <TableCell><b>Experience</b></TableCell>
                    <TableCell><b>Project Fits</b></TableCell>
                    <TableCell><b>Actions</b></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {candidates.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.skills}</TableCell>
                      <TableCell>{c.experience}</TableCell>
                      <TableCell>{c.fit}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={reviewButtonStyle}
                          onClick={() => navigate('/review')}
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination count={3} page={1} siblingCount={1} boundaryCount={1} />
            </Box>
          </Paper>
        </Box>
      </Box>
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