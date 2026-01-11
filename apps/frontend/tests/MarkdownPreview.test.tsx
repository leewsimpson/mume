import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownPreview } from '../src/components/MarkdownPreview';

describe('MarkdownPreview', () => {
  describe('Component rendering', () => {
    it('renders preview container', () => {
      render(<MarkdownPreview content="Test content" />);
      const container = document.querySelector('.preview-content');
      expect(container).toBeInTheDocument();
    });

    it('renders plain text content', () => {
      render(<MarkdownPreview content="Hello World" />);
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('renders empty string without errors', () => {
      render(<MarkdownPreview content="" />);
      const container = document.querySelector('.preview-content');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Markdown features - Headings (h1-h6)', () => {
    it('renders h1 heading', () => {
      render(<MarkdownPreview content="# Heading 1" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Heading 1');
    });

    it('renders h2 heading', () => {
      render(<MarkdownPreview content="## Heading 2" />);
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Heading 2');
    });

    it('renders h3 heading', () => {
      render(<MarkdownPreview content="### Heading 3" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Heading 3');
    });

    it('renders h4 heading', () => {
      render(<MarkdownPreview content="#### Heading 4" />);
      const heading = screen.getByRole('heading', { level: 4 });
      expect(heading).toHaveTextContent('Heading 4');
    });

    it('renders h5 heading', () => {
      render(<MarkdownPreview content="##### Heading 5" />);
      const heading = screen.getByRole('heading', { level: 5 });
      expect(heading).toHaveTextContent('Heading 5');
    });

    it('renders h6 heading', () => {
      render(<MarkdownPreview content="###### Heading 6" />);
      const heading = screen.getByRole('heading', { level: 6 });
      expect(heading).toHaveTextContent('Heading 6');
    });
  });

  describe('Markdown features - Text formatting', () => {
    it('renders bold text', () => {
      render(<MarkdownPreview content="**bold text**" />);
      const bold = screen.getByText('bold text');
      expect(bold.tagName).toBe('STRONG');
    });

    it('renders italic text', () => {
      render(<MarkdownPreview content="*italic text*" />);
      const italic = screen.getByText('italic text');
      expect(italic.tagName).toBe('EM');
    });

    it('renders bold and italic together', () => {
      render(<MarkdownPreview content="***bold and italic***" />);
      const text = screen.getByText('bold and italic');
      // Text should be inside both strong and em tags
      expect(text.closest('strong')).toBeInTheDocument();
      expect(text.closest('em')).toBeInTheDocument();
    });
  });

  describe('Markdown features - Lists', () => {
    it('renders unordered list', () => {
      const content = `- Item 1
- Item 2
- Item 3`;
      render(<MarkdownPreview content={content} />);

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('Item 1');
      expect(items[1]).toHaveTextContent('Item 2');
      expect(items[2]).toHaveTextContent('Item 3');
    });

    it('renders ordered list', () => {
      const content = `1. First
2. Second
3. Third`;
      render(<MarkdownPreview content={content} />);

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveTextContent('First');
      expect(items[1]).toHaveTextContent('Second');
      expect(items[2]).toHaveTextContent('Third');
    });

    it('renders nested lists', () => {
      const content = `- Parent 1
  - Child 1
  - Child 2
- Parent 2`;
      render(<MarkdownPreview content={content} />);

      const lists = document.querySelectorAll('ul');
      expect(lists.length).toBeGreaterThan(1); // Nested list structure

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Markdown features - Links', () => {
    it('renders links', () => {
      render(<MarkdownPreview content="[Example](https://example.com)" />);
      const link = screen.getByRole('link', { name: 'Example' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('renders multiple links', () => {
      const content = `[Link 1](https://example1.com)
[Link 2](https://example2.com)`;
      render(<MarkdownPreview content={content} />);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveTextContent('Link 1');
      expect(links[1]).toHaveTextContent('Link 2');
    });
  });

  describe('GitHub Flavored Markdown (remark-gfm)', () => {
    it('renders strikethrough text', () => {
      render(<MarkdownPreview content="~~strikethrough~~" />);
      const strikethrough = screen.getByText('strikethrough');
      expect(strikethrough.tagName).toBe('DEL');
    });

    it('renders task lists', () => {
      const content = `- [ ] Unchecked task
- [x] Checked task`;
      render(<MarkdownPreview content={content} />);

      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it('renders tables', () => {
      const content = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
| Cell 3 | Cell 4 |`;
      render(<MarkdownPreview content={content} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check headers
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();

      // Check cells
      expect(screen.getByText('Cell 1')).toBeInTheDocument();
      expect(screen.getByText('Cell 2')).toBeInTheDocument();
      expect(screen.getByText('Cell 3')).toBeInTheDocument();
      expect(screen.getByText('Cell 4')).toBeInTheDocument();
    });

    it('renders autolinks', () => {
      render(<MarkdownPreview content="https://example.com" />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('Content updates', () => {
    it('updates content when prop changes', () => {
      const { rerender } = render(<MarkdownPreview content="Initial content" />);
      expect(screen.getByText('Initial content')).toBeInTheDocument();

      rerender(<MarkdownPreview content="Updated content" />);
      expect(screen.queryByText('Initial content')).not.toBeInTheDocument();
      expect(screen.getByText('Updated content')).toBeInTheDocument();
    });

    it('updates markdown rendering when content changes', () => {
      const { rerender } = render(<MarkdownPreview content="Plain text" />);
      expect(screen.getByText('Plain text')).toBeInTheDocument();

      rerender(<MarkdownPreview content="# Heading" />);
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Heading');
    });

    it('handles rapid content changes', () => {
      const { rerender } = render(<MarkdownPreview content="Content 1" />);
      rerender(<MarkdownPreview content="Content 2" />);
      rerender(<MarkdownPreview content="Content 3" />);
      rerender(<MarkdownPreview content="Content 4" />);

      expect(screen.getByText('Content 4')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });

  describe('Complex markdown documents', () => {
    it('renders mixed content document', () => {
      const content = `# Title

This is a paragraph with **bold** and *italic* text.

## Section 1

- List item 1
- List item 2

[Link to example](https://example.com)

## Section 2

1. First
2. Second

~~Strikethrough~~`;

      render(<MarkdownPreview content={content} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Section 1' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Section 2' })).toBeInTheDocument();
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Link to example' })).toBeInTheDocument();
      expect(screen.getAllByRole('list')).toHaveLength(2);
    });

    it('renders code blocks', () => {
      const content = '```\nconst x = 1;\n```';
      render(<MarkdownPreview content={content} />);

      const code = document.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent('const x = 1;');
    });

    it('renders inline code', () => {
      render(<MarkdownPreview content="Use `console.log()` to debug" />);
      const code = document.querySelector('code');
      expect(code).toBeInTheDocument();
      expect(code).toHaveTextContent('console.log()');
    });

    it('renders blockquotes', () => {
      render(<MarkdownPreview content="> This is a quote" />);
      const blockquote = document.querySelector('blockquote');
      expect(blockquote).toBeInTheDocument();
      expect(blockquote).toHaveTextContent('This is a quote');
    });

    it('renders horizontal rules', () => {
      const content = `Before

---

After`;
      render(<MarkdownPreview content={content} />);
      const hr = document.querySelector('hr');
      expect(hr).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles special characters', () => {
      render(<MarkdownPreview content={`Special: & < > " '`} />);
      expect(screen.getByText(/Special:/)).toBeInTheDocument();
    });

    it('handles emojis', () => {
      render(<MarkdownPreview content="Hello 👋 World 🌍" />);
      expect(screen.getByText(/Hello.*World/)).toBeInTheDocument();
    });

    it('handles multiline content', () => {
      const content = `Line 1
Line 2
Line 3`;
      render(<MarkdownPreview content={content} />);
      const container = document.querySelector('.preview-content');
      expect(container?.textContent).toContain('Line 1');
      expect(container?.textContent).toContain('Line 2');
      expect(container?.textContent).toContain('Line 3');
    });

    it('handles very long content', () => {
      const longContent = 'A'.repeat(10000);
      render(<MarkdownPreview content={longContent} />);
      const container = document.querySelector('.preview-content');
      expect(container).toBeInTheDocument();
    });
  });
});
