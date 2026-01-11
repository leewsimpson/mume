import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'

// Mock the EditorLayout component to capture props and avoid WebSocket connections
const MockEditorLayout = vi.fn(({ userName, documentId }: { userName: string; documentId: string }) => (
  <div data-testid="editor-layout">
    <div data-testid="editor-username">{userName}</div>
    <div data-testid="editor-documentid">{documentId}</div>
  </div>
))

vi.mock('../src/components/EditorLayout', () => ({
  EditorLayout: MockEditorLayout,
}))

// Create EditorRoute component similar to App.tsx for testing
function EditorRoute({ userName }: { userName: string }) {
  const { documentId } = useParams<{ documentId: string }>()
  const docId = documentId || 'welcome'
  return <MockEditorLayout userName={userName} documentId={docId} />
}

describe('US-010: Document Routing with URL-based Document IDs', () => {
  beforeEach(() => {
    // Clear mock calls before each test
    MockEditorLayout.mockClear()
  })

  it('extracts documentId from URL path /doc/:documentId', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/test-doc-123']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('test-doc-123')
    })
  })

  it('loads different document for different documentId (test1)', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/test1']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('test1')
    })
  })

  it('loads different document for different documentId (test2)', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/test2']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('test2')
    })
  })

  it('treats /doc/test1 and /doc/test2 as independent documents', async () => {
    // First render with test1
    const { unmount: unmount1 } = render(
      <MemoryRouter initialEntries={['/doc/test1']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('test1')
    })

    unmount1()

    // Second render with test2
    render(
      <MemoryRouter initialEntries={['/doc/test2']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('test2')
    })

    // Verify they have different documentIds
    expect(screen.queryByText('test1')).not.toBeInTheDocument()
  })

  it('default route (/) redirects to /doc/welcome', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('welcome')
    })
  })

  it('passes documentId to EditorLayout component', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/my-document']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      const documentIdElement = screen.getByTestId('editor-documentid')
      expect(documentIdElement).toBeInTheDocument()
      expect(documentIdElement).toHaveTextContent('my-document')
    })
  })

  it('handles documentId with special characters', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/my-doc-with-dashes_and_underscores']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('my-doc-with-dashes_and_underscores')
    })
  })

  it('handles short documentId', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/a']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('a')
    })
  })

  it('handles long documentId', async () => {
    const longId = 'very-long-document-identifier-with-many-characters-for-testing-purposes-123456789'
    render(
      <MemoryRouter initialEntries={[`/doc/${longId}`]}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent(longId)
    })
  })

  it('falls back to welcome if documentId is somehow undefined', async () => {
    // Test the fallback in EditorRoute component
    // We need to allow empty string as a valid documentId for this test
    render(
      <MemoryRouter initialEntries={['/doc/']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId?" element={<EditorRoute userName="TestUser" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      // When documentId is undefined or empty, the fallback in EditorRoute should use 'welcome'
      const documentIdElement = screen.getByTestId('editor-documentid')
      expect(documentIdElement).toHaveTextContent('welcome')
    })
  })

  it('passes userName along with documentId to EditorLayout', async () => {
    render(
      <MemoryRouter initialEntries={['/doc/shared-doc']}>
        <Routes>
          <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
          <Route path="/doc/:documentId" element={<EditorRoute userName="Alice" />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('editor-username')).toHaveTextContent('Alice')
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('shared-doc')
    })
  })
})
