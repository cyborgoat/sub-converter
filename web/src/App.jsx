import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

const defaultProdWorkerUrl = 'https://sub.cyborgoat.com/'

function resolveWorkerUrl() {
  const configured = import.meta.env.VITE_WORKER_URL?.trim()
  if (configured) {
    return normalizeWorkerUrl(configured)
  }

  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:8787/'
  }

  return defaultProdWorkerUrl
}

function normalizeWorkerUrl(value) {
  const url = new URL(value)
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    url.protocol = 'https:'
  }
  return url.toString()
}

const workerUrl = resolveWorkerUrl()

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
  const [copied, setCopied] = useState(false)

  const requestUrl = useMemo(() => {
    try {
      return buildRequestUrl(subscriptionUrl, decorate)
    } catch {
      return ''
    }
  }, [decorate, subscriptionUrl])

  async function handleCopy() {
    if (!requestUrl) {
      return
    }

    await navigator.clipboard.writeText(requestUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen bg-background px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-xl space-y-8">
        <header className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            sub-converter
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Convert a subscription URL to Clash YAML
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Paste your subscription URL to generate the encoded worker link.
          </p>
        </header>

        <Card className="shadow-none ring-border/60">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label htmlFor="worker-url">Worker URL</Label>
              <div
                id="worker-url"
                className="rounded-lg border border-border bg-muted px-3 py-2.5 font-mono text-sm text-muted-foreground break-all"
              >
                {workerUrl}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscription-url">Subscription URL</Label>
              <Textarea
                id="subscription-url"
                rows={4}
                value={subscriptionUrl}
                onChange={(event) => setSubscriptionUrl(event.target.value)}
                placeholder="https://example.com/subscription?id=123"
                autoComplete="off"
                spellCheck={false}
                className="resize-y font-mono text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="decorate"
                checked={decorate}
                onCheckedChange={(checked) => setDecorate(checked === true)}
              />
              <Label htmlFor="decorate" className="font-normal leading-snug">
                Decorate proxy names with country flags
              </Label>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="request-url">Encoded worker request</Label>
                <p className="text-sm text-muted-foreground">
                  Copy this URL to download the Clash YAML file.
                </p>
              </div>

              <Textarea
                id="request-url"
                rows={5}
                readOnly
                value={requestUrl}
                placeholder="Enter a subscription URL to generate the final worker URL."
                className="resize-y font-mono text-sm"
              />

              <Button
                type="button"
                onClick={handleCopy}
                disabled={!requestUrl}
                className="w-full sm:w-auto"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? 'Copied' : 'Copy URL'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default App
