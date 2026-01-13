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

  // Calculate cursor positions in pixels
  const getCursorStyle = (cursor: CursorPosition): React.CSSProperties => {
    const textarea = textareaRef.current;
    if (!textarea) return { display: 'none' };

    try {
      // Use a mirror div technique to accurately measure text position including line wraps
      const content = textarea.value;
      const textBeforeCursor = content.substring(0, cursor.position);

      // Create a hidden mirror div with identical styling
      const mirror = document.createElement('div');
      const styles = window.getComputedStyle(textarea);

      // Copy all relevant styles from textarea to mirror
      const stylesToCopy = [
        'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'textTransform',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderWidth', 'boxSizing', 'wordWrap', 'overflowWrap'
      ];

      stylesToCopy.forEach(prop => {
        const value = styles[prop as any];
        if (value !== undefined && value !== null) {
          mirror.style[prop as any] = value;
        }
      });

      // Set width explicitly
      mirror.style.width = `${textarea.clientWidth}px`;

      // Additional styles for mirror
      mirror.style.position = 'absolute';
      mirror.style.top = '-9999px'; // Off-screen but still rendered
      mirror.style.left = '-9999px';
      mirror.style.visibility = 'hidden';
      mirror.style.height = 'auto';
      mirror.style.overflow = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.pointerEvents = 'none';

      // Add text before cursor
      const textNode = document.createTextNode(textBeforeCursor);
      mirror.appendChild(textNode);

      // Add a marker span at the cursor position
      const marker = document.createElement('span');
      marker.textContent = '|';
      marker.style.display = 'inline';
      mirror.appendChild(marker);

      // Temporarily add mirror to DOM for measurement
      document.body.appendChild(mirror);

      // Force layout calculation
      mirror.offsetHeight;

      // Get marker position
      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      // Calculate relative position from mirror top-left
      // The mirror already has padding, so the marker position includes padding offset
      const top = markerRect.top - mirrorRect.top;
      const left = markerRect.left - mirrorRect.left;

      // Clean up
      document.body.removeChild(mirror);

      // Validate position values
      if (isNaN(top) || isNaN(left)) {
        console.warn('Invalid cursor position calculated:', { top, left, cursor });
        return { display: 'none' };
      }

      // Adjust for textarea scroll position
      const adjustedTop = top - textarea.scrollTop;
      const adjustedLeft = left - textarea.scrollLeft;

      return {
        position: 'absolute',
        top: `${adjustedTop}px`,
        left: `${adjustedLeft}px`,
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
