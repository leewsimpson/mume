import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../src/App'

// Mock the EditorLayout component to avoid WebSocket connection issues in tests
vi.mock('../src/components/EditorLayout', () => ({
  EditorLayout: ({ userName, documentId }: { userName: string; documentId: string }) => (
    <div data-testid="editor-layout">
      <div data-testid="editor-username">{userName}</div>
      <div data-testid="editor-documentid">{documentId}</div>
    </div>
  ),
}))

describe('App - Name-based Authentication Flow', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear()
  })

  it('shows NamePrompt when no name is stored in sessionStorage', () => {
    render(<App />)

    expect(screen.getByText('Multi-User Markdown Editor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument()
  })

  it('redirects to editor after entering valid name', async () => {
    render(<App />)

    const input = screen.getByPlaceholderText('Your name')
    const button = screen.getByText('Start Editing')

    fireEvent.change(input, { target: { value: 'TestUser' } })
    fireEvent.click(button)

    // Wait for editor to appear
    await waitFor(() => {
      expect(screen.getByTestId('editor-layout')).toBeInTheDocument()
    })

    // Verify username is passed to editor
    expect(screen.getByTestId('editor-username')).toHaveTextContent('TestUser')
  })

  it('loads name from sessionStorage on mount and shows editor', async () => {
    // Pre-populate sessionStorage
    sessionStorage.setItem('userName', 'StoredUser')

    render(<App />)

    // Should skip NamePrompt and go directly to editor
    await waitFor(() => {
      expect(screen.getByTestId('editor-layout')).toBeInTheDocument()
    })

    expect(screen.getByTestId('editor-username')).toHaveTextContent('StoredUser')
    expect(screen.queryByPlaceholderText('Your name')).not.toBeInTheDocument()
  })

  it('persists name during browser session', async () => {
    render(<App />)

    // Enter name
    const input = screen.getByPlaceholderText('Your name')
    fireEvent.change(input, { target: { value: 'SessionUser' } })
    fireEvent.click(screen.getByText('Start Editing'))

    // Wait for editor to appear
    await waitFor(() => {
      expect(screen.getByTestId('editor-layout')).toBeInTheDocument()
    })

    // Verify sessionStorage still has the name
    expect(sessionStorage.getItem('userName')).toBe('SessionUser')
  })

  it('redirects to /doc/welcome by default', async () => {
    sessionStorage.setItem('userName', 'DefaultUser')

    render(<App />)

    // Wait for router to navigate to default route
    await waitFor(() => {
      expect(screen.getByTestId('editor-documentid')).toHaveTextContent('welcome')
    })
  })
})
