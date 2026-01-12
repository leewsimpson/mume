import { useState, useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useYjsProvider } from '../hooks/useYjsProvider';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { UserPresence } from './UserPresence';
import { ConnectionStatus } from './ConnectionStatus';
import { SaveStatus } from './SaveStatus';

interface EditorLayoutProps {
  userName: string;
  documentId: string;
  initialContent?: string;
  fileSha?: string;
  owner?: string;
  repo?: string;
  filePath?: string;
}

export function EditorLayout({
  userName,
  documentId,
  initialContent,
  fileSha: _fileSha,
  owner: _owner,
  repo: _repo,
  filePath: _filePath,
}: EditorLayoutProps) {
  const [markdown, setMarkdown] = useState(
    initialContent || '# Welcome to the Markdown Editor\n\nStart typing to see the preview update in real-time.'
  );

  // Initialize Yjs provider with document ID from route and user name
  const { ydoc: _ydoc, ytext, provider: _provider, awareness, status, error, reconnectAttempts } = useYjsProvider(documentId, userName);

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
        <SaveStatus status="saved" message="Auto-save enabled (30s)" />
        {status === 'connecting' && reconnectAttempts > 0 && (
          <div className="reconnect-info">
            Reconnecting... (attempt {reconnectAttempts})
          </div>
        )}
        <UserPresence awareness={awareness} />
      </div>
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}
      <div className="editor-content">
        <Group orientation="horizontal">
          <Panel defaultSize={50} minSize={20}>
            <div className="editor-pane">
              <MarkdownEditor
                ytext={ytext}
                awareness={awareness}
                initialContent={initialContent}
              />
            </div>
          </Panel>
          <Separator className="resize-handle" />
          <Panel defaultSize={50} minSize={20}>
            <div className="preview-pane">
              <MarkdownPreview content={markdown} />
            </div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
