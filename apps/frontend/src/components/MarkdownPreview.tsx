import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
  content: string;
}

/**
 * Markdown preview component using react-markdown
 * Renders GitHub Flavored Markdown with remark-gfm plugin
 */
export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="preview-content" data-testid="markdown-preview">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
