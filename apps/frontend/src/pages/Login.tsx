import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function Login() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Sign In - Markdown Editor';
    
    // Check for error in URL query params
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    if (errorParam) {
      setError(getErrorMessage(errorParam));
    }
  }, []);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'access_denied':
        return 'Authentication was denied. Please try again.';
      case 'server_error':
        return 'An error occurred during authentication.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const handleGitHubLogin = () => {
    // Redirect to GitHub OAuth
    window.location.href = `${API_URL}/auth/github`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0d1117',
      color: '#c9d1d9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        padding: '2rem',
      }}>
        <h1 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          fontWeight: 600,
        }}>
          Sign In
        </h1>

        {error && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            backgroundColor: '#f85149',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        <p style={{
          color: '#8b949e',
          marginBottom: '2rem',
          lineHeight: '1.5',
        }}>
          Collaborate in real-time on markdown documents backed by GitHub repositories.
        </p>

        <button
          onClick={handleGitHubLogin}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: '100%',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#238636',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2ea043';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#238636';
          }}
        >
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign in with GitHub
        </button>

        <p style={{
          marginTop: '2rem',
          fontSize: '0.875rem',
          color: '#6e7681',
        }}>
          By signing in, you agree to grant access to your GitHub repositories for collaborative editing.
        </p>
      </div>
    </div>
  );
}
