import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RecordingSession from './components/session/RecordingSession';
import LoginPage from './components/auth/LoginPage';
import PharmacyDashboard from './components/pharmacy/PharmacyDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/" />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;
  
  return children;
};

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={
          user ? (
            user.role === 'doctor' ? <Navigate to="/doctor" /> : <Navigate to="/pharmacy" />
          ) : (
            <LoginPage />
          )
        } />

        {/* Private Doctor Routes */}
        <Route path="/doctor" element={
          <ProtectedRoute allowedRole="doctor">
            <RecordingSession />
          </ProtectedRoute>
        } />

        {/* Private Pharmacy Routes */}
        <Route path="/pharmacy" element={
          <ProtectedRoute allowedRole="pharmacist">
            <PharmacyDashboard />
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
