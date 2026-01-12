import { useState, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { SaveStatus } from './SaveStatus';
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

    // Listen for Y.Text changes to update preview
    const observer = () => {
      setMarkdown(ytext.toString());
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, [ytext]);

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
        <SaveStatus status="saved" message="Auto-save enabled (30s)" />
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
