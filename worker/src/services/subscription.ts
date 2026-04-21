/**
 * Utilities for subscription handling
 */

export function padBase64(str: string): string {
  const trimmed = str.trim().replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const remainder = trimmed.length % 4;
  if (remainder === 0) return trimmed;
  return trimmed + '='.repeat(4 - remainder);
}

export function isValidBase64(str: string): boolean {
  try {
    const padded = padBase64(str);
    if (!/^[A-Za-z0-9+/=]+$/.test(padded)) return false;
    atob(padded);
    return true;
  } catch {
    return false;
  }
}

export function tryDecodeBase64(raw: string): string | null {
  if (!raw || !raw.trim()) return '';

  const candidate = padBase64(raw.trim());
  if (!/^[A-Za-z0-9+/=]+$/.test(candidate)) {
    return null;
  }

  try {
    const decoded = atob(candidate);
    const text = decoded.trim();
    if (!text) return null;

    const knownPrefixes = [
      'ss://', 'ssr://', 'vmess://', 'vless://', 'trojan://',
      'socks://', 'http://', 'https://', 'hy2://', 'hysteria2://',
      'tuic://', 'wireguard://',
    ];

    if (knownPrefixes.some(p => text.startsWith(p)) || text.includes('\n')) {
      return text;
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchSubscription(url: string, timeout: number = 10000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'sub-converter-worker/1.0 (+https://workers.dev)',
        'Accept': '*/*',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const text = new TextDecoder('utf-8').decode(bytes);

    return text;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function subscriptionText(raw: string): [string, string] {
  const decoded = tryDecodeBase64(raw);
  if (decoded !== null) {
    return [decoded, 'base64'];
  }
  return [raw, 'plain'];
}

export function splitEntries(text: string): string[] {
  const entries: string[] = [];
  for (const line of text.split('\n')) {
    const item = line.trim();
    if (item && !item.startsWith('#')) {
      entries.push(item);
    }
  }
  return entries;
}
