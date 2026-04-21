import { useMemo, useState } from 'react'

const workerUrl = 'https://sub-converter-worker.cyborgoat.workers.dev'

function buildRequestUrl(subscriptionUrl, decorate) {
  const subscription = subscriptionUrl.trim()

  if (!subscription) {
    return ''
  }

  const url = new URL(workerUrl)
  url.search = ''
  url.searchParams.set('url', subscription)
  if (!decorate) {
    url.searchParams.set('decorate', 'false')
  }
  return url.toString()
}

function App() {
  const [subscriptionUrl, setSubscriptionUrl] = useState('')
  const [decorate, setDecorate] = useState(true)

  const requestUrl = useMemo(() => {
    try {
      return buildRequestUrl(subscriptionUrl, decorate)
    } catch {
      return ''
    }
  }, [decorate, subscriptionUrl])

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">sub-converter</p>
        <h1>Convert a subscription URL to Clash YAML</h1>
        <p className="lead">
          Paste your subscription URL and the app will generate the final encoded
          worker URL for downloading the Clash YAML file.
        </p>

        <section className="converter-form">
          <div className="fixed-worker">
            <span>Worker URL</span>
            <code>{workerUrl}</code>
          </div>

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
        </section>

        <section className="result-panel">
          <h2>Encoded worker request</h2>
          <p>
            Copy this URL and open it in a browser or use it directly in a
            download command.
          </p>
          <textarea
            rows="5"
            readOnly
            value={requestUrl}
            placeholder="Enter a subscription URL to generate the final worker URL."
          />
        </section>
      </section>
    </main>
  )
}

export default App
