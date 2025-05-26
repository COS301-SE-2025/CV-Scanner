import {
  Box,
  Typography,
  Paper,
  Button,
  InputBase,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Avatar,
  Chip,
  Divider,
  AppBar,
  Toolbar,
  IconButton,
  Badge,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import DashboardIcon from '@mui/icons-material/Dashboard';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
//import EntelectLogo from '../assets/logo.png';

export default function Search() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Search Candidates';
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#181c2f', color: '#fff' }}>
      {/* Sidebar */}
      <Box sx={{ width: 220, bgcolor: '#5a88ad', display: 'flex', flexDirection: 'column', p: 2 }}>
       {/* <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img src={EntelectLogo} alt="Entelect Logo" style={{ width: 120 }} />
        </Box>*/}
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
          <Paper elevation={6} sx={{ p: 3, borderRadius: 3, backgroundColor: '#bce4ff' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#0073c1', mb: 3 }}>
              Search Candidates
            </Typography>

            {/* Search Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, bgcolor: '#fff', borderRadius: 1, px: 2, py: 1 }}>
              <SearchIcon color="action" />
              <InputBase 
                placeholder="Search by name, skills, or project type..." 
                sx={{ ml: 1, flex: 1 }}
                fullWidth
              />
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 6, mb: 4 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Primary Skills</Typography>
                <FormGroup>
                  {['.NET', 'Java', 'React', 'Azure'].map((skill) => (
                    <FormControlLabel 
                      key={skill} 
                      control={<Checkbox sx={{ color: '#0073c1', '&.Mui-checked': { color: '#0073c1' } }} />} 
                      label={skill} 
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Project Fit</Typography>
                <FormGroup>
                  {['Technical', 'Collaborative', 'Business'].map((fit) => (
                    <FormControlLabel 
                      key={fit} 
                      control={<Checkbox sx={{ color: '#0073c1', '&.Mui-checked': { color: '#0073c1' } }} />} 
                      label={fit} 
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Upload Details</Typography>
                <FormGroup>
                  {['My Uploads', 'Last 7 Days'].map((detail) => (
                    <FormControlLabel 
                      key={detail} 
                      control={<Checkbox sx={{ color: '#0073c1', '&.Mui-checked': { color: '#0073c1' } }} />} 
                      label={detail} 
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Results Count */}
            <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 'bold' }}>
              Showing 8 of 142 candidates
            </Typography>

            {/* Candidate Results */}
            {[
              {
                name: 'Jane Smith',
                skills: ['.NET', 'Azure', 'SQL'],
                project: '.NET Aam S2L CD',
                uploaded: '2 days ago',
                match: '99% technical',
                initials: 'JS'
              },
              {
                name: 'Mike Johnson',
                skills: ['React', 'Node.js', 'JavaScript'],
                project: 'Sarah Khabad (Amberly)',
                uploaded: '1 week ago',
                match: '95% collaborative',
                initials: 'MJ'
              }
            ].map((candidate, idx) => (
              <Paper key={idx} elevation={3} sx={{ p: 3, mb: 3, borderRadius: 3, backgroundColor: '#e1f4ff' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                  <Avatar sx={{ bgcolor: '#0073c1', width: 56, height: 56, fontSize: '1.5rem' }}>
                    {candidate.initials}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>{candidate.name}</Typography>
                    <Typography variant="body1" sx={{ mb: 1 }}>{candidate.project}</Typography>
                    <Typography variant="body2" sx={{ mb: 1.5, color: '#555' }}>
                      Uploaded: {candidate.uploaded}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                      {candidate.skills.map((skill, i) => (
                        <Chip key={i} label={skill} size="small" sx={{ backgroundColor: '#d0e8ff' }} />
                      ))}
                    </Box>
                    <Typography variant="body2" sx={{ color: '#0073c1', fontWeight: 'bold' }}>
                      Match: {candidate.match}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
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