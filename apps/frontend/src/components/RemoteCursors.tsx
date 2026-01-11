import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

interface CursorPosition {
  clientId: number;
  name: string;
  color: string;
  position: number;
  selectionStart?: number;
  selectionEnd?: number;
}

interface RemoteCursorsProps {
  awareness: Awareness | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * RemoteCursors component displays cursor positions and selections for remote users
 * Uses Yjs Awareness API to track and sync cursor positions in real-time
 */
export function RemoteCursors({ awareness, textareaRef }: RemoteCursorsProps) {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateCursors = () => {
      const states = awareness.getStates();
      const currentClientId = awareness.clientID;
      const remoteCursors: CursorPosition[] = [];

      states.forEach((state, clientId) => {
        // Skip local user's cursor
        if (clientId === currentClientId) return;

        // Only show cursors for users with position data
        if (state.cursor && typeof state.cursor.position === 'number') {
          remoteCursors.push({
            clientId,
            name: state.name || 'Anonymous',
            color: state.color || '#999999',
            position: state.cursor.position,
            selectionStart: state.cursor.selectionStart,
            selectionEnd: state.cursor.selectionEnd,
          });
        }
      });

      setCursors(remoteCursors);
    };

    // Initial update
    updateCursors();

    // Listen for awareness changes
    awareness.on('change', updateCursors);

    return () => {
      awareness.off('change', updateCursors);
    };
  }, [awareness]);

  // Calculate cursor positions in pixels
  const getCursorStyle = (cursor: CursorPosition): React.CSSProperties => {
    const textarea = textareaRef.current;
    if (!textarea) return { display: 'none' };

    // Create a temporary div to measure text position
    const content = textarea.value;
    const textBeforeCursor = content.substring(0, cursor.position);

    // Count lines before cursor
    const lines = textBeforeCursor.split('\n');
    const lineNumber = lines.length - 1;
    const columnNumber = lines[lines.length - 1]?.length ?? 0;

    // Get textarea's computed style
    const styles = window.getComputedStyle(textarea);
    const fontSize = parseFloat(styles.fontSize);
    const lineHeight = parseFloat(styles.lineHeight) || fontSize * 1.2;
    const paddingTop = parseFloat(styles.paddingTop);
    const paddingLeft = parseFloat(styles.paddingLeft);

    // Approximate character width (monospace font)
    const charWidth = fontSize * 0.6;

    // Calculate position
    const top = paddingTop + lineNumber * lineHeight;
    const left = paddingLeft + columnNumber * charWidth;

    return {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      pointerEvents: 'none',
      zIndex: 10,
    };
  };

  return (
    <>
      {cursors.map((cursor) => {
        const hasSelection =
          cursor.selectionStart !== undefined &&
          cursor.selectionEnd !== undefined &&
          cursor.selectionStart !== cursor.selectionEnd;

        return (
          <div key={cursor.clientId}>
            {/* Cursor indicator */}
            <div
              className="remote-cursor"
              style={{
                ...getCursorStyle(cursor),
                borderLeft: `2px solid ${cursor.color}`,
                height: '1.2em',
              }}
              data-user={cursor.name}
            >
              {/* User name label */}
              <div
                className="cursor-label"
                style={{
                  backgroundColor: cursor.color,
                  color: 'white',
                  fontSize: '0.75em',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  position: 'absolute',
                  top: '-20px',
                  left: '0',
                  whiteSpace: 'nowrap',
                }}
                title={cursor.name}
              >
                {cursor.name}
              </div>
            </div>

            {/* Selection highlight */}
            {hasSelection && (
              <div
                className="remote-selection"
                style={{
                  backgroundColor: `${cursor.color}33`, // 20% opacity
                  position: 'absolute',
                  pointerEvents: 'none',
                  zIndex: 5,
                }}
                data-user={cursor.name}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
