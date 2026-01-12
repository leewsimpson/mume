import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

// Mock the pages to avoid complex setup
vi.mock('../src/pages/Login', () => ({
  Login: () => (
    <div data-testid="login-page">
      <h1>Multi-User Markdown Editor</h1>
      <button>Sign in with GitHub</button>
    </div>
  ),
}))

vi.mock('../src/pages/RepositorySelector', () => ({
  RepositorySelector: () => <div data-testid="repository-selector">Repository Selector</div>,
}))

vi.mock('../src/pages/DocumentBrowser', () => ({
  DocumentBrowser: () => <div data-testid="document-browser">Document Browser</div>,
}))

vi.mock('../src/pages/Editor', () => ({
  Editor: () => <div data-testid="editor-page">Editor</div>,
}))

describe('App - GitHub OAuth Authentication Flow', () => {
  beforeEach(() => {
    // Clear any stored state
    sessionStorage.clear()
  })

  it('shows Login page when navigating to root', () => {
    render(<App />)

    // Root redirects to /login
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
    expect(screen.getByText('Multi-User Markdown Editor')).toBeInTheDocument()
  })

  it('shows Login page with GitHub sign-in button', () => {
    render(<App />)

    expect(screen.getByText('Sign in with GitHub')).toBeInTheDocument()
  })

  it('has correct route structure for login', () => {
    render(<App />)

    // App should render login page by default (redirected from /)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('redirects legacy /doc routes to login', () => {
    // Set window location to legacy route
    window.history.pushState({}, '', '/doc/welcome')
    
    render(<App />)

    // Legacy routes should redirect to login
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })
})
