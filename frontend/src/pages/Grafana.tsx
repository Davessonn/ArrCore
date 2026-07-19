import { useEffect, useState } from 'react'

export default function Grafana() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGrafanaUrl = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/grafana/dashboard')
        if (!res.ok) throw new Error('Failed to load Grafana dashboard URL')

        const raw = (await res.text()).trim()
        // Support both plain text and JSON-string response bodies.
        const parsed = raw.startsWith('"') && raw.endsWith('"') ? JSON.parse(raw) : raw
        setUrl(parsed)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGrafanaUrl()
  }, [])

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grafana</h1>
          <p className="page-subtitle">Dashboard view</p>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          Loading Grafana dashboard URL...
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          Error: {error}
        </div>
      ) : null}

      {!loading && !error && !url ? (
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          Empty Grafana dashboard URL received from the API.
        </div>
      ) : null}

      {!loading && !error && url ? (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            minHeight: 'calc(100vh - 220px)',
          }}
        >
          <iframe
            src={url}
            title="Grafana Dashboard"
            style={{
              width: '100%',
              height: 'calc(100vh - 220px)',
              border: '0',
              display: 'block',
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
