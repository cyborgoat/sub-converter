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
