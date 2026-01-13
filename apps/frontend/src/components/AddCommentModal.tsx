import { useState } from 'react';
import './AddCommentModal.css';

interface AddCommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  selectedText: string;
  charStart: number;
  charEnd: number;
}

/**
 * Modal for adding a new comment to selected text
 */
export function AddCommentModal({
  isOpen,
  onClose,
  onSubmit,
  selectedText,
  charStart,
  charEnd,
}: AddCommentModalProps) {
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commentText.trim()) {
      setError('Comment text cannot be empty');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(commentText);
      // Reset form
      setCommentText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCommentText('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-comment-modal-overlay" onClick={handleCancel}>
      <div className="add-comment-modal" data-testid="comment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-comment-modal-header">
          <h3>Add Comment</h3>
          <button className="close-button" onClick={handleCancel}>
            ✕
          </button>
        </div>

        <div className="add-comment-modal-body">
          <div className="selected-text-preview">
            <label>Selected text:</label>
            <div className="selected-text">
              "{selectedText.length > 100 ? selectedText.substring(0, 100) + '...' : selectedText}"
            </div>
            <div className="character-range">
              Characters {charStart}–{charEnd}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="comment-text">Comment:</label>
              <textarea
                id="comment-text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add your comment..."
                rows={5}
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={loading || !commentText.trim()}
              >
                {loading ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
