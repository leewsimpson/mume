import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { RepositorySelector } from './pages/RepositorySelector';
import { DocumentBrowser } from './pages/DocumentBrowser';
import { Editor } from './pages/Editor';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/repositories" 
            element={
              <ProtectedRoute>
                <RepositorySelector />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/repositories/:owner/:repo" 
            element={
              <ProtectedRoute>
                <DocumentBrowser />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/repositories/:owner/:repo/edit/*" 
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            } 
          />
          {/* Legacy PoC route - will be replaced in future stories */}
          <Route path="/doc/:documentId" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
