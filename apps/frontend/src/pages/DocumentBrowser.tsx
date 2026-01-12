import { useParams, useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function DocumentBrowser() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  const handleBackToRepositories = () => {
    navigate('/repositories');
  };

  const handleLogout = () => {
    fetch(`${API_URL}/auth/logout`, {
      credentials: 'include',
    })
      .then(() => {
        navigate('/login');
      })
      .catch((err) => {
        console.error('Failed to logout:', err);
      });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#c9d1d9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <header style={{
        padding: '1rem 2rem',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleBackToRepositories}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ← Back to Repositories
          </button>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            {owner}/{repo}
          </h1>
        </div>

        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#21262d',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#8b949e',
          backgroundColor: '#161b22',
          borderRadius: '6px',
          border: '1px solid #30363d',
        }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Document Browser
          </p>
          <p style={{ fontSize: '0.9rem' }}>
            This page will be implemented in US-MVP-001B
          </p>
        </div>
      </main>
    </div>
  );
}
