import { Box, Typography, Paper, Button, List, ListItem, ListItemText , TableContainer, Table,TableHead,TableRow, TableCell, TableBody,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import EntelectLogo from '../assets/logo.png'; 
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';



export default function CandidatesDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Candidates Dashboard';
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181c2f', color: '#fff' }}>

      {/* Sidebar */}
    <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
    <img src={EntelectLogo} alt="Entelect Logo" style={{ width: 120 }} />
  </Box>
  <Button fullWidth sx={navButtonStyle} startIcon={<DashboardIcon />}>Dashboard</Button>
  <Button fullWidth sx={navButtonStyle} startIcon={<UploadFileIcon />}>Upload CV</Button>
  <Button fullWidth sx={navButtonStyle} startIcon={<PeopleIcon />}>Candidates</Button>
  <Button fullWidth sx={navButtonStyle} startIcon={<SearchIcon />}>Search</Button>
  <Box sx={{ flexGrow: 1 }} />
  <Button fullWidth sx={navButtonStyle} startIcon={<SettingsIcon />}>Settings</Button>
</Box>

      {/* Main Dashboard */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
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
          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem'  }}>Candidate</TableCell>
          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem'  }}>Top Skills</TableCell>
          <TableCell sx={{ fontWeight: 'bold' , fontSize: '1.2rem' }}>Project Fit</TableCell>
          <TableCell sx={{ fontWeight: 'bold', fontSize: '1.2rem'  }}>Actions</TableCell>
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
</Paper>

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
