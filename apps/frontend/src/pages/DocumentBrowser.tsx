import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface TreeItem {
  path?: string;
  mode?: string;
  type?: 'blob' | 'tree';
  sha?: string;
  size?: number;
  url?: string;
}

interface TreeResponse {
  sha: string;
  url: string;
  tree: TreeItem[];
  truncated: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  size?: number;
}

export function DocumentBrowser() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRepositoryTree();
  }, [owner, repo]);

  const fetchRepositoryTree = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/repositories/${owner}/${repo}/tree`, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Repository not found');
        }
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch repository tree');
      }

      const data: TreeResponse = await response.json();
      const treeStructure = buildTreeStructure(data.tree);
      setTree(treeStructure);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const buildTreeStructure = (items: TreeItem[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const folderMap = new Map<string, TreeNode>();

    // First pass: create all folder nodes
    items
      .filter((item) => item.type === 'tree' && item.path)
      .forEach((item) => {
        const path = item.path!;
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1] || path;

        const node: TreeNode = {
          name,
          path,
          type: 'folder',
          children: [],
        };

        folderMap.set(path, node);
      });

    // Second pass: create file nodes and organize hierarchy
    items
      .filter((item) => item.type === 'blob' && item.path?.endsWith('.md'))
      .forEach((item) => {
        const path = item.path!;
        const pathParts = path.split('/');
        const name = pathParts[pathParts.length - 1] || path;

        const fileNode: TreeNode = {
          name,
          path,
          type: 'file',
          size: item.size,
        };

        if (pathParts.length === 1) {
          // Root level file
          root.push(fileNode);
        } else {
          // File in a folder
          const parentPath = pathParts.slice(0, -1).join('/');
          const parent = folderMap.get(parentPath);
          if (parent) {
            parent.children!.push(fileNode);
          }
        }
      });

    // Third pass: organize folder hierarchy
    folderMap.forEach((node, path) => {
      const pathParts = path.split('/');
      if (pathParts.length === 1) {
        // Root level folder
        root.push(node);
      } else {
        // Nested folder
        const parentPath = pathParts.slice(0, -1).join('/');
        const parent = folderMap.get(parentPath);
        if (parent) {
          parent.children!.push(node);
        }
      }
    });

    // Sort: folders first, then files, alphabetically
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(root);
    return root;
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileClick = (path: string) => {
    navigate(`/repositories/${owner}/${repo}/edit/${encodeURIComponent(path)}`);
  };

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

  const renderTreeNode = (node: TreeNode, depth: number = 0): React.ReactElement => {
    const isExpanded = expandedFolders.has(node.path);
    const paddingLeft = `${depth * 1.5 + 0.5}rem`;

    if (node.type === 'folder') {
      return (
        <div key={node.path}>
          <div
            onClick={() => toggleFolder(node.path)}
            style={{
              padding: '0.5rem',
              paddingLeft,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#21262d';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#8b949e' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
            <span style={{ fontSize: '0.9rem' }}>📁</span>
            <span style={{ fontSize: '0.9rem', color: '#c9d1d9' }}>{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map((child) => renderTreeNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    return (
      <div
        key={node.path}
        onClick={() => handleFileClick(node.path)}
        style={{
          padding: '0.5rem',
          paddingLeft,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'transparent',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#21262d';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '0.8rem', color: '#8b949e', visibility: 'hidden' }}>▶</span>
        <span style={{ fontSize: '0.9rem' }}>📄</span>
        <span style={{ fontSize: '0.9rem', color: '#58a6ff' }}>{node.name}</span>
        {node.size !== undefined && (
          <span style={{ fontSize: '0.75rem', color: '#8b949e', marginLeft: 'auto' }}>
            {formatFileSize(node.size)}
          </span>
        )}
      </div>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}
    >
      <header
        style={{
          padding: '1rem 2rem',
          borderBottom: '1px solid #30363d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
              {owner}/{repo}
            </h1>
            <span style={{ color: '#8b949e', fontSize: '1rem' }}>/</span>
            <span style={{ color: '#8b949e', fontSize: '1rem' }}>Markdown Files</span>
          </div>
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

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem',
        }}
      >
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#8b949e',
            }}
          >
            <p>Loading repository files...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#3d1f1f',
              border: '1px solid #6e3030',
              borderRadius: '6px',
              color: '#f85149',
              marginBottom: '1rem',
            }}
          >
            <strong>Error:</strong> {error}
            <button
              onClick={fetchRepositoryTree}
              style={{
                marginLeft: '1rem',
                padding: '0.25rem 0.75rem',
                backgroundColor: '#21262d',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && tree.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#8b949e',
              backgroundColor: '#161b22',
              borderRadius: '6px',
              border: '1px solid #30363d',
            }}
          >
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              No markdown files found
            </p>
            <p style={{ fontSize: '0.9rem' }}>
              This repository doesn't contain any .md files yet.
            </p>
          </div>
        )}

        {!loading && !error && tree.length > 0 && (
          <div
            style={{
              backgroundColor: '#161b22',
              borderRadius: '6px',
              border: '1px solid #30363d',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1rem',
                borderBottom: '1px solid #30363d',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Files and Folders
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                {tree.filter((n) => n.type === 'file').length +
                  tree.reduce((acc, n) => acc + (n.children?.filter(c => c.type === 'file').length || 0), 0)}
                {' '}markdown files
              </span>
            </div>
            <div style={{ padding: '0.5rem 0' }}>
              {tree.map((node) => renderTreeNode(node, 0))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
