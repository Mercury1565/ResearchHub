import { Routes, Route, Navigate } from 'react-router-dom';
import Workspace from './components/layout/Workspace';

export default function App() {
  return (
    <Routes>
      <Route path="/projects/:projectId/documents/:documentId" element={<Workspace />} />
      <Route path="/projects/:projectId" element={<Workspace />} />
      <Route path="/" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
