import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import CandidatesDashboard  from './pages/CandidatesDashboard';
import UploadCVPage  from './pages/UploadCVPage';
import CandidatesPage from './pages/CandidatesPage';
import Search from './pages/Search';
import CandidateReviewSummary from './pages/CandidateReviewSummary';
import CandidateSkillsPage from './pages/CandidateSkillsPage';
import CandidateExperiencePage from './pages/CandidateExperiencePage';
import CandidateNotesPage from './pages/CandidateNotesPage';
import UserManagementPage from './pages/UserManagementPage';
import Settings from './pages/Settings';
import AddUserPage from './pages/AddUserPage';
import LandingPage from './pages/LandingPage';
import Help from './pages/Help';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<CandidatesDashboard />} />
          <Route path="/upload" element={<UploadCVPage />} />
           <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/search" element={<Search />} />
            <Route path="/candidate-review" element={<CandidateReviewSummary />} />
            <Route path="/candidate-skills" element={<CandidateSkillsPage />} />
            <Route path="/candidate-experience" element={<CandidateExperiencePage />} />
            <Route path="/candidate-notes" element={<CandidateNotesPage />} />
            <Route path="/user-management" element={<UserManagementPage />} />
             <Route path="/settings" element={<Settings />} />
             <Route path="/add-user" element={<AddUserPage />} />
             <Route path="/landing-page" element={<LandingPage />} />
             <Route path="/help" element={<Help />} />
       <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;