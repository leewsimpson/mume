import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { NamePrompt } from './components/NamePrompt'
import { EditorLayout } from './components/EditorLayout'

function EditorRoute({ userName }: { userName: string }) {
  const { documentId } = useParams<{ documentId: string }>()

  // Fallback to 'welcome' if documentId is undefined (shouldn't happen with routing setup)
  const docId = documentId || 'welcome'

  return <EditorLayout userName={userName} documentId={docId} />
}

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

  // Show editor interface with routing after name is set
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/doc/welcome" replace />} />
        <Route path="/doc/:documentId" element={<EditorRoute userName={userName} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
