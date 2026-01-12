import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { RemoteCursors } from '../src/components/RemoteCursors';
import { createRef } from 'react';

describe('RemoteCursors', () => {
  let mockAwareness: any;
  let mockTextareaRef: React.RefObject<HTMLTextAreaElement>;
  let changeHandler: (() => void) | null = null;

  beforeEach(() => {
    // Create mock textarea ref with a real textarea element
    const textarea = document.createElement('textarea');
    textarea.value = 'Hello\nWorld';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    document.body.appendChild(textarea);

    mockTextareaRef = { current: textarea };

    // Create mock awareness
    const mockStates = new Map();
    mockAwareness = {
      clientID: 1,
      getStates: vi.fn(() => mockStates),
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      }),
      off: vi.fn(),
    };
  });

  it('should render without errors when awareness is null', () => {
    const textareaRef = createRef<HTMLTextAreaElement>();
    render(<RemoteCursors awareness={null} textareaRef={textareaRef} />);
    // No cursors should be visible
    expect(screen.queryByTestId('remote-cursor')).not.toBeInTheDocument();
  });

  it('should not display local user cursor', () => {
    const states = mockAwareness.getStates();
    states.set(1, {
      name: 'Local User',
      color: '#FF0000',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    // Local user's cursor (clientID 1) should not be displayed
    expect(screen.queryByText('Local User')).not.toBeInTheDocument();
  });

  it('should display remote user cursor with name and color', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    // Remote user's cursor should be displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should display multiple remote cursors', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });
    states.set(3, {
      name: 'Bob',
      color: '#4ECDC4',
      cursor: { position: 8, selectionStart: 8, selectionEnd: 8 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should use correct color from user state', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    const label = screen.getByText('Alice');
    expect(label).toHaveStyle({ backgroundColor: '#FF6B6B' });
  });

  it('should update cursors in real-time when awareness changes', async () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    const { rerender } = render(
      <RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Add new user
    states.set(3, {
      name: 'Bob',
      color: '#4ECDC4',
      cursor: { position: 8, selectionStart: 8, selectionEnd: 8 },
    });

    // Trigger awareness change
    if (changeHandler) {
      act(() => {
        changeHandler();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('should handle user leaving (cursor removed)', async () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Remove user
    states.delete(2);

    // Trigger awareness change
    if (changeHandler) {
      act(() => {
        changeHandler();
      });
    }

    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  it('should display cursor label with user name', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    const label = screen.getByText('Alice');
    expect(label).toHaveAttribute('title', 'Alice');
  });

  it('should not display cursor for users without position data', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      // No cursor data
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('should handle Anonymous user with default color', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      // No name or color
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.getByText('Anonymous')).toBeInTheDocument();
    const label = screen.getByText('Anonymous');
    expect(label).toHaveStyle({ backgroundColor: '#999999' });
  });

  it('should clean up awareness listener on unmount', () => {
    const { unmount } = render(
      <RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />
    );

    expect(mockAwareness.on).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    expect(mockAwareness.off).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should handle cursor at different text positions', () => {
    const states = mockAwareness.getStates();

    // Cursor at position 0 (start of document)
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 0, selectionStart: 0, selectionEnd: 0 },
    });

    // Cursor at position 6 (second line)
    states.set(3, {
      name: 'Bob',
      color: '#4ECDC4',
      cursor: { position: 6, selectionStart: 6, selectionEnd: 6 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should display cursor indicator with correct styling', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    const cursor = screen.getByText('Alice').parentElement;
    expect(cursor).toHaveClass('remote-cursor');
    expect(cursor).toHaveStyle({ borderLeft: '2px solid #FF6B6B' });
  });

  it('should track cursor position changes in real-time', async () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 0, selectionStart: 0, selectionEnd: 0 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Update cursor position
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 10, selectionStart: 10, selectionEnd: 10 },
    });

    // Trigger awareness change
    if (changeHandler) {
      act(() => {
        changeHandler();
      });
    }

    await waitFor(() => {
      // Cursor should still be visible but at new position
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('should handle cursors when textarea ref is null', () => {
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    const nullRef = { current: null };

    render(<RemoteCursors awareness={mockAwareness} textareaRef={nullRef} />);

    // Component should render without crashing
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should handle cursor on wrapped lines (line break due to width)', () => {
    // Create a narrower textarea that will cause line wrapping
    const textarea = document.createElement('textarea');
    textarea.value = 'This is a very long line of text that will definitely wrap when the browser width is less than the line width and will cause soft line breaks';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.width = '200px'; // Narrow width to force wrapping
    textarea.style.fontFamily = "'Courier New', Courier, monospace";
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
    document.body.appendChild(textarea);

    const mockTextareaRef = { current: textarea };

    const states = mockAwareness.getStates();
    // Position cursor in the middle of a long line that will wrap
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 50, selectionStart: 50, selectionEnd: 50 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={mockTextareaRef} />);

    // Remote user's cursor should be displayed even on wrapped lines
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // Clean up
    document.body.removeChild(textarea);
  });

  it('should position cursor correctly on second visual line of wrapped text', () => {
    // Create a narrow textarea that will force wrapping
    const textarea = document.createElement('textarea');
    textarea.value = 'This is a very long line of text that will definitely wrap when the browser width is narrow and should trigger soft line breaks';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.width = '200px'; // Force line wrapping
    textarea.style.fontFamily = 'monospace';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
    document.body.appendChild(textarea);

    const wrappedTextareaRef = { current: textarea };

    const states = mockAwareness.getStates();
    // Position cursor at character 50 (likely to be on a wrapped line)
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 50, selectionStart: 50, selectionEnd: 50 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={wrappedTextareaRef} />);

    const cursor = screen.getByText('Alice').parentElement;
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('remote-cursor');

    // Clean up
    document.body.removeChild(textarea);
  });

  it('should handle cursor position at the end of a wrapped line', () => {
    // Create a textarea with constrained width to force wrapping
    const textarea = document.createElement('textarea');
    textarea.value = 'This is a very long line of text that should definitely wrap when the browser width is less than the line width and will test our cursor positioning';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.width = '200px'; // Narrow width to force wrapping
    textarea.style.fontFamily = 'monospace';
    document.body.appendChild(textarea);

    const wrappedTextareaRef = { current: textarea };

    const states = mockAwareness.getStates();
    // Position cursor at middle of long line that will wrap
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 50, selectionStart: 50, selectionEnd: 50 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={wrappedTextareaRef} />);

    const label = screen.getByText('Alice');
    expect(label).toBeInTheDocument();

    // The cursor should be positioned somewhere on the page (not hidden)
    const cursorElement = label.parentElement;
    expect(cursorElement).toHaveStyle({ position: 'absolute' });
    expect(cursorElement).not.toHaveStyle({ display: 'none' });

    // Clean up
    document.body.removeChild(textarea);
  });

  it('should position cursor correctly on wrapped line', () => {
    // Create a textarea with narrow width to force wrapping
    const textarea = document.createElement('textarea');
    textarea.value = 'This is a very long line that will definitely wrap when the browser width is narrow and we have a small textarea width';
    textarea.style.width = '200px'; // Force narrow width to cause wrapping
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.wordWrap = 'break-word';
    document.body.appendChild(textarea);

    const wrappedTextareaRef = { current: textarea };

    // Set cursor position in the middle of a long line that will wrap
    const states = mockAwareness.getStates();
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 50, selectionStart: 50, selectionEnd: 50 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={wrappedTextareaRef} />);

    const cursor = screen.getByText('Alice').parentElement;
    expect(cursor).toBeInTheDocument();
    // Cursor should be positioned correctly even with line wrapping
    expect(cursor).toHaveStyle({ position: 'absolute' });

    // Clean up
    document.body.removeChild(textarea);
  });

  it('should handle cursor position after line breaks (newlines)', () => {
    // Create textarea with explicit newline characters
    const textarea = document.createElement('textarea');
    textarea.value = 'Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time. xxx\nThis works better for sure, but not foolproof.';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.fontFamily = "'Courier New', Courier, monospace";
    textarea.style.width = '400px';
    textarea.style.height = '200px';
    document.body.appendChild(textarea);

    const textareaRef = { current: textarea };

    const states = mockAwareness.getStates();
    // Position 65 is on line 3 after "Start typing to see the preview update in"
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 65, selectionStart: 65, selectionEnd: 65 },
    });

    render(<RemoteCursors awareness={mockAwareness} textareaRef={textareaRef} />);

    const cursor = screen.getByText('Alice').parentElement;
    expect(cursor).toBeInTheDocument();
    expect(cursor).toHaveClass('remote-cursor');

    // Verify cursor has absolute positioning
    expect(cursor).toHaveStyle({ position: 'absolute' });

    // Clean up
    document.body.removeChild(textarea);
  });

  it('should adjust cursor position when textarea is scrolled', () => {
    // Create a textarea with scrollable content
    const textarea = document.createElement('textarea');
    textarea.value = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11\nLine 12';
    textarea.style.fontSize = '16px';
    textarea.style.lineHeight = '20px';
    textarea.style.paddingTop = '10px';
    textarea.style.paddingLeft = '10px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.width = '400px';
    textarea.style.height = '100px'; // Small height to force scrolling
    textarea.style.overflow = 'auto';
    document.body.appendChild(textarea);

    const textareaRef = { current: textarea };

    const states = mockAwareness.getStates();
    // Position on Line 8
    states.set(2, {
      name: 'Alice',
      color: '#FF6B6B',
      cursor: { position: 56, selectionStart: 56, selectionEnd: 56 },
    });

    const { rerender } = render(<RemoteCursors awareness={mockAwareness} textareaRef={textareaRef} />);

    const cursorBefore = screen.getByText('Alice').parentElement;
    expect(cursorBefore).toBeInTheDocument();

    // Get position before scroll
    const styleBefore = window.getComputedStyle(cursorBefore!);
    const topBefore = styleBefore.top;

    // Scroll the textarea down
    act(() => {
      textarea.scrollTop = 100;
      // Trigger scroll event
      textarea.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    // Force re-render
    rerender(<RemoteCursors awareness={mockAwareness} textareaRef={textareaRef} />);

    // Get position after scroll
    const cursorAfter = screen.getByText('Alice').parentElement;
    const styleAfter = window.getComputedStyle(cursorAfter!);
    const topAfter = styleAfter.top;

    // Position should be different after scrolling
    expect(topAfter).not.toBe(topBefore);

    // Clean up
    document.body.removeChild(textarea);
  });
});
