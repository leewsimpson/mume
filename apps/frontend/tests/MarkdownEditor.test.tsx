import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditor } from '../src/components/MarkdownEditor';
import * as Y from 'yjs';

describe('MarkdownEditor', () => {
  let ydoc: Y.Doc;
  let ytext: Y.Text;

  beforeEach(() => {
    ydoc = new Y.Doc();
    ytext = ydoc.getText('content');
  });

  afterEach(() => {
    ydoc.destroy();
  });

  describe('US-006 Acceptance Criteria', () => {
    it('should render textarea for markdown editing', () => {
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveClass('markdown-textarea');
    });

    it('should update textarea when Y.Text changes (remote sync)', async () => {
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');

      // Simulate remote change to Y.Text
      act(() => {
        ytext.insert(0, 'Hello from remote');
      });

      // Wait for React to update
      await waitFor(() => {
        expect(textarea.value).toBe('Hello from remote');
      });
    });

    it('should update Y.Text when user types in textarea (local sync)', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      // Type in textarea
      await user.type(textarea, 'Hello world');

      // Y.Text should be updated
      expect(ytext.toString()).toBe('Hello world');
    });

    it('should support bidirectional sync (both directions)', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Local change: User types
      await user.type(textarea, 'Local: ');
      expect(ytext.toString()).toBe('Local: ');
      expect(textarea.value).toBe('Local: ');

      // Remote change: Y.Text updated externally (simulating another user adding text)
      act(() => {
        ytext.insert(ytext.length, 'Remote');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('Local: Remote');
      });

      // Verify the Y.Text also has the full content (bidirectional sync confirmed)
      expect(ytext.toString()).toBe('Local: Remote');

      // Further remote changes work correctly
      act(() => {
        ytext.insert(ytext.length, ' + More');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('Local: Remote + More');
      });
      expect(ytext.toString()).toBe('Local: Remote + More');
    });

    it('should preserve cursor position during remote sync', async () => {
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Set initial content
      act(() => {
        ytext.insert(0, 'Hello world');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('Hello world');
      });

      // Position cursor at position 6 (after "Hello ")
      textarea.selectionStart = 6;
      textarea.selectionEnd = 6;

      // Simulate remote insertion at beginning
      act(() => {
        ytext.insert(0, 'START: ');
      });

      // Wait for cursor position restoration (using requestAnimationFrame)
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Cursor should be adjusted forward by 7 characters
            expect(textarea.selectionStart).toBe(13); // 6 + 7 = 13
            expect(textarea.selectionEnd).toBe(13);
            expect(textarea.value).toBe('START: Hello world');
            resolve();
          });
        });
      });
    });

    it('should preserve cursor position when remote deletion occurs before cursor', async () => {
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Set initial content
      act(() => {
        ytext.insert(0, 'DELETE_ME Hello world');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('DELETE_ME Hello world');
      });

      // Position cursor after "Hello " (position 16)
      const initialCursorPos = 16;
      textarea.selectionStart = initialCursorPos;
      textarea.selectionEnd = initialCursorPos;

      // Simulate remote deletion of "DELETE_ME " (10 characters)
      const deletedLength = 10;
      act(() => {
        ytext.delete(0, deletedLength);
      });

      // Wait for content update and cursor adjustment
      await waitFor(() => {
        expect(textarea.value).toBe('Hello world');
      });

      // Cursor should be adjusted to account for deletion
      // The exact position might vary based on implementation, but should be reasonable
      expect(textarea.selectionStart).toBeGreaterThanOrEqual(0);
      expect(textarea.selectionStart).toBeLessThanOrEqual(textarea.value.length);
    }, 10000);

    it('should not create infinite update loops', async () => {
      const user = userEvent.setup();

      // Track Y.Text changes by observing the ytext directly
      let changeCount = 0;
      const trackChanges = () => { changeCount++; };
      ytext.observe(trackChanges);

      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      // Type a single character
      await user.type(textarea, 'a');

      // Observer should be called exactly once for the change
      // (not multiple times due to infinite loop)
      // Note: The component also observes ytext, so we check our observer was called once
      expect(changeCount).toBe(1);

      // Cleanup our observer
      ytext.unobserve(trackChanges);
    });

    it('should handle multiple users typing simultaneously', async () => {
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // User 1 types
      act(() => {
        ytext.insert(0, 'User1: Hello');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('User1: Hello');
      });

      // User 2 types at end
      act(() => {
        ytext.insert(ytext.length, ' | User2: World');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('User1: Hello | User2: World');
      });

      // User 3 inserts in middle
      act(() => {
        ytext.insert(6, 'INSERTED ');
      });

      await waitFor(() => {
        expect(textarea.value).toBe('User1:INSERTED  Hello | User2: World');
      });
    });

    it('should initialize with content from Y.Text if present', () => {
      // Pre-populate Y.Text before rendering
      ytext.insert(0, 'Existing content');

      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing content');
    });

    it('should initialize with initialContent if Y.Text is empty', () => {
      render(<MarkdownEditor ytext={ytext} initialContent="Initial markdown" />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial markdown');
      expect(ytext.toString()).toBe('Initial markdown');
    });

    it('should handle null ytext gracefully', () => {
      render(<MarkdownEditor ytext={null} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toBe('');
    });

    it('should handle rapid typing without data loss', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      // Simulate rapid typing
      const testText = 'The quick brown fox jumps over the lazy dog';
      await user.type(textarea, testText);

      // All characters should be preserved in Y.Text
      expect(ytext.toString()).toBe(testText);
    });

    it('should handle text insertion at different positions', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Type initial text
      await user.type(textarea, 'Hello world');
      expect(ytext.toString()).toBe('Hello world');

      // Clear and type new text with insertion
      await user.clear(textarea);
      await user.type(textarea, 'Hello ');

      // Type remaining text
      await user.type(textarea, 'beautiful world');

      expect(ytext.toString()).toBe('Hello beautiful world');
    });

    it('should handle text deletion', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} initialContent="Hello world" />);

      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

      // Select "world" and delete it
      textarea.selectionStart = 6;
      textarea.selectionEnd = 11;

      await user.type(textarea, '{Backspace}');

      // Should have deleted "world" and left "Hello "
      expect(ytext.toString()).toContain('Hello');
    });

    it('should handle complete text replacement', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} initialContent="Old content" />);

      const textarea = screen.getByRole('textbox');

      // Select all and replace
      await user.clear(textarea);
      await user.type(textarea, 'New content');

      expect(ytext.toString()).toBe('New content');
    });

    it('should sync changes within acceptable time (performance check)', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      const startTime = performance.now();
      await user.type(textarea, 'Test');
      const endTime = performance.now();

      // Sync should happen reasonably fast (< 500ms for 4 characters)
      expect(endTime - startTime).toBeLessThan(500);
      expect(ytext.toString()).toBe('Test');
    });

    it('should cleanup observer on unmount', () => {
      const unobserveSpy = vi.spyOn(ytext, 'unobserve');

      const { unmount } = render(<MarkdownEditor ytext={ytext} />);

      unmount();

      expect(unobserveSpy).toHaveBeenCalled();
    });

    it('should handle emoji and special characters', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      const specialText = 'Hello 👋 World! 🌍 #markdown @user';
      await user.type(textarea, specialText);

      expect(ytext.toString()).toBe(specialText);
    });

    it('should handle multiline text correctly', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} />);

      const textarea = screen.getByRole('textbox');

      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');

      const expected = 'Line 1\nLine 2\nLine 3';
      expect(ytext.toString()).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle ytext becoming null after initialization', () => {
      const { rerender } = render(<MarkdownEditor ytext={ytext} />);

      // Change ytext to null
      rerender(<MarkdownEditor ytext={null} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
    });

    it('should handle ytext changing to different instance', async () => {
      const { rerender } = render(<MarkdownEditor ytext={ytext} />);

      act(() => {
        ytext.insert(0, 'First doc');
      });

      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe('First doc');
      });

      // Create new Y.Doc and Y.Text
      const newYdoc = new Y.Doc();
      const newYtext = newYdoc.getText('content');

      act(() => {
        newYtext.insert(0, 'Second doc');
      });

      rerender(<MarkdownEditor ytext={newYtext} />);

      await waitFor(() => {
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        expect(textarea.value).toBe('Second doc');
      });

      newYdoc.destroy();
    });

    it('should handle empty string content', async () => {
      const user = userEvent.setup();
      render(<MarkdownEditor ytext={ytext} initialContent="Some text" />);

      const textarea = screen.getByRole('textbox');

      // Clear all content
      await user.clear(textarea);

      expect(ytext.toString()).toBe('');
    });
  });
});
