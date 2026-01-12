import { useState, useEffect, useCallback } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { SaveStatus } from './SaveStatus';
import { SaveNowButton } from './SaveNowButton';
import { CommentSidebar, type Comment } from './CommentSidebar';
import { AddCommentModal } from './AddCommentModal';

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
  };

  const handleCommentClick = (_comment: Comment) => {
    // TODO: Scroll to and highlight the commented text in editor
    // This will be implemented with comment highlighting
  };

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
                ytext={ytext}
                awareness={awareness}
                initialContent={initialContent}
                onAddComment={handleAddCommentRequest}
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
