import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import CandidatesDashboard  from './pages/CandidatesDashboard';
import UploadCVPage  from './pages/UploadCVPage';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<CandidatesDashboard />} />
          <Route path="/upload" element={<UploadCVPage />} />
       <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;