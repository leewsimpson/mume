import { useState, FormEvent } from 'react'

interface NamePromptProps {
  onNameSubmit: (name: string) => void
}

export function NamePrompt({ onNameSubmit }: NamePromptProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    // Validate name (min 2 characters)
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }

    setError('')

    // Store name in sessionStorage
    sessionStorage.setItem('userName', name.trim())

    // Notify parent component
    onNameSubmit(name.trim())
  }

  return (
    <div className="name-prompt">
      <h1>Multi-User Markdown Editor</h1>
      <p>Enter your name to start editing</p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="name-input"
          autoFocus
        />

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="submit-button">
          Start Editing
        </button>
      </form>
    </div>
  )
}
