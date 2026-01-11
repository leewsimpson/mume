import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NamePrompt } from '../src/components/NamePrompt'

describe('NamePrompt', () => {
  it('renders name input field', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    const input = screen.getByPlaceholderText('Your name')
    expect(input).toBeInTheDocument()
  })

  it('validates name with minimum 2 characters', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    const input = screen.getByPlaceholderText('Your name')
    const button = screen.getByText('Start Editing')

    // Test with 1 character (should show error)
    fireEvent.change(input, { target: { value: 'A' } })
    fireEvent.click(button)

    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument()
    expect(onNameSubmit).not.toHaveBeenCalled()
    expect(sessionStorage.getItem('userName')).toBeNull()
  })

  it('accepts valid name with 2+ characters', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    const input = screen.getByPlaceholderText('Your name')
    const button = screen.getByText('Start Editing')

    // Test with valid name
    fireEvent.change(input, { target: { value: 'Alice' } })
    fireEvent.click(button)

    expect(onNameSubmit).toHaveBeenCalledWith('Alice')
    expect(sessionStorage.getItem('userName')).toBe('Alice')
  })

  it('stores name in sessionStorage on submit', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    const input = screen.getByPlaceholderText('Your name')
    const form = screen.getByRole('button').closest('form')!

    fireEvent.change(input, { target: { value: 'Bob' } })
    fireEvent.submit(form)

    expect(sessionStorage.getItem('userName')).toBe('Bob')
  })

  it('trims whitespace from name', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    const input = screen.getByPlaceholderText('Your name')
    const button = screen.getByText('Start Editing')

    fireEvent.change(input, { target: { value: '  Charlie  ' } })
    fireEvent.click(button)

    expect(onNameSubmit).toHaveBeenCalledWith('Charlie')
    expect(sessionStorage.getItem('userName')).toBe('Charlie')
  })

  it('requires no password (PoC only)', () => {
    const onNameSubmit = vi.fn()
    render(<NamePrompt onNameSubmit={onNameSubmit} />)

    // Verify no password field exists
    const passwordInput = screen.queryByLabelText(/password/i)
    expect(passwordInput).not.toBeInTheDocument()
  })
})
