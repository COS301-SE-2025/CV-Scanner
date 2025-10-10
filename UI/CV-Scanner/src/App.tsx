import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./lib/ProtectedRoute";

// Import your pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/Login";
import CandidatesDashboard from "./pages/CandidatesDashboard";
import Upload from "./pages/UploadCVPage";
import CandidateList from "./pages/CandidatesPage";
import Search from "./pages/Search";
import CompareCandidates from "./pages/CompareCandidates";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import CandidateReviewSummary from "./pages/CandidateReviewSummary";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - no protection needed, handled by ProtectedRoute redirect */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes - require authentication */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <CandidatesDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidates"
          element={
            <ProtectedRoute>
              <CandidateList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          }
        />
        <Route
          path="/compare"
          element={
            <ProtectedRoute>
              <CompareCandidates />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <Help />
            </ProtectedRoute>
          }
        />
        <Route
          path="/candidate/:id/summary"
          element={
            <ProtectedRoute>
              <CandidateReviewSummary />
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
