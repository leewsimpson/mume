import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: number;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}

export function RepositorySelector() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch current user
    fetch(`${API_URL}/auth/user`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Not authenticated');
        }
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err);
        setError('Failed to authenticate. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [navigate]);

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

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: '#f85149',
      }}>
        <p>{error}</p>
      </div>
    );
  }

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
          Select Repository
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.username}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
              }}
            />
          )}
          <span>{user?.username}</span>
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
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        <p style={{ color: '#8b949e' }}>
          Repository selection will be implemented in US-MVP-001A
        </p>
      </main>
    </div>
  );
}
