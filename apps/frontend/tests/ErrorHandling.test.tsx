import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { EditorLayout } from '../src/components/EditorLayout';

// Mock all child components
vi.mock('../src/hooks/useYjsProvider', () => ({
  useYjsProvider: vi.fn(() => ({
    ydoc: null,
    ytext: null,
    provider: null,
    awareness: null,
    status: 'connected',
    error: null,
    reconnectAttempts: 0,
  })),
}));

vi.mock('../src/components/MarkdownEditor', () => ({
  MarkdownEditor: () => <textarea data-testid="markdown-editor" />,
}));

vi.mock('../src/components/MarkdownPreview', () => ({
  MarkdownPreview: () => <div data-testid="markdown-preview">Preview</div>,
}));

vi.mock('../src/components/UserPresence', () => ({
  UserPresence: () => <div data-testid="user-presence">Users</div>,
}));

vi.mock('../src/components/ConnectionStatus', () => ({
  ConnectionStatus: ({ status }: { status: string }) => (
    <div data-testid="connection-status">{status}</div>
  ),
}));

describe('Error Handling in EditorLayout', () => {
  let mockUseYjsProvider: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import('../src/hooks/useYjsProvider');
    mockUseYjsProvider = vi.mocked(module.useYjsProvider);
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connected',
      error: null,
      reconnectAttempts: 0,
    });
  });

  it('should not display error banner when no error exists', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connected',
      error: null,
      reconnectAttempts: 0,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText(/Connection error/i)).not.toBeInTheDocument();
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
  });

  it('should display error banner when error exists', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'disconnected',
      error: 'Connection error: Network failure',
      reconnectAttempts: 2,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Connection error: Network failure')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('should display error banner with warning icon', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'disconnected',
      error: 'Connection error: Timeout',
      reconnectAttempts: 1,
    });

    const { container } = render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const errorBanner = container.querySelector('.error-banner');
    expect(errorBanner).toBeInTheDocument();

    const errorIcon = container.querySelector('.error-icon');
    expect(errorIcon).toBeInTheDocument();
    expect(errorIcon?.textContent).toBe('⚠️');

    const errorMessage = container.querySelector('.error-message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage?.textContent).toBe('Connection error: Timeout');
  });

  it('should not display reconnect info when not reconnecting', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connected',
      error: null,
      reconnectAttempts: 0,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText(/Reconnecting/i)).not.toBeInTheDocument();
  });

  it('should display reconnect info when reconnecting', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: null,
      reconnectAttempts: 3,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Reconnecting... (attempt 3)')).toBeInTheDocument();
  });

  it('should not display reconnect info on first connection attempt', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: null,
      reconnectAttempts: 0,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText(/Reconnecting/i)).not.toBeInTheDocument();
  });

  it('should display reconnect info with correct attempt number', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: null,
      reconnectAttempts: 5,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Reconnecting... (attempt 5)')).toBeInTheDocument();
  });

  it('should display both error and reconnect info when disconnected and retrying', async () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: 'Connection error: Server unavailable',
      reconnectAttempts: 2,
    });

    render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    await waitFor(() => {
      expect(screen.getByText('Connection error: Server unavailable')).toBeInTheDocument();
      expect(screen.getByText('Reconnecting... (attempt 2)')).toBeInTheDocument();
    });
  });

  it('should clear error banner when error is resolved', () => {
    // Initial render with error
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'disconnected',
      error: 'Connection error: Failed',
      reconnectAttempts: 1,
    });

    const { rerender } = render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Connection error: Failed')).toBeInTheDocument();

    // Rerender with error resolved
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connected',
      error: null,
      reconnectAttempts: 0,
    });

    rerender(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText('Connection error: Failed')).not.toBeInTheDocument();
  });

  it('should clear reconnect info when successfully connected', () => {
    // Initial render with reconnecting
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: null,
      reconnectAttempts: 4,
    });

    const { rerender } = render(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Reconnecting... (attempt 4)')).toBeInTheDocument();

    // Rerender with connected status
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connected',
      error: null,
      reconnectAttempts: 0,
    });

    rerender(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText(/Reconnecting/i)).not.toBeInTheDocument();
  });

  it('should display multiple different error messages', () => {
    const errorMessages = [
      'Connection error: Network timeout',
      'Connection error: Server not found',
      'Connection error: Authentication failed',
    ];

    errorMessages.forEach((errorMsg) => {
      mockUseYjsProvider.mockReturnValue({
        ydoc: null,
        ytext: null,
        provider: null,
        awareness: null,
        status: 'disconnected',
        error: errorMsg,
        reconnectAttempts: 1,
      });

      const { unmount } = render(<EditorLayout userName="TestUser" documentId="test-doc" />);

      expect(screen.getByText(errorMsg)).toBeInTheDocument();

      unmount();
    });
  });
});
