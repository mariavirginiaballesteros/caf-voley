import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSessionTracker } from './lib/useSessionTracker';
import Index from './pages/Index';
import Fixture from './pages/Fixture';
import Plantel from './pages/Plantel';
import Videos from './pages/Videos';
import Torneos from './pages/Torneos';
import Analisis from './pages/Analisis';
import Usuarios from './pages/Usuarios';
import Standings from './pages/Standings';
import AICoach from './pages/AICoach';
import Scout from './pages/Scout';
import MiPerfil from './pages/MiPerfil';
import Login from './pages/Login';
import History2025 from './pages/History2025';
import LoadingSpinner from './components/LoadingSpinner';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { session, role, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!session) return <Navigate to="/login" />;
  if (roles && role && !roles.includes(role)) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();
  useSessionTracker(user?.id);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      
      <Route path="/fixture" element={
        <ProtectedRoute>
          <Fixture />
        </ProtectedRoute>
      } />

      <Route path="/tabla" element={
        <ProtectedRoute>
          <Standings />
        </ProtectedRoute>
      } />
      
      <Route path="/plantel" element={
        <ProtectedRoute>
          <Plantel />
        </ProtectedRoute>
      } />
      
      <Route path="/videos" element={
        <ProtectedRoute>
          <Videos />
        </ProtectedRoute>
      } />
      
      <Route path="/torneos" element={
        <ProtectedRoute>
          <Torneos />
        </ProtectedRoute>
      } />
      
      <Route path="/analisis" element={
        <ProtectedRoute roles={['admin', 'dt', 'player']}>
          <Analisis />
        </ProtectedRoute>
      } />

      <Route path="/ai-coach" element={
        <ProtectedRoute>
          <AICoach />
        </ProtectedRoute>
      } />

      <Route path="/mi-perfil" element={
        <ProtectedRoute>
          <MiPerfil />
        </ProtectedRoute>
      } />

      <Route path="/scout" element={
        <ProtectedRoute roles={['admin', 'dt', 'player']}>
          <Scout />
        </ProtectedRoute>
      } />

      <Route path="/usuarios" element={
        <ProtectedRoute roles={['admin']}>
          <Usuarios />
        </ProtectedRoute>
      } />

      <Route path="/history-2025" element={
        <ProtectedRoute>
          <History2025 />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="bottom-right" toastOptions={{
          style: { background: '#1a1a1a', color: '#fff', border: '1px solid #333' },
        }} />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;