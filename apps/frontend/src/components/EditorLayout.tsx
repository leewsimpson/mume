import { useState, useEffect, useCallback, useRef } from 'react';
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
import type { CommentRange } from './CommentHighlights';

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

  // Ref for MarkdownEditor to enable scroll-to functionality
  const editorRef = useRef<MarkdownEditorRef>(null);

  // Initialize Yjs provider with document ID from route and user name
  const { ydoc: _ydoc, ytext, provider: _provider, awareness, status, error, reconnectAttempts } = useYjsProvider(documentId, userName, 'ws://localhost:3000', avatarUrl, githubId);

  // Sync markdown state with Y.Text for preview pane
  useEffect(() => {
    if (!ytext) return;

    // Initialize markdown from Y.Text
    const ytextContent = ytext.toString();
    if (ytextContent) {
      setMarkdown(ytextContent);
    }

    // Listen for Y.Text changes to update preview and track unsaved changes
    const observer = () => {
      setMarkdown(ytext.toString());
      setHasUnsavedChanges(true);
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, [ytext]);

  // Fetch comments for highlighting
  const fetchComments = useCallback(async () => {
    if (!owner || !repo || !filePath) return;

    try {
      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(
        `http://localhost:3000/api/repositories/${owner}/${repo}/files/${encodedPath}/comments`,
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
        `http://localhost:3000/api/repositories/${owner}/${repo}/documents/${encodeURIComponent(documentId)}/save`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save');
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

    const response = await fetch('http://localhost:3000/api/comments', {
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

  return (
    <div className="editor-layout">
      <div className="editor-header">
        <ConnectionStatus status={status} />
        <SaveStatus
          status={saveStatus}
          message={saveStatus === 'idle' ? 'Auto-save enabled (30s)' : undefined}
        />
        <SaveNowButton
          onSave={handleSaveNow}
          isSaving={isSaving}
          disabled={!hasUnsavedChanges}
        />
        <button
          className="comments-toggle-button"
          onClick={toggleSidebar}
          title="Toggle comments"
        >
          💬 Comments
        </button>
        {status === 'connecting' && reconnectAttempts > 0 && (
          <div className="reconnect-info">
            Reconnecting... (attempt {reconnectAttempts})
          </div>
        )}
        <UserPresence awareness={awareness} />
      </div>
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
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
    </div>
  );
}
