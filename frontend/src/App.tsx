import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes — RequireAuth redirects to /login if unauthenticated */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
      </Route>

      {/* Catch-all: redirect unknown paths to home (which will gate via RequireAuth) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
