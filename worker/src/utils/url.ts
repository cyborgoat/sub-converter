/**
 * URL parsing utilities
 */

export function cleanQuery(query: string): Record<string, string> {
  if (!query) {
    return {};
  }

  const params = new URLSearchParams(query);
  const cleaned: Record<string, string> = {};
  params.forEach((value, key) => {
    cleaned[key] = value;
  });
  return cleaned;
}

export function decodeName(fragment: string): string | undefined {
  const value = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return decodeURIComponent(trimmed);
}

export function parseURL(str: string): URL | null {
  try {
    return new URL(str);
  } catch {
    return null;
  }
}

const WORKER_QUERY_PARAMS = new Set(['url', 'decorate']);

export function reconstructSubscriptionUrl(requestUrl: URL): string | null {
  const base = requestUrl.searchParams.get('url');
  if (!base) {
    return null;
  }

  const extraParams = new URLSearchParams();
  requestUrl.searchParams.forEach((value, key) => {
    if (!WORKER_QUERY_PARAMS.has(key)) {
      extraParams.append(key, value);
    }
  });

  if (extraParams.size === 0) {
    return base;
  }

  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${extraParams.toString()}`;
}
