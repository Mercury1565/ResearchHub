import { Routes, Route, Navigate } from 'react-router-dom';
import Workspace from './components/layout/Workspace';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import { useAuthStore } from './store/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/projects/:projectId/documents/:documentId"
        element={<RequireAuth><Workspace /></RequireAuth>}
      />
      <Route
        path="/projects/:projectId"
        element={<RequireAuth><Workspace /></RequireAuth>}
      />
      <Route
        path="/"
        element={<RequireAuth><Workspace /></RequireAuth>}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
