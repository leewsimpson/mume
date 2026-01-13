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

  // Calculate highlight rectangles for a text range using textarea-caret technique
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

      // Add to DOM for measurement
      document.body.appendChild(mirror);

      // Force layout calculation
      mirror.offsetHeight;

      // Get selection span bounds relative to viewport
      const spanRect = selectionSpan.getBoundingClientRect();

      // Clean up
      document.body.removeChild(mirror);

      // Calculate position relative to textarea (accounting for scroll)
      const top = spanRect.top - textareaRect.top - textarea.scrollTop;
      const left = spanRect.left - textareaRect.left - textarea.scrollLeft;
      const width = spanRect.width;
      const height = spanRect.height;

      // Validate position values
      if (isNaN(top) || isNaN(left) || isNaN(width) || isNaN(height)) {
        console.warn('Invalid highlight position calculated:', { top, left, width, height });
        return [];
      }

      return [{
        commentId,
        top,
        left,
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
          data-testid="comment-highlight"
          data-resolved={highlight.resolved ? 'true' : 'false'}
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
