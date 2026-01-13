import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor, type MarkdownEditorRef } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { SaveStatus } from './SaveStatus';
import { SaveNowButton } from './SaveNowButton';
import { CommentSidebar, type Comment } from './CommentSidebar';
import { AddCommentModal } from './AddCommentModal';
import { CreateDocumentModal } from './CreateDocumentModal';
import type { CommentRange } from './CommentHighlights';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faExclamationTriangle, faFileAlt, faFolderOpen, faPlus } from '@fortawesome/free-solid-svg-icons';
import { API_URL, WS_URL } from '../config/api';

interface EditorLayoutProps {
  userName: string;
  documentId: string;
  initialContent?: string;
  fileSha?: string;
  owner?: string;
  repo?: string;
  filePath?: string;
  avatarUrl?: string;
  githubId?: string;
  userId?: number;
}

export function EditorLayout({
  userName,
  documentId,
  initialContent,
  fileSha: _fileSha,
  owner,
  repo,
  filePath,
  avatarUrl,
  githubId,
  userId,
}: EditorLayoutProps) {
  const [markdown, setMarkdown] = useState(
    initialContent || '# Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time.'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<{
    charStart: number;
    charEnd: number;
    selectedText: string;
  } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [comments, setComments] = useState<CommentRange[]>([]);
  const [showResolvedComments, setShowResolvedComments] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [existingFolders, setExistingFolders] = useState<Array<{ name: string; path: string; type: 'file' | 'folder'; children?: any[] }>>([]);

  const navigate = useNavigate();

  // Ref for MarkdownEditor to enable scroll-to functionality
  const editorRef = useRef<MarkdownEditorRef>(null);

  // Ref to track if Y.Text observer is initialized (persists across effect re-runs)
  const isYtextInitializedRef = useRef(false);

  // Initialize Yjs provider with document ID from route and user name
  const { ydoc: _ydoc, ytext, provider: _provider, awareness, status, error, reconnectAttempts } = useYjsProvider(documentId, userName, WS_URL, avatarUrl, githubId);

  // Sync markdown state with Y.Text for preview pane
  useEffect(() => {
    if (!ytext) return;

    // Initialize markdown from Y.Text
    const ytextContent = ytext.toString();
    if (ytextContent) {
      setMarkdown(ytextContent);
    }

    // Mark as initialized after a short delay to avoid false positives from initial sync
    const initTimer = setTimeout(() => {
      isYtextInitializedRef.current = true;
    }, 100);

    // Listen for Y.Text changes to update preview and track unsaved changes
    const observer = () => {
      setMarkdown(ytext.toString());
      // Only mark as unsaved if this is not the initial load
      if (isYtextInitializedRef.current) {
        setHasUnsavedChanges(true);
      }
    };

    ytext.observe(observer);

    return () => {
      clearTimeout(initTimer);
      ytext.unobserve(observer);
    };
  }, [ytext]);

  // Fetch comments for highlighting
  const fetchComments = useCallback(async () => {
    if (!owner || !repo || !filePath) return;

    try {
      const response = await fetch(
        `${API_URL}/api/repositories/${owner}/${repo}/comments?filePath=${encodeURIComponent(filePath)}`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data: Comment[] = await response.json();
        // Map to CommentRange for highlighting
        const commentRanges: CommentRange[] = data.map(c => ({
          id: c.id,
          charStart: c.charStart,
          charEnd: c.charEnd,
          resolved: c.resolved,
        }));
        setComments(commentRanges);
      }
    } catch (err) {
      console.error('Failed to fetch comments for highlighting:', err);
    }
  }, [owner, repo, filePath]);

  // Fetch comments on mount and when file changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Poll for comment updates every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchComments, 10000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Refetch comments when a new comment is added
  const handleCommentAdded = useCallback(() => {
    fetchComments();
  }, [fetchComments]);

  // Manual save handler
  const handleSaveNow = useCallback(async () => {
    if (!owner || !repo || !documentId || isSaving || !hasUnsavedChanges) {
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const response = await fetch(
        `${API_URL}/api/repositories/${owner}/${repo}/documents/save`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Save failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        setSaveStatus('error');
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [owner, repo, documentId, isSaving, hasUnsavedChanges]);

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // Prevent browser's default save dialog
        handleSaveNow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSaveNow]);

  // Handle "Add Comment" click from MarkdownEditor
  const handleAddCommentRequest = (charStart: number, charEnd: number, selectedText: string) => {
    setSelectedRange({ charStart, charEnd, selectedText });
    setIsModalOpen(true);
  };

  // Submit comment to backend
  const handleSubmitComment = async (text: string) => {
    if (!selectedRange || !owner || !repo || !filePath) {
      throw new Error('Missing required information to create comment');
    }

    const response = await fetch(`${API_URL}/api/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        documentPath: filePath,
        repoOwner: owner,
        repoName: repo,
        charStart: selectedRange.charStart,
        charEnd: selectedRange.charEnd,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create comment');
    }

    // Comment created successfully
    setSelectedRange(null);
    // Refresh comments for highlighting
    handleCommentAdded();
  };

  // Handle click on comment in sidebar - scroll to highlighted text in editor
  const handleCommentClick = useCallback((comment: Comment) => {
    // Scroll to the comment position in the editor
    editorRef.current?.scrollToPosition(comment.charStart);
    // Pulse the highlight to draw attention
    editorRef.current?.pulseHighlight(comment.id);
    // Set as active for visual feedback
    setActiveCommentId(comment.id);
    // Clear active state after a moment
    setTimeout(() => setActiveCommentId(null), 2000);
  }, []);

  // Handle click on highlight in editor - open sidebar and scroll to comment
  const handleHighlightClick = useCallback((commentId: number) => {
    // Open the sidebar if not already open
    setIsSidebarOpen(true);
    // Set the active comment
    setActiveCommentId(commentId);
    // Clear active state after a moment
    setTimeout(() => setActiveCommentId(null), 2000);
    // Scroll to the comment in the sidebar
    // Use a small delay to let the sidebar open first
    setTimeout(() => {
      const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Document browser URL
  const documentBrowserUrl = owner && repo ? `/repositories/${owner}/${repo}` : '/repositories';

  // Extract filename and folder from path
  const fileName = filePath?.split('/').pop() || documentId;
  const currentFolderPath = filePath?.includes('/') 
    ? filePath.substring(0, filePath.lastIndexOf('/'))
    : '';

  // Navigation with unsaved changes confirmation
  const confirmNavigation = useCallback((targetUrl: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Leave anyway?');
      if (!confirmed) {
        return false;
      }
    }
    navigate(targetUrl);
    return true;
  }, [hasUnsavedChanges, navigate]);

  // Handle back/files button click
  const handleBackClick = useCallback(() => {
    confirmNavigation(documentBrowserUrl);
  }, [confirmNavigation, documentBrowserUrl]);

  // Handle new document button click
  const handleNewDocumentClick = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Leave anyway?');
      if (!confirmed) {
        return;
      }
    }
    setIsCreateModalOpen(true);
  }, [hasUnsavedChanges]);

  // Handle document creation
  const handleCreateDocument = useCallback(async (folderPath: string, filename: string) => {
    if (!owner || !repo) {
      throw new Error('Repository information not available');
    }

    const fullPath = folderPath ? `${folderPath}/${filename}` : filename;

    const response = await fetch(
      `${API_URL}/api/repositories/${owner}/${repo}/files`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          path: fullPath,
          content: `# ${filename.replace('.md', '')}\n\n`,
          message: `Create ${fullPath}`,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create document');
    }

    // Navigate to new document
    navigate(`/repositories/${owner}/${repo}/edit/${encodeURIComponent(fullPath)}`);
  }, [owner, repo, navigate]);

  // Fetch existing folders for CreateDocumentModal
  useEffect(() => {
    if (!owner || !repo) return;

    const fetchFolders = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/repositories/${owner}/${repo}/tree`,
          { credentials: 'include' }
        );

        if (response.ok) {
          const data = await response.json();
          setExistingFolders(data.tree || []);
        }
      } catch (err) {
        console.error('Failed to fetch folder tree:', err);
      }
    };

    fetchFolders();
  }, [owner, repo]);

  // Keyboard shortcut: Escape to navigate back
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key - navigate back to document browser
      if (event.key === 'Escape') {
        // Don't trigger if a modal is open
        if (isModalOpen || isCreateModalOpen) return;
        
        event.preventDefault();
        confirmNavigation(documentBrowserUrl);
      }
      // Ctrl+N / Cmd+N - new document
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        handleNewDocumentClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [confirmNavigation, documentBrowserUrl, isModalOpen, isCreateModalOpen, handleNewDocumentClick]);

  return (
    <div className="editor-layout">
      <div className="editor-header">
        <div className="editor-header__left">
          {/* Breadcrumb navigation */}
          <div className="editor-header__breadcrumb" data-testid="editor-breadcrumb">
            <button
              className="breadcrumb__segment breadcrumb__segment--repo"
              onClick={handleBackClick}
              title={`${owner}/${repo}`}
            >
              {repo}
            </button>
            {currentFolderPath && (
              <>
                <span className="breadcrumb__separator">/</span>
                <button
                  className="breadcrumb__segment breadcrumb__segment--folder"
                  onClick={handleBackClick}
                  title={currentFolderPath}
                >
                  {currentFolderPath}
                </button>
              </>
            )}
            <span className="breadcrumb__separator">/</span>
            <span className="breadcrumb__segment breadcrumb__segment--file">
              <FontAwesomeIcon icon={faFileAlt} className="breadcrumb__file-icon" />
              {fileName}
            </span>
          </div>

          {(saveStatus === 'saving' || saveStatus === 'saved' || saveStatus === 'error') && (
            <SaveStatus status={saveStatus} />
          )}
        </div>
        <div className="editor-header__right">
          <ConnectionStatus status={status} reconnectAttempts={reconnectAttempts} />
          <SaveNowButton
            onSave={handleSaveNow}
            isSaving={isSaving}
            disabled={!hasUnsavedChanges}
          />
          <button
            className="btn btn--icon btn--ghost"
            onClick={toggleSidebar}
            title="Toggle comments"
          >
            <FontAwesomeIcon icon={faComments} />
          </button>
          <button
            className="btn btn--icon btn--ghost"
            onClick={handleNewDocumentClick}
            title="New document (Ctrl+N)"
            disabled={isCreateModalOpen}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
          <button
            className="btn btn--icon btn--ghost"
            onClick={handleBackClick}
            title="Back to files (Esc)"
          >
            <FontAwesomeIcon icon={faFolderOpen} />
          </button>
          <UserPresence awareness={awareness} />
        </div>
      </div>
      {error && (
        <div className="error-banner">
          <span className="error-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </span>
          <span className="error-message">{error}</span>
        </div>
      )}
      <div className="editor-content">
        <Group orientation="horizontal">
          <Panel defaultSize={50} minSize={20}>
            <div className="editor-pane">
              <MarkdownEditor
                ref={editorRef}
                ytext={ytext}
                awareness={awareness}
                initialContent={initialContent}
                onAddComment={handleAddCommentRequest}
                comments={comments}
                showResolvedComments={showResolvedComments}
                activeCommentId={activeCommentId}
                onHighlightClick={handleHighlightClick}
              />
            </div>
          </Panel>
          <Separator className="resize-handle" />
          <Panel defaultSize={50} minSize={20}>
            <div className="preview-pane">
              <MarkdownPreview content={markdown} />
            </div>
          </Panel>
        </Group>
      </div>

      {/* Comment Sidebar */}
      {owner && repo && filePath && (
        <CommentSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          owner={owner}
          repo={repo}
          filePath={filePath}
          currentUserId={userId}
          onCommentClick={handleCommentClick}
          showResolved={showResolvedComments}
          onShowResolvedChange={setShowResolvedComments}
        />
      )}

      {/* Add Comment Modal */}
      {selectedRange && (
        <AddCommentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRange(null);
          }}
          onSubmit={handleSubmitComment}
          selectedText={selectedRange.selectedText}
          charStart={selectedRange.charStart}
          charEnd={selectedRange.charEnd}
        />
      )}

      {/* Create Document Modal */}
      <CreateDocumentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateDocument}
        existingFolders={existingFolders}
        initialFolderPath={currentFolderPath}
      />
    </div>
  );
}
