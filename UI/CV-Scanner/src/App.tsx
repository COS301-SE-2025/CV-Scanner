import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy } from "react";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import CandidatesDashboard from "./pages/CandidatesDashboard";
import UploadCVPage from "./pages/UploadCVPage";
import CandidatesPage from "./pages/CandidatesPage";
import Search from "./pages/Search";
import CandidateReviewSummary from "./pages/CandidateReviewSummary";
import CandidateSkillsPage from "./pages/CandidateSkillsPage";
import CandidateExperiencePage from "./pages/CandidateExperiencePage";
import CandidateNotesPage from "./pages/CandidateNotesPage";
import UserManagementPage from "./pages/UserManagementPage";
import Settings from "./pages/Settings";
import AddUserPage from "./pages/AddUserPage";
import LandingPage from "./pages/LandingPage";
import Help from "./pages/Help";
import SystemSettingsPage from "./pages/SystemSettings";
import ParsedCVData from "./pages/ParsedCVData";
import BrandLoading from "./components/BrandLoading";
import { BrandLoaderProvider, useBrandLoader } from "./hooks/brandLoader";
import CompareCandidates from "./pages/CompareCandidates";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./lib/ProtectedRoute";

function BrandLoaderOverlay() {
  const loader = useBrandLoader();
  return loader.open ? <BrandLoading /> : null;
}

function App() {
  return (
    <BrandLoaderProvider>
      <BrandLoaderOverlay />
      <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<BrandLoading />}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes - wrap each with ProtectedRoute */}
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
                    <UploadCVPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidates"
                element={
                  <ProtectedRoute>
                    <CandidatesPage />
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
                path="/candidate/:id/summary"
                element={
                  <ProtectedRoute>
                    <CandidateReviewSummary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/:id/skills"
                element={
                  <ProtectedRoute>
                    <CandidateSkillsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/:id/experience"
                element={
                  <ProtectedRoute>
                    <CandidateExperiencePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/candidate/:id/notes"
                element={
                  <ProtectedRoute>
                    <CandidateNotesPage />
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
                path="/system-settings"
                element={
                  <ProtectedRoute>
                    <SystemSettingsPage />
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
                path="/user-management"
                element={
                  <ProtectedRoute>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/add-user"
                element={
                  <ProtectedRoute>
                    <AddUserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/parsed-cv"
                element={
                  <ProtectedRoute>
                    <ParsedCVData />
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

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </BrandLoaderProvider>
  );
}

export default App;
