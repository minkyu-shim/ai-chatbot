import { Routes, Route, Navigate } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DiaryPage from './pages/DiaryPage';
import NewEntryPage from './pages/NewEntryPage';
import EntryDetailPage from './pages/EntryDetailPage';

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes — RequireAuth redirects to /login if unauthenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/diary" replace />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/diary/new" element={<NewEntryPage />} />
        <Route path="/diary/:id" element={<EntryDetailPage />} />
      </Route>

      {/* Catch-all: redirect unknown paths to diary */}
      <Route path="*" element={<Navigate to="/diary" replace />} />
    </Routes>
  );
}

export default App;
