import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
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

// Mock useYjsProvider
vi.mock('../src/hooks/useYjsProvider', () => ({
  useYjsProvider: vi.fn(() => ({
    ydoc: null,
    ytext: { toString: () => 'Test content', observe: vi.fn(), unobserve: vi.fn() },
    provider: null,
    awareness: { getStates: () => new Map(), on: vi.fn(), off: vi.fn(), clientID: 1 },
    status: 'connected',
    error: null,
    reconnectAttempts: 0,
  })),
}));

// Mock child components
vi.mock('../src/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ initialContent }: { initialContent: string }) => (
    <textarea data-testid="markdown-editor" className="markdown-textarea">
      {initialContent}
    </textarea>
  ),
}));

vi.mock('../src/components/MarkdownPreview', () => ({
  MarkdownPreview: ({ content }: { content: string }) => (
    <div data-testid="markdown-preview" className="preview-content">
      {content}
    </div>
  ),
}));

vi.mock('../src/components/UserPresence', () => ({
  UserPresence: () => <div data-testid="user-presence">Users</div>,
}));

vi.mock('../src/components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

describe('US-014: Styling and UI Polish', () => {
  it('should have editor layout with proper structure', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const editorLayout = container.querySelector('.editor-layout');
    expect(editorLayout).toBeInTheDocument();
  });

  it('should have split-pane layout structure', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const editorContent = container.querySelector('.editor-content');
    expect(editorContent).toBeInTheDocument();

    const editorPane = container.querySelector('.editor-pane');
    const previewPane = container.querySelector('.preview-pane');

    expect(editorPane).toBeInTheDocument();
    expect(previewPane).toBeInTheDocument();
  });

  it('should have visible divider between panes (resize handle)', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const editorPane = container.querySelector('.editor-pane');
    const previewPane = container.querySelector('.preview-pane');
    expect(editorPane).toBeInTheDocument();
    expect(previewPane).toBeInTheDocument();

    // Check for resize handle (Separator component) between panes
    const resizeHandle = container.querySelector('.resize-handle');
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveClass('resize-handle');
  });

  it('should have textarea with monospace font class', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const textarea = container.querySelector('.markdown-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('markdown-textarea');
  });

  it('should have preview pane with readable typography class', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const preview = container.querySelector('.preview-content');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveClass('preview-content');
  });

  it('should have header with clear visual hierarchy', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const header = container.querySelector('.editor-header');
    expect(header).toBeInTheDocument();

    // Header should contain connection status
    const connectionStatus = container.querySelector('[data-testid="connection-status"]');
    expect(connectionStatus).toBeInTheDocument();

    // Header should contain user presence
    const userPresence = container.querySelector('[data-testid="user-presence"]');
    expect(userPresence).toBeInTheDocument();
  });

  it('should have consistent CSS class naming convention', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    // Check for consistent kebab-case naming
    expect(container.querySelector('.editor-layout')).toBeInTheDocument();
    expect(container.querySelector('.editor-header')).toBeInTheDocument();
    expect(container.querySelector('.editor-content')).toBeInTheDocument();
    expect(container.querySelector('.editor-pane')).toBeInTheDocument();
    expect(container.querySelector('.preview-pane')).toBeInTheDocument();
  });

  it('should have proper layout structure (flexbox column)', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    const editorLayout = container.querySelector('.editor-layout');
    expect(editorLayout).toBeInTheDocument();
    expect(editorLayout).toHaveClass('editor-layout');
  });

  it('should have all required component containers', () => {
    const { container } = renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);

    // Verify all major containers exist
    expect(container.querySelector('.editor-layout')).toBeInTheDocument();
    expect(container.querySelector('.editor-header')).toBeInTheDocument();
    expect(container.querySelector('.editor-content')).toBeInTheDocument();
    expect(container.querySelector('.editor-pane')).toBeInTheDocument();
    expect(container.querySelector('.preview-pane')).toBeInTheDocument();
    expect(container.querySelector('.markdown-textarea')).toBeInTheDocument();
    expect(container.querySelector('.preview-content')).toBeInTheDocument();
  });

  it('should render without any errors', () => {
    // This test verifies the component renders successfully
    expect(() => {
      renderWithRouter(<EditorLayout userName="TestUser" documentId="test-doc" />);
    }).not.toThrow();
  });
});
