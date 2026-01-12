import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommentHighlights, type CommentRange } from '../src/components/CommentHighlights';
import React from 'react';

describe('CommentHighlights', () => {
  let textareaRef: React.RefObject<HTMLTextAreaElement>;
  let textarea: HTMLTextAreaElement;

  beforeEach(() => {
    // Create a real textarea element for testing
    textarea = document.createElement('textarea');
    textarea.value = 'Hello World, this is a test document with some text for commenting.';
    textarea.style.width = '400px';
    textarea.style.height = '200px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.lineHeight = '1.5';
    document.body.appendChild(textarea);

    textareaRef = { current: textarea };
  });

  afterEach(() => {
    cleanup();
    if (textarea && textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  });

  describe('Rendering', () => {
    it('renders nothing when comments array is empty', () => {
      const { container } = render(
        <CommentHighlights
          comments={[]}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      expect(container.innerHTML).toBe('');
    });

    it('renders highlight elements for comments', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
        { id: 2, charStart: 12, charEnd: 16, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights.length).toBe(2);
    });

    it('adds data-comment-id attribute to highlights', () => {
      const comments: CommentRange[] = [
        { id: 42, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight');
      expect(highlight?.getAttribute('data-comment-id')).toBe('42');
    });
  });

  describe('Resolved comments filtering', () => {
    it('hides resolved comments when showResolved is false', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
        { id: 2, charStart: 12, charEnd: 16, resolved: true },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights.length).toBe(1);
      expect(highlights[0]?.getAttribute('data-comment-id')).toBe('1');
    });

    it('shows resolved comments when showResolved is true', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
        { id: 2, charStart: 12, charEnd: 16, resolved: true },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={true}
          activeCommentId={null}
        />
      );

      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights.length).toBe(2);
    });

    it('applies resolved class to resolved comment highlights', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: true },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={true}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight');
      expect(highlight?.classList.contains('comment-highlight--resolved')).toBe(true);
    });
  });

  describe('Active comment highlighting', () => {
    it('applies active class to active comment highlight', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
        { id: 2, charStart: 12, charEnd: 16, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={2}
        />
      );

      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights[0]?.classList.contains('comment-highlight--active')).toBe(false);
      expect(highlights[1]?.classList.contains('comment-highlight--active')).toBe(true);
    });

    it('does not apply active class when activeCommentId is null', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight');
      expect(highlight?.classList.contains('comment-highlight--active')).toBe(false);
    });
  });

  describe('Click handling', () => {
    it('calls onHighlightClick with comment id when highlight is clicked', () => {
      const onHighlightClick = vi.fn();
      const comments: CommentRange[] = [
        { id: 42, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
          onHighlightClick={onHighlightClick}
        />
      );

      const highlight = container.querySelector('.comment-highlight');
      expect(highlight).not.toBeNull();
      fireEvent.click(highlight!);

      expect(onHighlightClick).toHaveBeenCalledTimes(1);
      expect(onHighlightClick).toHaveBeenCalledWith(42);
    });

    it('stops event propagation on click', () => {
      const parentClickHandler = vi.fn();
      const onHighlightClick = vi.fn();
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <div onClick={parentClickHandler}>
          <CommentHighlights
            comments={comments}
            textareaRef={textareaRef}
            showResolved={false}
            activeCommentId={null}
            onHighlightClick={onHighlightClick}
          />
        </div>
      );

      const highlight = container.querySelector('.comment-highlight');
      fireEvent.click(highlight!);

      expect(onHighlightClick).toHaveBeenCalledTimes(1);
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Positioning', () => {
    it('applies position absolute to highlights', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight') as HTMLElement;
      expect(highlight?.style.position).toBe('absolute');
    });

    it('applies cursor pointer style to highlights', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight') as HTMLElement;
      expect(highlight?.style.cursor).toBe('pointer');
    });

    it('has click tooltip title', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight');
      expect(highlight?.getAttribute('title')).toBe('Click to view comment');
    });
  });

  describe('Colour styling', () => {
    it('applies yellow background to normal comments', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight') as HTMLElement;
      // Yellow with 25% opacity for normal comments
      expect(highlight?.style.backgroundColor).toContain('rgba(255, 235, 59');
    });

    it('applies grey background to resolved comments', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: true },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={true}
          activeCommentId={null}
        />
      );

      const highlight = container.querySelector('.comment-highlight') as HTMLElement;
      // Grey with 20% opacity for resolved comments
      expect(highlight?.style.backgroundColor).toContain('rgba(158, 158, 158');
    });

    it('applies amber background to active comments', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={1}
        />
      );

      const highlight = container.querySelector('.comment-highlight') as HTMLElement;
      // Amber with 50% opacity for active comments
      expect(highlight?.style.backgroundColor).toContain('rgba(255, 213, 79');
    });
  });

  describe('Empty textarea handling', () => {
    it('handles null textareaRef gracefully', () => {
      const nullRef = { current: null };
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={nullRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      // Should render nothing when textarea is null
      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights.length).toBe(0);
    });
  });

  describe('Z-index ordering', () => {
    it('applies higher z-index to active highlights', () => {
      const comments: CommentRange[] = [
        { id: 1, charStart: 0, charEnd: 5, resolved: false },
        { id: 2, charStart: 12, charEnd: 16, resolved: false },
      ];

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={1}
        />
      );

      const highlights = container.querySelectorAll('.comment-highlight') as NodeListOf<HTMLElement>;
      // Active highlight should have higher z-index
      expect(highlights[0]?.style.zIndex).toBe('6');
      expect(highlights[1]?.style.zIndex).toBe('5');
    });
  });

  describe('Performance', () => {
    it('handles many comments efficiently', () => {
      // Update textarea with longer content
      textarea.value = 'A'.repeat(200); // 200 characters

      // Create 50 comments with valid non-overlapping ranges
      const comments: CommentRange[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        charStart: i * 4,
        charEnd: i * 4 + 2,
        resolved: false,
      }));

      const startTime = performance.now();

      const { container } = render(
        <CommentHighlights
          comments={comments}
          textareaRef={textareaRef}
          showResolved={false}
          activeCommentId={null}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 500ms)
      expect(renderTime).toBeLessThan(500);

      // Verify at least some highlights are rendered (may vary based on implementation)
      const highlights = container.querySelectorAll('.comment-highlight');
      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights.length).toBeLessThanOrEqual(50);
    });
  });
});
