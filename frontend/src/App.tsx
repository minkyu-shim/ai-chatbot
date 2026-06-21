import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DiaryPage from './pages/DiaryPage';
import NewEntryPage from './pages/NewEntryPage';
import EntryDetailPage from './pages/EntryDetailPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes — RequireAuth redirects to /login if unauthenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/diary/new" element={<NewEntryPage />} />
        <Route path="/diary/:id" element={<EntryDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Catch-all: redirect unknown paths to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
