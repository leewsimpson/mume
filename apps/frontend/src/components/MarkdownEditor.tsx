import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { RemoteCursors } from './RemoteCursors';
import { CommentHighlights, type CommentRange } from './CommentHighlights';

interface MarkdownEditorProps {
  ytext: Y.Text | null;
  awareness: Awareness | null;
  initialContent?: string;
  onAddComment?: (charStart: number, charEnd: number, selectedText: string) => void;
  comments?: CommentRange[];
  showResolvedComments?: boolean;
  activeCommentId?: number | null;
  onHighlightClick?: (commentId: number) => void;
}

export interface MarkdownEditorRef {
  scrollToPosition: (charStart: number) => void;
  pulseHighlight: (commentId: number) => void;
}

/**
 * Markdown editor component with Yjs bidirectional sync
 * Binds textarea to Y.Text for real-time collaborative editing
 * Tracks cursor position and selection for remote user awareness
 * Displays comment highlights with bidirectional navigation
 */
export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(function MarkdownEditor(
  { ytext, awareness, initialContent = '', onAddComment, comments = [], showResolvedComments = false, activeCommentId = null, onHighlightClick },
  ref
) {
  const [content, setContent] = useState(initialContent);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ top: number; left: number } | null>(null);
  const [pulsingCommentId, setPulsingCommentId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLocalChangeRef = useRef(false);

  // Scroll textarea to show a specific character position
  const scrollToPosition = useCallback((charStart: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Create a mirror div to calculate the scroll position
    const content = textarea.value;
    const textBeforePosition = content.substring(0, charStart);

    const mirror = document.createElement('div');
    const styles = window.getComputedStyle(textarea);

    // Copy styles
    const stylesToCopy = [
      'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
      'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'borderWidth', 'boxSizing', 'wordWrap', 'overflowWrap'
    ];

    stylesToCopy.forEach(prop => {
      const value = styles.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (value) {
        mirror.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
      }
    });

    mirror.style.width = `${textarea.clientWidth}px`;
    mirror.style.position = 'absolute';
    mirror.style.top = '-9999px';
    mirror.style.left = '-9999px';
    mirror.style.visibility = 'hidden';
    mirror.style.height = 'auto';
    mirror.style.overflow = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';

    const textNode = document.createTextNode(textBeforePosition);
    mirror.appendChild(textNode);

    const marker = document.createElement('span');
    marker.textContent = '|';
    mirror.appendChild(marker);

    document.body.appendChild(mirror);
    mirror.offsetHeight;

    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const targetTop = markerRect.top - mirrorRect.top;

    document.body.removeChild(mirror);

    // Scroll textarea so the target position is visible (centered if possible)
    const scrollTarget = Math.max(0, targetTop - textarea.clientHeight / 3);
    textarea.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  }, []);

  // Pulse a highlight briefly to draw attention
  const pulseHighlight = useCallback((commentId: number) => {
    setPulsingCommentId(commentId);
    // Remove pulse after animation duration
    setTimeout(() => {
      setPulsingCommentId(null);
    }, 1000);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToPosition,
    pulseHighlight,
  }), [scrollToPosition, pulseHighlight]);

  useEffect(() => {
    if (!ytext) return;

    // Initialize content from Y.Text if it has content
    const ytextContent = ytext.toString();
    if (ytextContent) {
      setContent(ytextContent);
    } else if (initialContent) {
      // Set initial content if Y.Text is empty
      ytext.insert(0, initialContent);
    }

    // Listen for remote changes to Y.Text
    const observer = (event: Y.YTextEvent) => {
      if (isLocalChangeRef.current) {
        // Skip updates from our own changes
        isLocalChangeRef.current = false;
        return;
      }

      // Get cursor position before update
      const textarea = textareaRef.current;
      const selectionStart = textarea?.selectionStart ?? 0;

      // Update content from Y.Text
      const newContent = ytext.toString();
      setContent(newContent);

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (!textarea) return;

        let newCursorPos = selectionStart;

        // Adjust cursor position based on the change
        event.delta.forEach((change) => {
          if ('retain' in change) {
            // Keep cursor position if changes are before cursor
            const retain = change.retain ?? 0;
            if (retain < selectionStart) {
              // Changes are before cursor, no adjustment needed yet
            }
          } else if ('insert' in change) {
            // Text was inserted
            const insertText = typeof change.insert === 'string' ? change.insert : '';
            const insertLength = insertText.length;

            // If insertion happened before or at cursor, move cursor forward
            if (newCursorPos >= 0) {
              newCursorPos += insertLength;
            }
          } else if ('delete' in change) {
            // Text was deleted
            const deleteLength = change.delete ?? 0;

            // If deletion happened before cursor, move cursor back
            if (newCursorPos >= deleteLength) {
              newCursorPos -= deleteLength;
            } else {
              newCursorPos = 0;
            }
          }
        });

        // Restore cursor position
        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
      });
    };

    ytext.observe(observer);

    // Cleanup
    return () => {
      ytext.unobserve(observer);
    };
  }, [ytext, initialContent]);

  // Update cursor position in awareness
  const updateCursorPosition = (textarea: HTMLTextAreaElement) => {
    if (!awareness) return;

    const currentState = awareness.getLocalState();
    awareness.setLocalState({
      ...currentState,
      cursor: {
        position: textarea.selectionStart,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
      },
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const oldValue = content;

    if (!ytext || newValue === oldValue) return;

    // Mark this as a local change to prevent observer from processing it
    isLocalChangeRef.current = true;

    // Update local state immediately for responsive UI
    setContent(newValue);

    // Update cursor position in awareness
    updateCursorPosition(e.target);

    // Calculate the diff and apply to Y.Text
    const cursorPos = e.target.selectionStart;

    // Find the common prefix
    let prefixLength = 0;
    while (
      prefixLength < oldValue.length &&
      prefixLength < newValue.length &&
      oldValue[prefixLength] === newValue[prefixLength]
    ) {
      prefixLength++;
    }

    // Find the common suffix
    let suffixLength = 0;
    while (
      suffixLength < oldValue.length - prefixLength &&
      suffixLength < newValue.length - prefixLength &&
      oldValue[oldValue.length - 1 - suffixLength] === newValue[newValue.length - 1 - suffixLength]
    ) {
      suffixLength++;
    }

    // Calculate what changed
    const deleteLength = oldValue.length - prefixLength - suffixLength;
    const insertText = newValue.slice(prefixLength, newValue.length - suffixLength);

    // Apply changes to Y.Text in a transaction
    ytext.doc?.transact(() => {
      if (deleteLength > 0) {
        ytext.delete(prefixLength, deleteLength);
      }
      if (insertText.length > 0) {
        ytext.insert(prefixLength, insertText);
      }
    });

    // Verify cursor position is preserved
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = cursorPos;
        textareaRef.current.selectionEnd = cursorPos;
      }
    });
  };

  // Handle cursor movement and selection changes
  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    updateCursorPosition(textarea);

    // Show "Add Comment" button if text is selected
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;

    if (selStart !== selEnd && selStart < selEnd) {
      const selectedText = textarea.value.substring(selStart, selEnd);
      setSelection({ start: selStart, end: selEnd, text: selectedText });

      // Calculate button position relative to textarea
      const rect = textarea.getBoundingClientRect();
      // Position button near the end of selection (rough approximation)
      setButtonPosition({
        top: rect.top + 20,
        left: rect.left + rect.width / 2,
      });
    } else {
      setSelection(null);
      setButtonPosition(null);
    }
  };

  const handleAddCommentClick = () => {
    if (selection && onAddComment) {
      onAddComment(selection.start, selection.end, selection.text);
      // Clear selection after adding comment
      setSelection(null);
      setButtonPosition(null);
    }
  };

  // Determine the active comment ID (include pulsing for visual feedback)
  const effectiveActiveId = pulsingCommentId ?? activeCommentId;

  return (
    <div className="editor-container">
      <textarea
        ref={textareaRef}
        className="markdown-textarea"
        value={content}
        onChange={handleChange}
        onSelect={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder="Type your markdown here..."
      />
      <RemoteCursors awareness={awareness} textareaRef={textareaRef} />

      {/* Comment highlights overlay */}
      <CommentHighlights
        comments={comments}
        textareaRef={textareaRef}
        showResolved={showResolvedComments}
        activeCommentId={effectiveActiveId}
        onHighlightClick={onHighlightClick}
      />

      {/* Add Comment button - appears when text is selected */}
      {selection && buttonPosition && (
        <button
          className="add-comment-button"
          style={{
            position: 'fixed',
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`,
            transform: 'translate(-50%, 0)',
            zIndex: 100,
          }}
          onClick={handleAddCommentClick}
        >
          💬 Add Comment
        </button>
      )}
    </div>
  );
});
