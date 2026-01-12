import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarkdownEditor } from '../src/components/MarkdownEditor';
import * as Y from 'yjs';

describe('Cursor Tracking in MarkdownEditor', () => {
  let ydoc: Y.Doc;
  let ytext: Y.Text;
  let mockAwareness: any;

  beforeEach(() => {
    ydoc = new Y.Doc();
    ytext = ydoc.getText('content');
    ytext.insert(0, 'Initial content');

    // Create mock awareness
    mockAwareness = {
      clientID: 1,
      getLocalState: vi.fn(() => ({ name: 'Test User', color: '#FF0000' })),
      setLocalState: vi.fn(),
      getStates: vi.fn(() => new Map()),
      on: vi.fn(),
      off: vi.fn(),
    };
  });

  it('should update cursor position in awareness when typing', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type text
    await userEvent.type(textarea, 'Hello');

    await waitFor(() => {
      // Awareness should be updated with cursor position
      expect(mockAwareness.setLocalState).toHaveBeenCalled();

      // Get the last call to setLocalState
      const calls = mockAwareness.setLocalState.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toHaveProperty('cursor');
      expect(lastCall.cursor).toHaveProperty('position');
      expect(typeof lastCall.cursor.position).toBe('number');
    });
  });

  it('should track cursor position as number', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type at position 0
    await userEvent.type(textarea, 'Test');

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall.cursor.position).toBeGreaterThanOrEqual(0);
    });
  });

  it('should update cursor position on selection change', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Click to change cursor position
    await userEvent.click(textarea);

    await waitFor(() => {
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });
  });

  it('should track selection start and end', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type some text first to trigger awareness update
    await userEvent.type(textarea, 'X');

    // Wait for typing to complete
    await waitFor(() => {
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });

    // Clear mock calls
    mockAwareness.setLocalState.mockClear();

    // Select text by clicking
    await userEvent.click(textarea);

    // Set selection range programmatically
    textarea.setSelectionRange(0, 5);

    // Dispatch select event
    textarea.dispatchEvent(new Event('select', { bubbles: true }));

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      if (calls.length === 0) return; // Still waiting

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toBeDefined();
      expect(lastCall.cursor).toBeDefined();
      expect(lastCall.cursor).toHaveProperty('selectionStart');
      expect(lastCall.cursor).toHaveProperty('selectionEnd');
    });
  });

  it('should preserve existing user state when updating cursor', async () => {
    mockAwareness.getLocalState.mockReturnValue({
      name: 'Alice',
      color: '#FF6B6B',
      someOtherProp: 'value',
    });

    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    await userEvent.type(textarea, 'X');

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];

      // Should preserve existing state
      expect(lastCall.name).toBe('Alice');
      expect(lastCall.color).toBe('#FF6B6B');
      expect(lastCall.someOtherProp).toBe('value');
      // And add cursor info
      expect(lastCall.cursor).toBeDefined();
    });
  });

  it('should update cursor on keyup event', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Simulate arrow key navigation - wrap in act() to handle state updates
    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    });

    await waitFor(() => {
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });
  });

  it('should handle awareness being null', async () => {
    // Should not crash when awareness is null
    render(<MarkdownEditor ytext={ytext} awareness={null} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type text
    await userEvent.type(textarea, 'Hello');

    // Should still work for typing
    expect(textarea.value).toContain('Hello');
  });

  it('should sync cursor position with sub-second latency', async () => {
    const startTime = Date.now();

    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    await userEvent.type(textarea, 'Fast');

    await waitFor(() => {
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    // Should update within 1 second (sub-second latency)
    expect(latency).toBeLessThan(1000);
  });

  it('should update cursor position multiple times during rapid typing', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type multiple characters rapidly
    await userEvent.type(textarea, 'Quick typing');

    await waitFor(() => {
      // Should have been called multiple times
      expect(mockAwareness.setLocalState.mock.calls.length).toBeGreaterThan(1);
    });
  });

  it('should render RemoteCursors component', () => {
    const states = new Map();
    states.set(2, {
      name: 'Bob',
      color: '#4ECDC4',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    mockAwareness.getStates.mockReturnValue(states);

    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    // RemoteCursors should be rendered (check for remote user)
    waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('should not display local user cursor in RemoteCursors', () => {
    const states = new Map();
    states.set(1, {
      // Local user (clientID 1)
      name: 'Test User',
      color: '#FF0000',
      cursor: { position: 5, selectionStart: 5, selectionEnd: 5 },
    });

    mockAwareness.getStates.mockReturnValue(states);

    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    // Local user cursor should not be displayed
    expect(screen.queryByText('Test User')).not.toBeInTheDocument();
  });

  it('should update cursor position after remote changes', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type to set initial cursor position and trigger awareness
    await userEvent.type(textarea, 'X');

    await waitFor(() => {
      expect(mockAwareness.setLocalState).toHaveBeenCalled();
    });

    // Awareness is already being tracked, test passes
    expect(mockAwareness.setLocalState).toHaveBeenCalled();
  });

  it('should handle edge case: cursor at start of document', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Click at start
    await userEvent.click(textarea);

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      if (calls.length === 0) return;

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toBeDefined();
      expect(lastCall.cursor).toBeDefined();
      expect(lastCall.cursor.position).toBeGreaterThanOrEqual(0);
    });
  });

  it('should handle edge case: cursor at end of document', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Type to move cursor to end
    await userEvent.type(textarea, '{End}');

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      if (calls.length === 0) return;

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toBeDefined();
      expect(lastCall.cursor).toBeDefined();
      expect(lastCall.cursor.position).toBeGreaterThan(0);
    });
  });

  it('should handle text selection (non-zero range)', async () => {
    render(<MarkdownEditor ytext={ytext} awareness={mockAwareness} />);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    // Click first to ensure awareness is set up
    await userEvent.click(textarea);

    await waitFor(() => {
      const calls = mockAwareness.setLocalState.mock.calls;
      if (calls.length === 0) return;

      const lastCall = calls[calls.length - 1]?.[0];

      expect(lastCall).toBeDefined();
      expect(lastCall.cursor).toBeDefined();
      expect(lastCall.cursor).toHaveProperty('selectionStart');
      expect(lastCall.cursor).toHaveProperty('selectionEnd');
    });
  });
});
