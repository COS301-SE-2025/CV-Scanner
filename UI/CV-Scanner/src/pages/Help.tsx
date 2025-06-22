import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, AppBar, Toolbar, IconButton, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import logo2 from '../assets/logo2.png';

export default function HelpPage() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: 'How do I upload a CV?',
      answer: 'Go to the Upload CV page, click on "Browse Files," select a PDF or Word document from your computer, and then click "Process CV." Ensure the file format is supported and meets size requirements.',
    },
    {
      question: 'What file formats are supported?',
      answer: 'You can upload CVs in PDF or Microsoft Word formats (.pdf, .doc, .docx).',
    },
    {
      question: 'How do I manage users?',
      answer: 'User management is restricted to administrators. Navigate to the User Management page to add, update, or remove users and assign roles.',
    },
    {
      question: 'Can I edit candidate information after upload?',
      answer: 'Yes. Navigate to the Candidates page, click the "Review" button next to a candidate, then naviagte to either "Skills" if you would like to add a new skill or "Recruiter Notes" if you want add additional informations. You can update skills by typing and clicking "ADD" or using the Recruiter Notes section to type then press "Save Notes".' ,
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#181c2f', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Top App Bar */}
      <AppBar position="static" sx={{ bgcolor: '#5a88ad', boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img src={logo2} alt="Logo" style={{ width: 100 }} />
            <Typography variant="h6" sx={{ ml: 2, fontWeight: 'bold' }}>CV Scanner Help</Typography>
          </Box>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      

      {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#5a88ad', color: '#fff' }}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Entelect CV Scanner Help Center</Typography>
      </Box>
    </Box>
  );
}