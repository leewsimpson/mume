import { useState, useEffect } from 'react';
import './CommentSidebar.css';

interface User {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface Reply {
  id: number;
  commentId: number;
  userId: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  user: User;
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
  replies: Reply[];
}

interface CommentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  filePath: string;
  currentUserId?: number;
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
  currentUserId,
  onCommentClick,
}: CommentSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

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

  const handleReplySubmit = async (commentId: number) => {
    if (!replyText.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:3000/api/comments/${commentId}/replies`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ text: replyText }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }

      // Reset reply state
      setReplyText('');
      setReplyingTo(null);

      // Refresh comments
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit reply');
    }
  };

  const handleResolveToggle = async (commentId: number, currentResolved: boolean) => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/comments/${commentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ resolved: !currentResolved }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update comment');
      }

      // Refresh comments
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this comment? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCommentId(commentId);
      const response = await fetch(
        `http://localhost:3000/api/comments/${commentId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete comment');
      }

      // Refresh comments
      await fetchComments();
      setDeletingCommentId(null);
    } catch (err) {
      setDeletingCommentId(null);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    }
  };

  // Filter comments based on resolved status visibility
  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  if (!isOpen) return null;

  return (
    <div className="comment-sidebar-overlay">
      <div className="comment-sidebar">
        <div className="comment-sidebar-header">
          <div className="header-top">
            <h2>Comments</h2>
            <button className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="header-controls">
            <button
              className="toggle-resolved-button"
              onClick={() => setShowResolved(!showResolved)}
            >
              {showResolved ? 'Hide' : 'Show'} resolved
            </button>
          </div>
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

          {filteredComments.length > 0 && (
            <div className="comments-list">
              {filteredComments.map((comment) => (
                <div
                  key={comment.id}
                  className={`comment-thread ${comment.resolved ? 'resolved' : ''}`}
                >
                  <div className="comment-thread-header">
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
                    <div className="comment-actions">
                      {comment.resolved && (
                        <span className="resolved-badge">Resolved</span>
                      )}
                      {currentUserId === comment.userId && (
                        <button
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComment(comment.id);
                          }}
                          disabled={deletingCommentId === comment.id}
                          title="Delete comment"
                        >
                          {deletingCommentId === comment.id ? '...' : '🗑️'}
                        </button>
                      )}
                      <button
                        className="resolve-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveToggle(comment.id, comment.resolved);
                        }}
                      >
                        {comment.resolved ? 'Unresolve' : 'Resolve'}
                      </button>
                    </div>
                  </div>
                  <div
                    className="comment-body"
                    onClick={() => handleCommentClick(comment)}
                  >
                    <p>{comment.text}</p>
                  </div>
                  <div className="comment-range">
                    Position: {comment.charStart}–{comment.charEnd}
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="replies-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply">
                          <div className="comment-header">
                            <img
                              src={reply.user.avatarUrl}
                              alt={reply.user.username}
                              className="comment-avatar reply-avatar"
                            />
                            <div className="comment-meta">
                              <span className="comment-author">
                                {reply.user.username}
                              </span>
                              <span className="comment-timestamp">
                                {formatRelativeTime(reply.createdAt)}
                              </span>
                            </div>
                          </div>
                          <div className="reply-body">
                            <p>{reply.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  <div className="reply-actions">
                    {replyingTo === comment.id ? (
                      <div className="reply-form">
                        <textarea
                          className="reply-input"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          rows={3}
                        />
                        <div className="reply-form-actions">
                          <button
                            className="cancel-reply-button"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            className="submit-reply-button"
                            onClick={() => handleReplySubmit(comment.id)}
                            disabled={!replyText.trim()}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="reply-button"
                        onClick={() => setReplyingTo(comment.id)}
                      >
                        Reply
                      </button>
                    )}
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
