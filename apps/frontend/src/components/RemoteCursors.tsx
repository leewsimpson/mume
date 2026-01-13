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
  const [, forceUpdate] = useState(0);

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

  // Update cursor positions when textarea scrolls
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleScroll = () => {
      // Force re-render to recalculate cursor positions with new scroll offset
      forceUpdate(prev => prev + 1);
    };

    textarea.addEventListener('scroll', handleScroll);

    return () => {
      textarea.removeEventListener('scroll', handleScroll);
    };
  }, [textareaRef]);

  // Calculate cursor position in pixels using textarea-caret technique
  const getCursorStyle = (cursor: CursorPosition): React.CSSProperties => {
    const textarea = textareaRef.current;
    if (!textarea) return { display: 'none' };

    try {
      const content = textarea.value;
      const position = cursor.position;
      
      // Clamp position to valid range
      const clampedPosition = Math.max(0, Math.min(position, content.length));
      const textBeforeCursor = content.substring(0, clampedPosition);

      // Get textarea's bounding rect and computed styles
      const textareaRect = textarea.getBoundingClientRect();
      const styles = window.getComputedStyle(textarea);

      // Create a mirror div positioned exactly over the textarea
      const mirror = document.createElement('div');

      // Copy all text-affecting styles
      const properties = [
        'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'borderStyle', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize',
        'fontSizeAdjust', 'lineHeight', 'fontFamily', 'textAlign', 'textTransform',
        'textIndent', 'textDecoration', 'letterSpacing', 'wordSpacing',
        'tabSize', 'MozTabSize'
      ];

      properties.forEach(prop => {
        const value = styles.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (value) {
          mirror.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
        }
      });

      // Position mirror exactly over the textarea
      mirror.style.position = 'absolute';
      mirror.style.top = `${textareaRect.top + window.scrollY}px`;
      mirror.style.left = `${textareaRect.left + window.scrollX}px`;
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.overflow = 'hidden';

      // Add text before cursor
      const textNode = document.createTextNode(textBeforeCursor);
      mirror.appendChild(textNode);

      // Add marker span
      const marker = document.createElement('span');
      marker.textContent = '\u200B'; // Zero-width space for reliable positioning
      mirror.appendChild(marker);

      // Add to DOM for measurement
      document.body.appendChild(mirror);
      
      // Force layout
      mirror.offsetHeight;

      // Get marker position relative to viewport
      const markerRect = marker.getBoundingClientRect();

      // Clean up
      document.body.removeChild(mirror);

      // Calculate position relative to textarea (accounting for scroll)
      const top = markerRect.top - textareaRect.top - textarea.scrollTop;
      const left = markerRect.left - textareaRect.left - textarea.scrollLeft;

      if (isNaN(top) || isNaN(left)) {
        console.warn('Invalid cursor position:', { top, left, cursor });
        return { display: 'none' };
      }

      return {
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        pointerEvents: 'none',
        zIndex: 10,
      };
    } catch (error) {
      console.error('Error calculating cursor position:', error);
      return { display: 'none' };
    }
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
              data-testid="remote-cursor"
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
