import { useMemo, useState } from 'react'

const defaultWorkerUrl = import.meta.env.VITE_WORKER_URL ?? ''

function buildRequestUrl(workerUrl, subscriptionUrl, decorate) {
  const endpoint = workerUrl.trim()
  const subscription = subscriptionUrl.trim()

  if (!endpoint || !subscription) {
    return ''
  }

  const url = new URL(endpoint)
  url.search = ''
  url.searchParams.set('url', subscription)
  if (!decorate) {
    url.searchParams.set('decorate', 'false')
  }
  return url.toString()
}

function App() {
  const [workerUrl, setWorkerUrl] = useState(defaultWorkerUrl)
  const [subscriptionUrl, setSubscriptionUrl] = useState('')
  const [decorate, setDecorate] = useState(true)
  const [error, setError] = useState('')

  const requestUrl = useMemo(() => {
    try {
      return buildRequestUrl(workerUrl, subscriptionUrl, decorate)
    } catch {
      return ''
    }
  }, [decorate, subscriptionUrl, workerUrl])

  function handleSubmit(event) {
    event.preventDefault()

    try {
      if (!subscriptionUrl.trim()) {
        throw new Error('Enter a subscription URL first.')
      }
      if (!workerUrl.trim()) {
        throw new Error('Enter your worker URL first.')
      }

      const downloadUrl = buildRequestUrl(workerUrl, subscriptionUrl, decorate)
      if (!downloadUrl) {
        throw new Error('Unable to build the worker request URL.')
      }

      setError('')
      window.location.assign(downloadUrl)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to prepare the worker request.'
      )
    }
  }

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">sub-converter</p>
        <h1>Convert a subscription URL to Clash YAML</h1>
        <p className="lead">
          Paste your subscription URL, let the app encode it safely, and send it
          to your Cloudflare Worker for download.
        </p>

        <form className="converter-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Worker URL</span>
            <input
              type="url"
              value={workerUrl}
              onChange={(event) => setWorkerUrl(event.target.value)}
              placeholder="https://sub-converter-worker.example.workers.dev"
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          <label className="field">
            <span>Subscription URL</span>
            <textarea
              rows="4"
              value={subscriptionUrl}
              onChange={(event) => setSubscriptionUrl(event.target.value)}
              placeholder="https://example.com/subscription?id=123"
              autoComplete="off"
              spellCheck="false"
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={decorate}
              onChange={(event) => setDecorate(event.target.checked)}
            />
            <span>Decorate proxy names with country flags</span>
          </label>

          <div className="actions">
            <button type="submit">Download Clash YAML</button>
            <a
              className={`secondary-action${requestUrl ? '' : ' disabled'}`}
              href={requestUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!requestUrl}
            >
              Open worker URL
            </a>
          </div>

          {error ? <p className="error">{error}</p> : null}
        </form>

        <section className="result-panel">
          <h2>Encoded worker request</h2>
          <p>
            This is the exact URL the browser will request. The nested
            subscription URL is encoded automatically.
          </p>
          <textarea
            rows="5"
            readOnly
            value={requestUrl}
            placeholder="Fill in both URLs to generate the worker request."
          />
        </section>
      </section>
    </main>
  )
}

export default App
