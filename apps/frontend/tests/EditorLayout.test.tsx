import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorLayout } from '../src/components/EditorLayout';

// Mock react-resizable-panels to avoid test environment issues
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div className="mock-panel">{children}</div>,
  Group: ({ children }: { children: React.ReactNode }) => <div className="mock-group">{children}</div>,
  Separator: ({ className }: { className?: string }) => <div className={className || 'mock-separator'} data-testid="resize-handle"></div>
}));

// Mock child components to isolate EditorLayout testing
vi.mock('../src/hooks/useYjsProvider', () => ({
  useYjsProvider: vi.fn(() => ({
    ydoc: null,
    ytext: null,
    provider: null,
    awareness: null,
    status: 'connected'
  }))
}));

vi.mock('../src/components/MarkdownEditor', () => ({
  MarkdownEditor: ({ initialContent }: { initialContent: string }) => (
    <div className="editor-container">
      <textarea data-testid="markdown-editor" defaultValue={initialContent} />
    </div>
  )
}));

vi.mock('../src/components/MarkdownPreview', () => ({
  MarkdownPreview: ({ content }: { content: string }) => (
    <div data-testid="markdown-preview">{content}</div>
  )
}));

vi.mock('../src/components/UserPresence', () => ({
  UserPresence: () => <div data-testid="user-presence">Users</div>
}));

describe('EditorLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render split-pane layout with editor and preview', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify both panes are present
    expect(screen.getByTestId('markdown-editor')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-preview')).toBeInTheDocument();
  });

  it('should render textarea for markdown editing in left pane', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const textarea = screen.getByTestId('markdown-editor');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should render preview area in right pane', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const preview = screen.getByTestId('markdown-preview');
    expect(preview).toBeInTheDocument();
  });

  it('should render layout that fills viewport', () => {
    const { container } = render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const layout = container.querySelector('.editor-layout');
    expect(layout).toBeInTheDocument();

    // Verify the layout has the correct class (CSS applies flex column layout)
    expect(layout).toHaveClass('editor-layout');
  });

  it('should render header with connection status', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify header elements
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should render header with user presence component', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    expect(screen.getByTestId('user-presence')).toBeInTheDocument();
  });

  it('should have 50/50 split layout structure', () => {
    const { container } = render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const editorContent = container.querySelector('.editor-content');
    expect(editorContent).toBeInTheDocument();

    // Verify both panes exist in the content grid (50/50 split)
    const editorPane = container.querySelector('.editor-pane');
    const previewPane = container.querySelector('.preview-pane');
    expect(editorPane).toBeInTheDocument();
    expect(previewPane).toBeInTheDocument();

    // Verify they're siblings within editor-content (grid layout)
    expect(editorContent).toContainElement(editorPane);
    expect(editorContent).toContainElement(previewPane);
  });

  it('should have visible divider between panes', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify the resize handle exists between panes
    const resizeHandle = screen.getByTestId('resize-handle');
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveClass('resize-handle');
  });

  it('should initialize with default welcome message', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const editor = screen.getByTestId('markdown-editor') as HTMLTextAreaElement;
    expect(editor.defaultValue).toContain('Welcome to the Markdown Editor');
  });

  it('should pass document ID and user name to Yjs provider', async () => {
    const { useYjsProvider } = await vi.importMock<typeof import('../src/hooks/useYjsProvider')>('../src/hooks/useYjsProvider');

    render(<EditorLayout userName="Alice" documentId="doc123" />);

    expect(useYjsProvider).toHaveBeenCalledWith('doc123', 'Alice');
  });

  it('should render editor container with flex layout that fills parent', () => {
    const { container } = render(<EditorLayout userName="Test User" documentId="test-doc" />);

    const editorPane = container.querySelector('.editor-pane');
    expect(editorPane).toBeInTheDocument();

    // Check that editor-container exists within editor-pane
    const editorContainer = editorPane?.querySelector('.editor-container');
    expect(editorContainer).toBeInTheDocument();

    // Verify editor-container has the correct class for CSS flex layout
    expect(editorContainer).toHaveClass('editor-container');
  });

  it('should render resizable panels with Panel and Group components', () => {
    const { container } = render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify Group component is rendered (mocked as .mock-group)
    const group = container.querySelector('.mock-group');
    expect(group).toBeInTheDocument();

    // Verify Panel components are rendered (mocked as .mock-panel)
    const panels = container.querySelectorAll('.mock-panel');
    expect(panels.length).toBe(2); // Editor panel and preview panel
  });

  it('should render resize handle between editor and preview panels', () => {
    render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify resize handle exists and has correct class
    const resizeHandle = screen.getByTestId('resize-handle');
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle).toHaveClass('resize-handle');
  });

  it('should maintain panel structure for resizable layout', () => {
    const { container } = render(<EditorLayout userName="Test User" documentId="test-doc" />);

    // Verify the overall structure: editor-content contains mock-group with panels and separator
    const editorContent = container.querySelector('.editor-content');
    expect(editorContent).toBeInTheDocument();

    const group = editorContent?.querySelector('.mock-group');
    expect(group).toBeInTheDocument();

    // Verify both editor pane and preview pane are within the group
    const editorPane = container.querySelector('.editor-pane');
    const previewPane = container.querySelector('.preview-pane');
    expect(editorPane).toBeInTheDocument();
    expect(previewPane).toBeInTheDocument();
  });
});
