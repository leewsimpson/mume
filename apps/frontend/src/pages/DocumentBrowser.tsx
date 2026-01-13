import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { CreateDocumentModal } from '../components/CreateDocumentModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowLeft, 
  faSignOutAlt, 
  faPlus, 
  faFolder, 
  faFileAlt, 
  faChevronRight, 
  faChevronDown,
  faList,
  faFolderTree,
  faSearch,
  faChevronLeft
} from '@fortawesome/free-solid-svg-icons';

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

type ViewMode = 'tree' | 'list';
type SortOption = 'name' | 'date' | 'path';

export function DocumentBrowser() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 50;

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
            data-testid="tree-item tree-folder"
            onClick={() => toggleFolder(node.path)}
            style={{
              padding: 'var(--space-2)',
              paddingLeft,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease',
              borderRadius: 'var(--radius-sm)',
              margin: '0 var(--space-2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FontAwesomeIcon 
              icon={isExpanded ? faChevronDown : faChevronRight} 
              className="tree-icon tree-icon--chevron"
              style={{ fontSize: '0.625rem', width: '0.75rem' }}
            />
            <FontAwesomeIcon 
              icon={faFolder} 
              className="tree-icon tree-icon--folder"
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>{node.name}</span>
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
        data-testid="tree-item"
        key={node.path}
        onClick={() => handleFileClick(node.path)}
        style={{
          padding: 'var(--space-2)',
          paddingLeft,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
          borderRadius: 'var(--radius-sm)',
          margin: '0 var(--space-2)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ width: '0.75rem' }}></span>
        <FontAwesomeIcon 
          icon={faFileAlt} 
          className="tree-icon tree-icon--file"
        />
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-link)' }}>{node.name}</span>
        {node.size !== undefined && (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
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

  // Flatten tree to get all files
  const flattenTree = (nodes: TreeNode[]): TreeNode[] => {
    const files: TreeNode[] = [];
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach((node) => {
        if (node.type === 'file') {
          files.push(node);
        }
        if (node.children) {
          traverse(node.children);
        }
      });
    };
    traverse(nodes);
    return files;
  };

  // Get all files from tree
  const allFiles = flattenTree(tree);

  // Filter files by search query
  const filteredFiles = allFiles.filter((file) => {
    const query = searchQuery.toLowerCase();
    return (
      file.name.toLowerCase().includes(query) ||
      file.path.toLowerCase().includes(query)
    );
  });

  // Sort files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'path':
        return a.path.localeCompare(b.path);
      case 'date':
        // Date sorting not implemented yet (requires commit data)
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedFiles.length / filesPerPage);
  const startIndex = (currentPage - 1) * filesPerPage;
  const endIndex = startIndex + filesPerPage;
  const paginatedFiles = sortedFiles.slice(startIndex, endIndex);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption]);

  const renderListView = () => {
    return (
      <div data-testid="file-list">
        {paginatedFiles.map((file) => (
          <div
            key={file.path}
            onClick={() => handleFileClick(file.path)}
            style={{
              padding: 'var(--space-4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
              borderBottom: '1px solid var(--color-border-muted)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <FontAwesomeIcon 
              icon={faFileAlt} 
              className="tree-icon tree-icon--file"
              style={{ fontSize: '1rem' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-link)', marginBottom: 'var(--space-1)' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                {file.path}
              </div>
            </div>
            {file.size !== undefined && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {formatFileSize(file.size)}
              </span>
            )}
          </div>
        ))}
        {paginatedFiles.length === 0 && (
          <div
            style={{
              padding: 'var(--space-6)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            {searchQuery
              ? `No files found matching "${searchQuery}"`
              : 'No markdown files found'}
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-default)',
        }}
      >
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn btn--secondary btn--sm"
          style={{
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <FontAwesomeIcon icon={faChevronLeft} />
          Previous
        </button>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn btn--secondary btn--sm"
          style={{
            opacity: currentPage === totalPages ? 0.5 : 1,
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
          }}
        >
          Next
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    );
  };

  const handleCreateDocument = async (folderPath: string, filename: string) => {
    const fullPath = folderPath ? `${folderPath}/${filename}` : filename;
    const commitMessage = `Create ${fullPath}`;

    const response = await fetch(`${API_URL}/api/repositories/${owner}/${repo}/files`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: fullPath,
        content: '# New Document\n',
        message: commitMessage,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create document');
    }

    // Refresh tree and navigate to new file
    await fetchRepositoryTree();
    navigate(`/repositories/${owner}/${repo}/edit/${encodeURIComponent(fullPath)}`);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--color-bg-primary)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-family)',
      }}
    >
      <header className="app-header">
        <div className="app-header__left">
          <button
            onClick={handleBackToRepositories}
            className="btn btn--ghost"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Back
          </button>
          <div className="app-header__breadcrumb" data-testid="breadcrumb">
            <span className="app-header__breadcrumb-item--active" style={{ fontWeight: 600 }}>
              {owner}/{repo}
            </span>
            <span className="app-header__breadcrumb-separator">/</span>
            <span className="app-header__breadcrumb-item">Markdown Files</span>
          </div>
        </div>

        <div className="app-header__right">
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn btn--primary"
          >
            <FontAwesomeIcon icon={faPlus} />
            New Document
          </button>
          <button
            onClick={handleLogout}
            className="btn btn--secondary"
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Logout
          </button>
        </div>
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
            data-testid="loading-spinner"
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
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                  Files and Folders
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#8b949e' }}>
                  {allFiles.length} markdown files
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {/* View mode toggle */}
                <button
                  data-testid="view-toggle"
                  onClick={() => setViewMode(viewMode === 'tree' ? 'list' : 'tree')}
                  className="btn btn--secondary btn--sm"
                >
                  <FontAwesomeIcon icon={viewMode === 'tree' ? faList : faFolderTree} />
                  {viewMode === 'tree' ? 'List View' : 'Tree View'}
                </button>

                {/* Search input */}
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    style={{ 
                      position: 'absolute', 
                      left: 'var(--space-3)', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.75rem',
                    }} 
                  />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      paddingLeft: '2rem',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      outline: 'none',
                      transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-accent-emphasis)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(31, 111, 235, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-border-default)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Sort dropdown (only show in list view) */}
                {viewMode === 'list' && (
                  <select
                    data-testid="sort-dropdown"
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border-default)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                  >
                    <option value="name">Sort by Name</option>
                    <option value="path">Sort by Path</option>
                    <option value="date">Sort by Date</option>
                  </select>
                )}
              </div>
            </div>

            {viewMode === 'tree' ? (
              <div style={{ padding: 'var(--space-2) 0' }} data-testid="file-tree">
                {searchQuery ? (
                  // Show filtered files in tree format when searching
                  filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleFileClick(file.path)}
                        style={{
                          padding: 'var(--space-2)',
                          paddingLeft: 'var(--space-2)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          backgroundColor: 'transparent',
                          transition: 'background-color 0.15s ease',
                          borderRadius: 'var(--radius-sm)',
                          margin: '0 var(--space-2)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <FontAwesomeIcon 
                          icon={faFileAlt} 
                          className="tree-icon tree-icon--file"
                        />
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-link)' }}>{file.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'var(--space-2)' }}>
                          {file.path}
                        </span>
                        {file.size !== undefined && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                            {formatFileSize(file.size)}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      No files found matching "{searchQuery}"
                    </div>
                  )
                ) : (
                  // Show full tree when not searching
                  tree.map((node) => renderTreeNode(node, 0))
                )}
              </div>
            ) : (
              <>
                {renderListView()}
                {renderPagination()}
              </>
            )}
          </div>
        )}
      </main>

      <CreateDocumentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateDocument}
        existingFolders={tree}
      />
    </div>
  );
}
