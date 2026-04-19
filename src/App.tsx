import {
  ArrowRight,
  Check,
  ClipboardCopy,
  Link2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getConverterBaseOrigin } from "@/lib/app-origin";
import { decodeSubscriptionPaste } from "@/lib/decode-subscription";
import {
  buildClashSubscriptionHttpsUrl,
  buildClashVergeInstallConfigUrl,
  joinSubscriptionSources,
} from "@/lib/sub-url";

const TRANSFORM_LABELS: Record<string, string> = {
  "url-decode": "URL decoded",
  base64: "Base64 decoded",
  extracted: "Links extracted",
};

function useCopyFeedback() {
  const [key, setKey] = useState<string | null>(null);
  const mark = (id: string) => {
    setKey(id);
    window.setTimeout(() => setKey((k) => (k === id ? null : k)), 1600);
  };
  return { key, mark };
}

export default function App() {
  const [rawPaste, setRawPaste] = useState("");
  const converterBase = getConverterBaseOrigin();
  const [flagMeta, setFlagMeta] = useState(true);
  const { key: copiedKey, mark: markCopied } = useCopyFeedback();

  const { urls: decodedUrls, transforms } = useMemo(
    () => decodeSubscriptionPaste(rawPaste),
    [rawPaste],
  );

  const merged = useMemo(
    () => joinSubscriptionSources(decodedUrls),
    [decodedUrls],
  );

  const httpsProfileUrl = useMemo(() => {
    if (!merged || !converterBase) return "";
    return buildClashSubscriptionHttpsUrl(converterBase, merged, {
      appendFlagMeta: flagMeta,
    });
  }, [converterBase, flagMeta, merged]);

  const clashSchemeUrl = useMemo(() => {
    if (!httpsProfileUrl) return "";
    return buildClashVergeInstallConfigUrl(httpsProfileUrl);
  }, [httpsProfileUrl]);

  const hasPaste = rawPaste.trim().length > 0;
  const hasDecoded = decodedUrls.length > 0;
  const canConvert = hasDecoded && Boolean(converterBase) && Boolean(httpsProfileUrl);
  const showEmptyState = hasPaste && !hasDecoded;

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      markCopied(id);
    } catch {
      // Clipboard may be blocked; ignore.
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(139,92,246,0.22),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(52,211,153,0.08),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-3xl px-4 pb-20 pt-10 sm:pt-14 md:pt-16">
        <header className="mb-10 text-center sm:mb-12 sm:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur">
            <Sparkles className="size-3.5 text-violet-300" aria-hidden />
            Paste · decode · Clash profile
          </div>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Subscription to Clash profile URL
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-relaxed text-zinc-400 sm:mx-0 sm:text-base">
            Drop in whatever you copied—encoded strings, percent-escaped links, or plain
            URLs. The page decodes and extracts HTTP(S) subscriptions, then builds a
            ready-to-paste remote profile URL for this site’s converter endpoint.
          </p>
        </header>

        <div className="flex flex-col gap-6 sm:gap-8">
          {/* Step 1 — Paste */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-semibold text-violet-200">
                1
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">Paste subscription</h2>
                <p className="text-xs text-zinc-500">
                  One or many lines; Base64 or URL-encoded blobs are fine.
                </p>
              </div>
            </div>
            <Label htmlFor="paste" className="sr-only">
              Subscription input
            </Label>
            <Textarea
              id="paste"
              value={rawPaste}
              onChange={(e) => setRawPaste(e.target.value)}
              placeholder={"https://…\nor paste an encoded / Base64 subscription block"}
              spellCheck={false}
              className="min-h-[140px] resize-y border-white/10 bg-black/35 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-violet-500/40"
            />
          </section>

          {/* Step 2 — Decoded */}
          <section
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6"
            aria-live="polite"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-sm font-semibold text-emerald-200">
                2
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-white">Decoded subscriptions</h2>
                <p className="text-xs text-zinc-500">
                  Plain HTTP(S) links used to build your profile URL.
                </p>
              </div>
              {transforms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {transforms.map((t) => (
                    <Badge key={t} variant="outline" className="border-violet-400/20">
                      <Wand2 className="mr-1 size-3 opacity-70" aria-hidden />
                      {TRANSFORM_LABELS[t] ?? t}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            {hasDecoded ? (
              <ul className="space-y-2 rounded-xl border border-white/5 bg-black/25 p-3 sm:p-4">
                {decodedUrls.map((u) => (
                  <li
                    key={u}
                    className="flex items-start gap-2 text-sm leading-snug text-zinc-200"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span className="break-all font-mono text-xs text-zinc-300 sm:text-sm">
                      {u}
                    </span>
                  </li>
                ))}
              </ul>
            ) : showEmptyState ? (
              <div
                className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
                role="status"
              >
                No HTTP(S) subscription links were found. Try URL-decoded text, a Base64
                block, or paste the plain subscription URL.
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-zinc-500">
                Recognized links will appear here.
              </div>
            )}
          </section>

          {/* Step 3 — Profile URL */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20 backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-semibold text-violet-200">
                3
              </span>
              <div>
                <h2 className="text-base font-semibold text-white">Clash profile URL</h2>
                <p className="text-xs text-zinc-500">
                  Remote profile for your client · same host as this app +{" "}
                  <code className="rounded bg-black/40 px-1 text-[11px] text-zinc-400">
                    /sub
                  </code>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <Input
                  readOnly
                  value={httpsProfileUrl}
                  placeholder={
                    canConvert
                      ? ""
                      : hasDecoded
                        ? "Missing converter host…"
                        : "Decode a subscription first…"
                  }
                  className="h-auto min-h-11 flex-1 border-white/10 bg-black/35 py-2 font-mono text-xs leading-relaxed text-zinc-200 sm:text-sm"
                />
                <Button
                  type="button"
                  disabled={!canConvert}
                  className="shrink-0 bg-violet-600 text-white hover:bg-violet-500 sm:px-6"
                  onClick={() => void copyText("https", httpsProfileUrl)}
                >
                  {copiedKey === "https" ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    <ClipboardCopy className="size-4" aria-hidden />
                  )}
                  {copiedKey === "https" ? "Copied" : "Copy profile URL"}
                </Button>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-black/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label htmlFor="scheme" className="text-xs text-zinc-500">
                    One-tap import (URL scheme)
                  </Label>
                  <Input
                    id="scheme"
                    readOnly
                    value={clashSchemeUrl}
                    className="h-9 border-white/10 bg-black/30 font-mono text-[11px] text-zinc-400"
                  />
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-white/15 bg-transparent text-zinc-200 hover:bg-white/5"
                    disabled={!canConvert}
                    onClick={() => void copyText("scheme", clashSchemeUrl)}
                  >
                    {copiedKey === "scheme" ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <ClipboardCopy className="size-4" aria-hidden />
                    )}
                    Copy
                  </Button>
                  {canConvert ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/10 text-white hover:bg-white/15"
                      asChild
                    >
                      <a href={clashSchemeUrl}>Open</a>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/10 text-white"
                      disabled
                    >
                      Open
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Meta */}
          <footer className="rounded-2xl border border-white/5 bg-black/20 p-4 text-xs text-zinc-500 backdrop-blur sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <label className="flex cursor-pointer items-start gap-2.5 text-zinc-400">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border-white/20 bg-black/40 text-violet-500 focus:ring-violet-500/40"
                  checked={flagMeta}
                  onChange={(e) => setFlagMeta(e.target.checked)}
                />
                <span>
                  Request <span className="font-mono text-zinc-300">flag=meta</span> when
                  the converter supports Clash Meta output.
                </span>
              </label>
              <div className="flex min-w-0 flex-col gap-1 sm:max-w-[55%] sm:text-right">
                <span className="flex items-center gap-1.5 text-zinc-500 sm:justify-end">
                  <Link2 className="size-3.5 shrink-0" aria-hidden />
                  Converter host
                </span>
                <code className="break-all rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-400">
                  {converterBase || "— unresolved —"}
                </code>
                {!converterBase ? (
                  <span className="text-amber-200/80">
                    Open over HTTP(S) or set{" "}
                    <span className="font-mono text-amber-100/90">VITE_CONVERTER_ORIGIN</span>{" "}
                    at build time.
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 border-t border-white/5 pt-4 text-[11px] leading-relaxed text-zinc-600">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-zinc-600" aria-hidden />
              Links are assembled in the browser only. Your host must serve a compatible{" "}
              <span className="font-mono text-zinc-500">/sub</span> handler for downloads to
              succeed.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
