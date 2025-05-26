import { Box, Typography, Paper, Button, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, AppBar, Toolbar, IconButton, Badge } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import EntelectLogo from '../assets/logo.png'; 
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

export default function CandidatesDashboard() {

  useEffect(() => {
    document.title = 'Candidates Dashboard';
  }, []);

const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181c2f', color: '#fff' }}>

      {/* Sidebar */}
      <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
        {<Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
         <img src={EntelectLogo} alt="Entelect Logo" style={{ width: 120 }} />
        </Box>}
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

        {/* Dashboard Content */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>Candidates Dashboard</Typography>

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
            {[
              { label: 'Candidates', value: '142' },
              { label: 'Pending Review', value: '24' },
              { label: 'Top Technology', value: '.NET' },
              { label: 'Technical Matches', value: '78%' },
            ].map((stat, i) => (
              <Paper key={i} elevation={6} sx={statCardStyle}>
                <Typography variant="h4">{stat.value}</Typography>
                <Typography variant="subtitle1">{stat.label}</Typography>
              </Paper>
            ))}
          </Box>

          <Paper elevation={6} sx={{ p: 2, borderRadius: 3, backgroundColor: '#bce4ff' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0073c1', mb: 2 }}>
              Recently Processed
            </Typography>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Candidate</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Top Skills</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Project Fit</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    {
                      name: 'Jane Smith',
                      skills: '.NET, Azure, SQL',
                      fit: 'Technical (92%)',
                    },
                    {
                      name: 'Mike Johnson',
                      skills: 'React, Node.js',
                      fit: 'Collaborative (85%)',
                    },
                    {
                      name: 'Peter Griffin',
                      skills: 'C++, C, Python',
                      fit: 'Technical (64%)',
                    },
                  ].map((candidate, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{candidate.name}</TableCell>
                      <TableCell>{candidate.skills}</TableCell>
                      <TableCell>{candidate.fit}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          sx={reviewButtonStyle}
                          onClick={() => navigate('/candidate-review')}
                        >
                          Review
                        </Button>
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

const statCardStyle = {
  p: 2,
  minWidth: 140,
  borderRadius: 3,
  backgroundColor: '#e1f4ff',
  textAlign: 'center',
  color: '#000',
};

const reviewButtonStyle = {
  background: 'linear-gradient(45deg, #0a1172 0%, #032c3b 50%, #00b300 100%)',
  color: 'white',
  fontWeight: 'bold',
  padding: '8px 20px',
  borderRadius: '4px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  '&:hover': {
    background: 'linear-gradient(45deg, #081158 0%, #022028 50%, #009a00 100%)',
    transform: 'translateY(-1px)',
  },
  textTransform: 'none',
  transition: 'all 0.3s ease',
  position: 'relative',
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%)',
  }
};