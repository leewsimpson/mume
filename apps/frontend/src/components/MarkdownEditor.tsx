import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';
import { RemoteCursors } from './RemoteCursors';

interface MarkdownEditorProps {
  ytext: Y.Text | null;
  awareness: Awareness | null;
  initialContent?: string;
}

/**
 * Markdown editor component with Yjs bidirectional sync
 * Binds textarea to Y.Text for real-time collaborative editing
 * Tracks cursor position and selection for remote user awareness
 */
export function MarkdownEditor({ ytext, awareness, initialContent = '' }: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLocalChangeRef = useRef(false);

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
    updateCursorPosition(e.currentTarget);
  };

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
    </div>
  );
}
