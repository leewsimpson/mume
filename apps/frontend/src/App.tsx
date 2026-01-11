import { useState, useEffect } from 'react'
import { NamePrompt } from './components/NamePrompt'
import { EditorLayout } from './components/EditorLayout'

function App() {
  const [userName, setUserName] = useState<string | null>(null)

  // Check sessionStorage for existing name on mount
  useEffect(() => {
    const storedName = sessionStorage.getItem('userName')
    if (storedName) {
      setUserName(storedName)
    }
  }, [])

  const handleNameSubmit = (name: string) => {
    setUserName(name)
  }

  // Show NamePrompt if no userName
  if (!userName) {
    return <NamePrompt onNameSubmit={handleNameSubmit} />
  }

  // Show editor interface after name is set
  return <EditorLayout userName={userName} />
}

export default App
