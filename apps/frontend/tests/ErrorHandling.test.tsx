import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EditorLayout } from '../src/components/EditorLayout';

// Helper to wrap component in MemoryRouter for useNavigate hook
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

// Mock react-resizable-panels to avoid test environment issues
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div className="mock-panel">{children}</div>,
  Group: ({ children }: { children: React.ReactNode }) => <div className="mock-group">{children}</div>,
  Separator: ({ className }: { className?: string }) => <div className={className || 'mock-separator'}></div>
}));

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
  ConnectionStatus: ({ status, reconnectAttempts = 0 }: { status: string; reconnectAttempts?: number }) => {
    // Match real component behaviour - hidden when connected
    if (status === 'connected') {
      return null;
    }
    const getMessage = () => {
      if (status === 'disconnected') {
        return 'Connection lost - changes may not be saved';
      }
      if (status === 'connecting' && reconnectAttempts > 0) {
        return `Reconnecting... (attempt ${reconnectAttempts})`;
      }
      return 'Connecting to server...';
    };
    return (
      <div data-testid="connection-status" role="alert">
        <span className="status-indicator"></span>
        <span className="connection-status__message">{getMessage()}</span>
      </div>
    );
  },
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

    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.queryByText(/Connection error/i)).not.toBeInTheDocument();
    expect(container.querySelector('.error-banner')).not.toBeInTheDocument();
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

    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText('Connection error: Network failure')).toBeInTheDocument();
    // Error banner uses FontAwesome icon, not emoji
    const errorBanner = container.querySelector('.error-banner');
    expect(errorBanner).toBeInTheDocument();
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

    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const errorBanner = container.querySelector('.error-banner');
    expect(errorBanner).toBeInTheDocument();

    const errorIcon = container.querySelector('.error-icon');
    expect(errorIcon).toBeInTheDocument();
    // FontAwesome icon is rendered as SVG, not text
    expect(errorIcon?.querySelector('svg')).toBeInTheDocument();

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

    renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

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

    renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    // Reconnect info is now part of ConnectionStatus component
    expect(screen.getByText(/Reconnecting.*attempt 3/)).toBeInTheDocument();
  });

  it('should display initial connecting message on first connection attempt', () => {
    mockUseYjsProvider.mockReturnValue({
      ydoc: null,
      ytext: null,
      provider: null,
      awareness: null,
      status: 'connecting',
      error: null,
      reconnectAttempts: 0,
    });

    renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    // On first attempt, shows "Connecting to server..." not "Reconnecting..."
    expect(screen.queryByText(/Reconnecting/i)).not.toBeInTheDocument();
    expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
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

    renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText(/Reconnecting.*attempt 5/)).toBeInTheDocument();
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

    renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    await waitFor(() => {
      expect(screen.getByText('Connection error: Server unavailable')).toBeInTheDocument();
      expect(screen.getByText(/Reconnecting.*attempt 2/)).toBeInTheDocument();
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

    const { rerender } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

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

    rerender(<MemoryRouter><EditorLayout userName="TestUser" documentId="test-doc" /></MemoryRouter>);

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

    const { rerender } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    expect(screen.getByText(/Reconnecting.*attempt 4/)).toBeInTheDocument();

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

    rerender(<MemoryRouter><EditorLayout userName="TestUser" documentId="test-doc" /></MemoryRouter>);

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

      const { unmount } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

      expect(screen.getByText(errorMsg)).toBeInTheDocument();

      unmount();
    });
  });
});
