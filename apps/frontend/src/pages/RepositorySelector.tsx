import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faSignOutAlt, faSearch, faBook, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface User {
  id: number;
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  updated_at: string;
}

export function RepositorySelector() {
  const [user, setUser] = useState<User | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
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
        setUser(data.user);
        setLoading(false);
        // Fetch repositories after user is loaded
        fetchRepositories();
      })
      .catch((err) => {
        console.error('Failed to fetch user:', err);
        setError('Failed to authenticate. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      });
  }, [navigate]);

  // Filter repositories based on search query
  useEffect(() => {
    const filtered = repositories.filter((repo) =>
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRepos(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, repositories]);

  const fetchRepositories = async () => {
    setReposLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/repositories`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await res.json();
      setRepositories(data);
      setFilteredRepos(data);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setError('Failed to load repositories. Please try again.');
    } finally {
      setReposLoading(false);
    }
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

  const handleSelectRepository = async (repo: Repository) => {
    // Store selected repository in session
    try {
      const res = await fetch(`${API_URL}/api/repositories/select`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: repo.owner.login,
          name: repo.name,
          fullName: repo.full_name,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to select repository');
      }

      // Store in localStorage as well for frontend state
      localStorage.setItem('selectedRepo', JSON.stringify({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
      }));

      // Navigate to document browser
      navigate(`/repositories/${repo.owner.login}/${repo.name}`);
    } catch (err) {
      console.error('Failed to select repository:', err);
      setError('Failed to select repository. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    if (diffDays < 30) return `Updated ${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `Updated ${Math.floor(diffDays / 30)} months ago`;
    return `Updated ${Math.floor(diffDays / 365)} years ago`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredRepos.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRepos = filteredRepos.slice(startIndex, endIndex);

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
      backgroundColor: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      fontFamily: 'var(--font-family)',
    }}>
      <header className="app-header">
        <div className="app-header__left">
          <FontAwesomeIcon icon={faBook} style={{ fontSize: '1.25rem', color: 'var(--color-text-link)' }} />
          <h1 className="app-header__title">
            Select Repository
          </h1>
        </div>

        <div className="app-header__right">
          <div className="user-menu">
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="user-avatar"
              />
            )}
            <span className="user-menu__name">{user?.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn--secondary"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Logout
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        {/* Search bar */}
        <div style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
          <FontAwesomeIcon 
            icon={faSearch} 
            style={{ 
              position: 'absolute', 
              left: 'var(--space-4)', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              fontSize: '0.875rem',
            }} 
          />
          <input
            type="text"
            placeholder="Search repositories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              paddingLeft: '2.5rem',
              backgroundColor: 'var(--color-bg-secondary)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              outline: 'none',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent-emphasis)';
              e.target.style.boxShadow = '0 0 0 3px rgba(31, 111, 235, 0.3)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border-default)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Loading state */}
        {reposLoading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#8b949e' }}>
            <p>Loading repositories...</p>
          </div>
        )}

        {/* Empty state */}
        {!reposLoading && filteredRepos.length === 0 && repositories.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#8b949e',
            backgroundColor: '#161b22',
            borderRadius: '6px',
            border: '1px solid #30363d',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No repositories found</p>
            <p style={{ fontSize: '0.9rem' }}>You don't have write access to any repositories.</p>
          </div>
        )}

        {/* No search results */}
        {!reposLoading && filteredRepos.length === 0 && repositories.length > 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#8b949e',
            backgroundColor: '#161b22',
            borderRadius: '6px',
            border: '1px solid #30363d',
          }}>
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No repositories match your search</p>
            <p style={{ fontSize: '0.9rem' }}>Try a different search term.</p>
          </div>
        )}

        {/* Repository list */}
        {!reposLoading && currentRepos.length > 0 && (
          <>
            <div style={{ marginBottom: '1rem', color: '#8b949e', fontSize: '0.9rem' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredRepos.length)} of {filteredRepos.length} repositories
            </div>

            <div data-testid="repository-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {currentRepos.map((repo) => (
                <div
                  key={repo.id}
                  data-testid="repository-item"
                  onClick={() => handleSelectRepository(repo)}
                  style={{
                    padding: '1.25rem',
                    backgroundColor: '#161b22',
                    border: '1px solid #30363d',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#1c2128';
                    e.currentTarget.style.borderColor = '#58a6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#161b22';
                    e.currentTarget.style.borderColor = '#30363d';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <img
                      src={repo.owner.avatar_url}
                      alt={`${repo.owner.login} avatar`}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <h3 style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: '#58a6ff',
                          margin: 0,
                        }}>
                          {repo.full_name}
                        </h3>
                        {repo.private && (
                          <span data-testid="private-indicator" style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.125rem 0.5rem',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border-default)',
                            borderRadius: 'var(--radius-full)',
                          }}>
                            <FontAwesomeIcon icon={faLock} style={{ fontSize: '0.625rem' }} />
                            Private
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <p style={{
                          margin: '0 0 0.5rem 0',
                          color: '#8b949e',
                          fontSize: '0.9rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {repo.description}
                        </p>
                      )}
                      <p style={{
                        margin: 0,
                        color: '#8b949e',
                        fontSize: '0.85rem',
                      }}>
                        {formatDate(repo.updated_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div data-testid="pagination" style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginTop: 'var(--space-6)',
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`btn ${currentPage === 1 ? 'btn--secondary' : 'btn--primary'}`}
                  style={{
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <FontAwesomeIcon icon={faChevronLeft} />
                  Previous
                </button>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', padding: '0 var(--space-2)' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`btn ${currentPage === totalPages ? 'btn--secondary' : 'btn--primary'}`}
                  style={{
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
