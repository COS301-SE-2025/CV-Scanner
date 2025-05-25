import { Box, Typography, Paper, Button, List, ListItem, ListItemText } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function CandidatesDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Candidates Dashboard';
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181c2f', color: '#fff' }}>

      {/* Sidebar */}
      <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
        <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold', mb: 2 }}>entelect</Typography>
        <Button fullWidth sx={navButtonStyle}>Dashboard</Button>
        <Button fullWidth sx={navButtonStyle}>Upload CV</Button>
        <Button fullWidth sx={navButtonStyle}>Candidates</Button>
        <Button fullWidth sx={navButtonStyle}>Search</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button fullWidth sx={navButtonStyle}>Settings</Button>
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
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#0073c1', mb: 2 }}>Recently Processed</Typography>

          <List disablePadding>
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
              <ListItem
                key={idx}
                divider
                sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <ListItemText
                  primary={candidate.name}
                  secondary={`Top Skills: ${candidate.skills} | Project Fit: ${candidate.fit}`}
                  primaryTypographyProps={{ sx: { fontWeight: 'bold', color: '#000' } }}
                  secondaryTypographyProps={{ sx: { color: '#000' } }}
                />
                <Button variant="contained" sx={reviewButtonStyle} onClick={() => navigate('/review')}>Review</Button>
              </ListItem>
            ))}
          </List>
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
  backgroundColor: '#2f2f6e',
  color: '#b3ff00',
  fontWeight: 'bold',
  '&:hover': {
    backgroundColor: '#1f1f5a',
  },
};
