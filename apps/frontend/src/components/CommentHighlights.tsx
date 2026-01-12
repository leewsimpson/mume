import { useEffect, useState, useCallback, useMemo } from 'react';

export interface CommentRange {
  id: number;
  charStart: number;
  charEnd: number;
  resolved: boolean;
}

interface CommentHighlightsProps {
  comments: CommentRange[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showResolved: boolean;
  activeCommentId: number | null;
  onHighlightClick?: (commentId: number) => void;
}

interface HighlightRect {
  commentId: number;
  top: number;
  left: number;
  width: number;
  height: number;
  resolved: boolean;
  isActive: boolean;
}

/**
 * CommentHighlights component displays visual highlights in the editor
 * for text ranges that have comments attached.
 * Uses mirror-div technique for accurate positioning (same as RemoteCursors).
 */
export function CommentHighlights({
  comments,
  textareaRef,
  showResolved,
  activeCommentId,
  onHighlightClick,
}: CommentHighlightsProps) {
  const [highlights, setHighlights] = useState<HighlightRect[]>([]);
  const [, forceUpdate] = useState(0);

  // Filter comments based on resolved state
  const visibleComments = useMemo(() => {
    return comments.filter(comment => showResolved || !comment.resolved);
  }, [comments, showResolved]);

  // Calculate highlight rectangles for a text range
  const calculateRangeRects = useCallback((
    textarea: HTMLTextAreaElement,
    charStart: number,
    charEnd: number,
    commentId: number,
    resolved: boolean,
    isActive: boolean
  ): HighlightRect[] => {
    const content = textarea.value;
    const textBeforeStart = content.substring(0, charStart);
    const selectedText = content.substring(charStart, charEnd);

    if (!selectedText) return [];

    try {
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
        const value = styles.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (value) {
          mirror.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), value);
        }
      });

      // Set width explicitly
      mirror.style.width = `${textarea.clientWidth}px`;

      // Additional styles for mirror
      mirror.style.position = 'absolute';
      mirror.style.top = '-9999px';
      mirror.style.left = '-9999px';
      mirror.style.visibility = 'hidden';
      mirror.style.height = 'auto';
      mirror.style.overflow = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.pointerEvents = 'none';

      // Add text before the selection
      const textBefore = document.createTextNode(textBeforeStart);
      mirror.appendChild(textBefore);

      // Add a span for the selected text to measure its bounds
      const selectionSpan = document.createElement('span');
      selectionSpan.textContent = selectedText;
      selectionSpan.style.backgroundColor = 'transparent';
      mirror.appendChild(selectionSpan);

      // Add remaining text to ensure proper line breaks
      const textAfter = document.createTextNode(content.substring(charEnd));
      mirror.appendChild(textAfter);

      // Temporarily add mirror to DOM for measurement
      document.body.appendChild(mirror);

      // Force layout calculation
      mirror.offsetHeight;

      // Get selection span bounds
      const spanRect = selectionSpan.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();

      // Calculate relative position from mirror top-left
      const top = spanRect.top - mirrorRect.top;
      const left = spanRect.left - mirrorRect.left;
      const width = spanRect.width;
      const height = spanRect.height;

      // Clean up
      document.body.removeChild(mirror);

      // Validate position values
      if (isNaN(top) || isNaN(left) || isNaN(width) || isNaN(height)) {
        console.warn('Invalid highlight position calculated:', { top, left, width, height });
        return [];
      }

      // Adjust for textarea scroll position
      const adjustedTop = top - textarea.scrollTop;
      const adjustedLeft = left - textarea.scrollLeft;

      return [{
        commentId,
        top: adjustedTop,
        left: adjustedLeft,
        width,
        height,
        resolved,
        isActive,
      }];
    } catch (error) {
      console.error('Error calculating highlight position:', error);
      return [];
    }
  }, []);

  // Recalculate all highlights
  const updateHighlights = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setHighlights([]);
      return;
    }

    const allRects: HighlightRect[] = [];

    for (const comment of visibleComments) {
      const isActive = comment.id === activeCommentId;
      const rects = calculateRangeRects(
        textarea,
        comment.charStart,
        comment.charEnd,
        comment.id,
        comment.resolved,
        isActive
      );
      allRects.push(...rects);
    }

    setHighlights(allRects);
  }, [visibleComments, activeCommentId, textareaRef, calculateRangeRects]);

  // Update highlights when comments or content changes
  useEffect(() => {
    updateHighlights();
  }, [updateHighlights]);

  // Update highlight positions when textarea scrolls
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleScroll = () => {
      // Force re-render to recalculate highlight positions with new scroll offset
      forceUpdate(prev => prev + 1);
      updateHighlights();
    };

    // Listen for input to update when content changes
    const handleInput = () => {
      // Small delay to let the textarea value update
      requestAnimationFrame(updateHighlights);
    };

    textarea.addEventListener('scroll', handleScroll);
    textarea.addEventListener('input', handleInput);

    return () => {
      textarea.removeEventListener('scroll', handleScroll);
      textarea.removeEventListener('input', handleInput);
    };
  }, [textareaRef, updateHighlights]);

  // Handle click on highlight
  const handleHighlightClick = (e: React.MouseEvent, commentId: number) => {
    e.stopPropagation();
    onHighlightClick?.(commentId);
  };

  // Get background colour based on state
  const getHighlightColour = (highlight: HighlightRect): string => {
    if (highlight.isActive) {
      // Active highlight: brighter yellow
      return 'rgba(255, 213, 79, 0.5)'; // Amber with 50% opacity
    }
    if (highlight.resolved) {
      // Resolved: grey
      return 'rgba(158, 158, 158, 0.2)'; // Grey with 20% opacity
    }
    // Normal comment: yellow
    return 'rgba(255, 235, 59, 0.25)'; // Yellow with 25% opacity
  };

  if (highlights.length === 0) {
    return null;
  }

  return (
    <>
      {highlights.map((highlight, index) => (
        <div
          key={`${highlight.commentId}-${index}`}
          className={`comment-highlight ${highlight.isActive ? 'comment-highlight--active' : ''} ${highlight.resolved ? 'comment-highlight--resolved' : ''}`}
          style={{
            position: 'absolute',
            top: `${highlight.top}px`,
            left: `${highlight.left}px`,
            width: `${highlight.width}px`,
            height: `${highlight.height}px`,
            backgroundColor: getHighlightColour(highlight),
            borderBottom: highlight.isActive ? '2px solid rgba(255, 152, 0, 0.8)' : '1px solid rgba(255, 193, 7, 0.4)',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: highlight.isActive ? 6 : 5,
            transition: 'background-color 0.2s ease, border-bottom 0.2s ease',
          }}
          onClick={(e) => handleHighlightClick(e, highlight.commentId)}
          title="Click to view comment"
          data-comment-id={highlight.commentId}
        />
      ))}
    </>
  );
}
