import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { RepositorySelector } from './pages/RepositorySelector';
import { DocumentBrowser } from './pages/DocumentBrowser';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/repositories" element={<RepositorySelector />} />
        <Route path="/repositories/:owner/:repo" element={<DocumentBrowser />} />
        {/* Legacy PoC route - will be replaced in future stories */}
        <Route path="/doc/:documentId" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
