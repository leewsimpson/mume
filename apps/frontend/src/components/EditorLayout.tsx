import { useState, useEffect } from 'react';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';

interface EditorLayoutProps {
  userName: string;
}

export function EditorLayout({ userName }: EditorLayoutProps) {
  const [markdown, setMarkdown] = useState('# Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time.');

  // Initialize Yjs provider with default document 'welcome' and user name
  const { ydoc: _ydoc, ytext, provider: _provider, awareness: _awareness, status } = useYjsProvider('welcome', userName);

  // Sync markdown state with Y.Text for preview pane
  useEffect(() => {
    if (!ytext) return;

    // Initialize markdown from Y.Text
    const ytextContent = ytext.toString();
    if (ytextContent) {
      setMarkdown(ytextContent);
    }

    // Listen for Y.Text changes to update preview
    const observer = () => {
      setMarkdown(ytext.toString());
    };

    ytext.observe(observer);

    return () => {
      ytext.unobserve(observer);
    };
  }, [ytext]);

  return (
    <div className="editor-layout">
      <div className="editor-header">
        <div className="connection-status">
          <span className={`status-indicator status-${status}`}></span>
          <span className="status-text">
            {status === 'connected' && 'Connected'}
            {status === 'connecting' && 'Connecting...'}
            {status === 'disconnected' && 'Disconnected'}
          </span>
        </div>
      </div>
      <div className="editor-content">
        <div className="editor-pane">
          <MarkdownEditor
            ytext={ytext}
            initialContent="# Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time."
          />
        </div>
        <div className="preview-pane">
          <MarkdownPreview content={markdown} />
        </div>
      </div>
    </div>
  );
}
