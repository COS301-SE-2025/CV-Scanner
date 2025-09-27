import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, AppBar, Toolbar, IconButton, Button, TextField, Paper } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import logo2 from '../assets/logo2.png';
import logo from '../assets/logo.png';
import { useState } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import logoNavbar from "../assets/logoNavbar.png";


export default function HelpPage() {
  const navigate = useNavigate();
    const [search, setSearch] = useState('');


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

const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
  );


  return (
    <Box sx={{ minHeight: '100vh', bgcolor: "#1E1E1E", color: '#fff', display: 'flex', flexDirection: 'column' }}>
          {/* Top App Bar */}
      <AppBar position="static" sx={{ bgcolor: '#232A3B', boxShadow: 'none' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
             <img src={logoNavbar} alt="Logo" style={{ width: 80 }} />
             <Typography variant="h6" sx={{fontFamily: 'Helvetica, sans-serif', ml: 2, fontWeight: 'bold' }}>
                            CV Scanner Help
                          </Typography>
          </Box>
          
        </Toolbar>
      </AppBar>

      {/* FAQ Section */}
      <Box sx={{ p: 4, flexGrow: 1 }}>
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/dashboard")}
                    sx={{
                      mb: 2,
                      color: "#0073c1",
                      fontWeight: "bold",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "rgba(0, 115, 193, 0.1)",
                      },
                    }}
                  >
                    Back to Dashboard
                  </Button>
         <Typography variant="h5" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: "bold", mb: 3}}>
          Frequently Asked Questions
        </Typography>

          <TextField
           fullWidth
          variant="outlined"
          placeholder="Ask a question..."
          size="medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 4, bgcolor: "#d1dbe5ff", borderRadius: 1 }}
        />

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => (
            <Accordion key={index} sx={{ mb: 2, bgcolor: '#e1f4ff', color: '#000', borderRadius: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Helvetica, sans-serif',fontWeight: 'bold' }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1">{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))
        ) : (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#fefefe', borderRadius: 1 }}>
            <Typography variant="body1" sx={{ color: '#000' }}>No results found for your question.</Typography>
             </Paper>
        )}
      </Box>
        <Button
        variant="contained"
        href="/User_Manual_V3.pdf"
        target="_blank"
        rel="noopener noreferrer"
        >
          View Help Guide (PDF)
        </Button>

      {/* Footer */}
      <Box sx={{ textAlign: 'center', py: 2, bgcolor: '#232A3B', color: '#fff' }}>
        <Typography variant="body2">&copy; {new Date().getFullYear()} Entelect CV Scanner Help Center</Typography>
      </Box>
    </Box>
  );
}