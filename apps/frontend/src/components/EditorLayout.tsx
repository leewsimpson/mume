import { useState, useEffect } from 'react';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';

interface EditorLayoutProps {
  userName: string;
  documentId: string;
}

export function EditorLayout({ userName, documentId }: EditorLayoutProps) {
  const [markdown, setMarkdown] = useState('# Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time.');

  // Initialize Yjs provider with document ID from route and user name
  const { ydoc: _ydoc, ytext, provider: _provider, awareness, status } = useYjsProvider(documentId, userName);

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
        <ConnectionStatus status={status} />
        <UserPresence awareness={awareness} />
      </div>
      <div className="editor-content">
        <div className="editor-pane">
          <MarkdownEditor
            ytext={ytext}
            awareness={awareness}
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
