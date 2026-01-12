import { useState, useEffect } from 'react';
import './CommentSidebar.css';

interface User {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface Comment {
  id: number;
  userId: number;
  documentPath: string;
  repoOwner: string;
  repoName: string;
  charStart: number;
  charEnd: number;
  text: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
}

interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  filePath: string;
  onCommentClick?: (comment: Comment) => void;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * CommentSidebar component displays all comments for a document in a slide-in panel
 */
export function CommentSidebar({
  isOpen,
  onClose,
  owner,
  repo,
  filePath,
  onCommentClick,
}: CommentSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch comments from backend
  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);

      const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
      const response = await fetch(
        `http://localhost:3000/api/repositories/${owner}/${repo}/files/${encodedPath}/comments`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.statusText}`);
      }

      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments on mount and when path changes
  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, owner, repo, filePath]);

  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchComments();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [isOpen, owner, repo, filePath]);

  const handleCommentClick = (comment: Comment) => {
    if (onCommentClick) {
      onCommentClick(comment);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comment-sidebar-overlay">
      <div className="comment-sidebar">
        <div className="comment-sidebar-header">
          <h2>Comments</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="comment-sidebar-content">
          {loading && comments.length === 0 && (
            <div className="empty-state">Loading comments...</div>
          )}

          {error && (
            <div className="error-state">
              <p>{error}</p>
              <button onClick={fetchComments} className="retry-button">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && comments.length === 0 && (
            <div className="empty-state">
              <p>No comments yet.</p>
              <p className="empty-state-hint">
                Select text in the editor to add a comment.
              </p>
            </div>
          )}

          {comments.length > 0 && (
            <div className="comments-list">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="comment-thread"
                  onClick={() => handleCommentClick(comment)}
                >
                  <div className="comment-header">
                    <img
                      src={comment.user.avatarUrl}
                      alt={comment.user.username}
                      className="comment-avatar"
                    />
                    <div className="comment-meta">
                      <span className="comment-author">
                        {comment.user.username}
                      </span>
                      <span className="comment-timestamp">
                        {formatRelativeTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="comment-body">
                    <p>{comment.text}</p>
                  </div>
                  <div className="comment-range">
                    Position: {comment.charStart}–{comment.charEnd}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
