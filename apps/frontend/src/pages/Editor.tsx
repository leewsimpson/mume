import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EditorLayout } from '../components/EditorLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface EditorParams {
  owner: string;
  repo: string;
  '*': string; // Wildcard for file path
}

export function Editor() {
  const { owner, repo, '*': filePath } = useParams<keyof EditorParams>() as EditorParams;
  const navigate = useNavigate();
  const [content, setContent] = useState<string | null>(null);
  const [sha, setSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Anonymous');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [githubId, setGithubId] = useState<string>('');
  const [userId, setUserId] = useState<number | undefined>(undefined);

  // Fetch user info
  useEffect(() => {
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
        setUserName(data.username || data.githubId || 'Anonymous');
        setAvatarUrl(data.avatarUrl || '');
        setGithubId(data.githubId || '');
        setUserId(data.id);
      })
      .catch((err) => {
        console.error('Failed to fetch user info:', err);
        // Redirect to login if not authenticated
        navigate('/login');
      });
  }, [navigate]);

  // Fetch file content from backend
  useEffect(() => {
    if (!owner || !repo || !filePath) {
      setError('Invalid route parameters');
      setLoading(false);
      return;
    }

    const fetchFileContent = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${API_URL}/api/repositories/${owner}/${repo}/files/${filePath}`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login');
            return;
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch file content');
        }

        const data = await response.json();
        setContent(data.content);
        setSha(data.sha);

        // Register document for automatic GitHub syncing
        const documentId = `${owner}/${repo}/${filePath}`;
        try {
          await fetch(`${API_URL}/api/repositories/${owner}/${repo}/documents/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              filePath,
              sha: data.sha,
              documentId,
              userName,
            }),
          });
        } catch (regError) {
          console.error('Failed to register document for sync:', regError);
          // Non-fatal error - document will still load, just won't auto-save
        }
      } catch (err) {
        console.error('Error fetching file content:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [owner, repo, filePath, navigate, userName]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', color: '#c9d1d9' }}>
        <h2>Loading document...</h2>
        <p>Fetching content from GitHub...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#c9d1d9' }}>
        <h2>Error loading document</h2>
        <p style={{ color: '#f85149' }}>{error}</p>
        <button
          onClick={() => navigate(`/repositories/${owner}/${repo}`)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#21262d',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '1rem',
          }}
        >
          Back to Document Browser
        </button>
      </div>
    );
  }

  if (!content || !sha) {
    return (
      <div style={{ padding: '2rem', color: '#c9d1d9' }}>
        <h2>No content loaded</h2>
        <p>Unable to load file content from GitHub.</p>
      </div>
    );
  }

  // Create document ID from repository and file path for Yjs room
  const documentId = `${owner}/${repo}/${filePath}`;

  return (
    <EditorLayout
      userName={userName}
      documentId={documentId}
      initialContent={content}
      fileSha={sha}
      owner={owner}
      repo={repo}
      filePath={filePath}
      avatarUrl={avatarUrl}
      githubId={githubId}
      userId={userId}
    />
  );
}
