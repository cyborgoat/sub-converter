/** Trim trailing punctuation often copied with links. */
function trimTrailingJunk(s: string): string {
  return s.replace(/[),.;>]+$/g, "").trim();
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function tryDecodeURIComponent(s: string): string | null {
  if (!/%[0-9A-Fa-f]{2}/.test(s)) return null;
  try {
    const out = decodeURIComponent(s);
    return out !== s ? out : null;
  } catch {
    return null;
  }
}

/** If the segment is Base64 whose decoded payload contains HTTP(S) URLs, return that payload. */
function tryBase64DecodeMaybeUrls(s: string): string | null {
  const t = s.trim().replace(/\s+/g, "");
  if (t.length < 12) return null;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(t)) return null;
  try {
    let b = t.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b.length % 4;
    if (pad) b += "====".slice(0, 4 - pad);
    const dec = atob(b).trim();
    if (/https?:\/\//i.test(dec)) return dec;
    return null;
  } catch {
    return null;
  }
}

function extractHttpUrls(s: string): string[] {
  const re = /https?:\/\/[^\s|"'<>[\]()]+/gi;
  return [...s.matchAll(re)].map((m) => trimTrailingJunk(m[0])).filter(Boolean);
}

function splitSegments(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
  for (const line of lines) {
    for (const part of line.split(/[,;]/)) {
      const p = part.trim();
      if (p) out.push(p);
    }
  }
  return out;
}

export type DecodePasteResult = {
  urls: string[];
  /** Unique high-level transforms applied (e.g. for UI chips). */
  transforms: ("url-decode" | "base64" | "extracted")[];
};

/**
 * Turn messy pasted subscription text into plain HTTP(S) URLs: URL-decoding,
 * Base64 payloads, and regex extraction from surrounding text.
 */
export function decodeSubscriptionPaste(raw: string): DecodePasteResult {
  const transforms: DecodePasteResult["transforms"] = [];
  const pushTransform = (t: (typeof transforms)[number]) => {
    if (!transforms.includes(t)) transforms.push(t);
  };

  const segments = splitSegments(raw);
  const workList = segments.length ? segments : raw.trim() ? [raw.trim()] : [];

  const seen = new Set<string>();
  const urls: string[] = [];

  const addUrl = (u: string) => {
    const t = trimTrailingJunk(u);
    if (!isHttpUrl(t) || seen.has(t)) return;
    seen.add(t);
    urls.push(t);
  };

  for (const seg of workList) {
    let s = seg;
    const d1 = tryDecodeURIComponent(s);
    if (d1) {
      s = d1;
      pushTransform("url-decode");
    }
    const b64 = tryBase64DecodeMaybeUrls(s);
    if (b64) {
      s = b64;
      pushTransform("base64");
    }
    const extracted = extractHttpUrls(s);
    if (extracted.length) {
      const singleSame =
        extracted.length === 1 &&
        trimTrailingJunk(extracted[0]) === trimTrailingJunk(s) &&
        isHttpUrl(s);
      if (!singleSame) pushTransform("extracted");
      for (const u of extracted) addUrl(u);
    } else {
      addUrl(s);
    }
  }

  return { urls, transforms };
}
