import { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder } from '@fortawesome/free-solid-svg-icons';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (path: string, filename: string) => Promise<void>;
  existingFolders: TreeNode[];
  initialFolderPath?: string;
}

export function CreateDocumentModal({
  isOpen,
  onClose,
  onCreate,
  existingFolders,
  initialFolderPath = '',
}: CreateDocumentModalProps) {
  const [filename, setFilename] = useState('');
  const [folderPath, setFolderPath] = useState(initialFolderPath);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<'picker' | 'text'>(initialFolderPath ? 'text' : 'picker');
  const [showValidation, setShowValidation] = useState(false);

  // Update folder path when initialFolderPath changes (modal opens with new context)
  useEffect(() => {
    if (isOpen) {
      setFolderPath(initialFolderPath);
      setInputMode(initialFolderPath ? 'text' : 'picker');
    }
  }, [isOpen, initialFolderPath]);

  // Extract all folder paths from tree structure
  const folderPaths = useMemo(() => {
    const paths: string[] = [''];  // Include root

    const extractPaths = (nodes: TreeNode[], parentPath: string = '') => {
      nodes.forEach((node) => {
        if (node.type === 'folder') {
          const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
          paths.push(fullPath);
          if (node.children) {
            extractPaths(node.children, fullPath);
          }
        }
      });
    };

    extractPaths(existingFolders);
    return paths.sort();
  }, [existingFolders]);

  // Filter folder paths for autocomplete
  const filteredPaths = useMemo(() => {
    if (!folderPath) return folderPaths.slice(0, 10);
    return folderPaths
      .filter((path) => path.toLowerCase().includes(folderPath.toLowerCase()))
      .slice(0, 10);
  }, [folderPath, folderPaths]);

  // Validate filename
  const validateFilename = (name: string): string | null => {
    if (!name) {
      return 'Filename is required';
    }
    if (!name.endsWith('.md')) {
      return 'Filename must end with .md';
    }
    if (name.length > 255) {
      return 'Filename is too long (max 255 characters)';
    }
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(name)) {
      return 'Filename contains invalid characters (<>:"|?*)';
    }
    if (name.includes('/') || name.includes('\\')) {
      return 'Filename cannot contain / or \\';
    }
    return null;
  };

  // Validate folder path
  const validateFolderPath = (path: string): string | null => {
    if (!path) return null; // Empty path is valid (root)

    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      return 'Folder path contains invalid characters (<>:"|?*)';
    }
    if (path.includes('\\')) {
      return 'Use forward slashes (/) for folder paths';
    }
    if (path.startsWith('/') || path.endsWith('/')) {
      return 'Folder path should not start or end with /';
    }
    return null;
  };

  // Get full path preview
  const fullPath = useMemo(() => {
    if (!filename) return '';
    return folderPath ? `${folderPath}/${filename}` : filename;
  }, [filename, folderPath]);

  // Validate form
  const validationError = useMemo(() => {
    const filenameError = validateFilename(filename);
    if (filenameError) return filenameError;

    const folderError = validateFolderPath(folderPath);
    if (folderError) return folderError;

    return null;
  }, [filename, folderPath]);

  const handleFilenameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilename(e.target.value);
    setError(null);
    // Reset validation when user types
    if (showValidation) {
      setShowValidation(false);
    }
  };

  const handleFolderPathChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFolderPath(e.target.value);
    setError(null);
    // Reset validation when user types
    if (showValidation) {
      setShowValidation(false);
    }
  };

  const handleSelectFolder = (path: string) => {
    setFolderPath(path);
    setError(null);
  };

  const handleCreate = async () => {
    // Show validation errors when user attempts to create
    setShowValidation(true);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreate(folderPath, filename);
      // Reset form on success
      setFilename('');
      setFolderPath('');
      setInputMode('picker');
      setShowValidation(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFilename('');
      setFolderPath('');
      setError(null);
      setInputMode('picker');
      setShowValidation(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-testid="create-document-modal" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Document</h2>
          <button className="close-button" onClick={handleClose} disabled={isCreating}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Filename Input */}
          <div className="form-group">
            <label htmlFor="filename">Filename</label>
            <input
              id="filename"
              type="text"
              value={filename}
              onChange={handleFilenameChange}
              placeholder="Enter filename (e.g., document.md)"
              disabled={isCreating}
              autoFocus
            />
          </div>

          {/* Folder Path Selector */}
          <div className="form-group">
            <label htmlFor="folder-path">
              Folder Path
              <span className="label-hint">(leave empty for root)</span>
            </label>

            <div className="input-mode-toggle">
              <button
                type="button"
                className={inputMode === 'picker' ? 'active' : ''}
                onClick={() => setInputMode('picker')}
                disabled={isCreating}
              >
                Pick Folder
              </button>
              <button
                type="button"
                className={inputMode === 'text' ? 'active' : ''}
                onClick={() => setInputMode('text')}
                disabled={isCreating}
              >
                Type Path
              </button>
            </div>

            {inputMode === 'picker' ? (
              <div className="folder-picker" data-testid="folder-selector">
                <button
                  type="button"
                  className={`folder-item ${folderPath === '' ? 'selected' : ''}`}
                  onClick={() => handleSelectFolder('')}
                  disabled={isCreating}
                >
                  <FontAwesomeIcon icon={faFolder} style={{ marginRight: '0.5rem', color: 'var(--color-warning, #d29922)' }} />
                  (root)
                </button>
                {folderPaths.slice(1).map((path) => (
                  <button
                    key={path}
                    type="button"
                    className={`folder-item ${folderPath === path ? 'selected' : ''}`}
                    onClick={() => handleSelectFolder(path)}
                    disabled={isCreating}
                  >
                    <FontAwesomeIcon icon={faFolder} style={{ marginRight: '0.5rem', color: 'var(--color-warning, #d29922)' }} />
                    {path}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <input
                  id="folder-path"
                  type="text"
                  value={folderPath}
                  onChange={handleFolderPathChange}
                  placeholder="docs/architecture"
                  disabled={isCreating}
                  list="folder-suggestions"
                  data-testid="folder-path-input"
                />
                <datalist id="folder-suggestions">
                  {filteredPaths.map((path) => (
                    <option key={path || 'root'} value={path}>
                      {path || '(root)'}
                    </option>
                  ))}
                </datalist>
              </>
            )}
          </div>

          {/* Full Path Preview */}
          {fullPath && (
            <div className="path-preview">
              <strong>Creating:</strong> {fullPath}
            </div>
          )}

          {/* Error Display - show validation errors after submission attempt or submission errors */}
          {((showValidation && validationError) || error) && (
            <div className="error-message">{validationError || error}</div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="button button-secondary"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Document'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover:not(:disabled) {
          color: #111827;
        }

        .close-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .label-hint {
          font-weight: normal;
          font-size: 0.875rem;
          color: #6b7280;
          margin-left: 0.5rem;
        }

        .form-group input[type="text"] {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 1rem;
          background: white;
          color: #111827;
        }

        .form-group input[type="text"]:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-group input[type="text"]:disabled {
          background-color: #f3f4f6;
          cursor: not-allowed;
        }

        .input-mode-toggle {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .input-mode-toggle button {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
        }

        .input-mode-toggle button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .input-mode-toggle button:not(.active):hover:not(:disabled) {
          background: #f3f4f6;
        }

        .input-mode-toggle button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .folder-picker {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.5rem;
        }

        .folder-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.5rem;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .folder-item:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .folder-item.selected {
          background: #dbeafe;
          color: #1e40af;
        }

        .folder-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .path-preview {
          padding: 0.75rem;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .path-preview strong {
          color: #374151;
        }

        .error-message {
          padding: 0.75rem;
          background: #fef2f2;
          color: #dc2626;
          border-radius: 4px;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .button {
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
          border: none;
        }

        .button-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .button-secondary:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .button-primary {
          background: #3b82f6;
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
