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
});
