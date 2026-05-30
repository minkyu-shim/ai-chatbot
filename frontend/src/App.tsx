import { useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  app: string
  environment: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as HealthResponse
      })
      .then(setHealth)
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>Local LLM Chat — M0</h1>
      <p>Backend health check:</p>
      {error && <pre style={{ color: 'crimson' }}>Error: {error}</pre>}
      {health && <pre>{JSON.stringify(health, null, 2)}</pre>}
      {!health && !error && <p>Loading…</p>}
    </div>
  )
}

export default App
