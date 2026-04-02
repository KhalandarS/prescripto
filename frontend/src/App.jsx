import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RecordingSession from './components/session/RecordingSession';

function App() {
  return (
    <Router>
      <Routes>
        {/* consultation session as the primary entry point */}
        <Route path="/" element={<RecordingSession />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
