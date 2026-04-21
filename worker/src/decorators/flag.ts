/**
 * Country flag decoration using ipwho.is API
 */

interface GeoIPResult {
  country_code?: string;
}

const COUNTRY_CODE_EMOJI: Record<string, string> = {
  'US': '🇺🇸', 'GB': '🇬🇧', 'JP': '🇯🇵', 'CN': '🇨🇳', 'SG': '🇸🇬',
  'HK': '🇭🇰', 'TW': '🇹🇼', 'KR': '🇰🇷', 'IN': '🇮🇳', 'BR': '🇧🇷',
  'CA': '🇨🇦', 'AU': '🇦🇺', 'DE': '🇩🇪', 'FR': '🇫🇷', 'NL': '🇳🇱',
  'RU': '🇷🇺', 'VN': '🇻🇳', 'TH': '🇹🇭', 'MY': '🇲🇾', 'ID': '🇮🇩',
  'PH': '🇵🇭', 'NZ': '🇳🇿', 'CH': '🇨🇭', 'SE': '🇸🇪', 'NO': '🇳🇴',
  'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'IT': '🇮🇹', 'ES': '🇪🇸',
  'MX': '🇲🇽', 'ZA': '🇿🇦', 'AE': '🇦🇪', 'KE': '🇰🇪', 'NG': '🇳🇬',
};

const COUNTRY_CODE_CACHE = new Map<string, Promise<string | null>>();
const DECORATION_CONCURRENCY = 8;

async function getCountryCode(ip: string): Promise<string | null> {
  try {
    const response = await fetch(`https://ipwho.is/${ip}?fields=country_code`);
    if (!response.ok) return null;
    const data = (await response.json()) as GeoIPResult;
    return data.country_code || null;
  } catch {
    return null;
  }
}

function getEmoji(countryCode: string): string {
  return COUNTRY_CODE_EMOJI[countryCode.toUpperCase()] || '🌍';
}

function isDecoratedName(proxyName: string): boolean {
  const firstChar = proxyName.charAt(0);
  return Boolean(firstChar && firstChar.charCodeAt(0) > 127);
}

function shouldDecorateProxy(proxyName: string, server: string): boolean {
  if (!proxyName || proxyName.length === 0) {
    return false;
  }
  if (!server || server.length === 0) {
    return false;
  }
  return !isDecoratedName(proxyName);
}

function getCountryCodeCached(server: string): Promise<string | null> {
  let promise = COUNTRY_CODE_CACHE.get(server);
  if (!promise) {
    promise = getCountryCode(server);
    COUNTRY_CODE_CACHE.set(server, promise);
  }
  return promise;
}

async function runWithConcurrency<T>(
  values: readonly T[],
  limit: number,
  worker: (value: T) => Promise<void>
): Promise<void> {
  const queue = [...values];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (next === undefined) {
        return;
      }
      await worker(next);
    }
  });
  await Promise.all(runners);
}

export async function decorateProxyNames(
  proxies: Array<{ name: string; server: string }>
): Promise<Map<string, string>> {
  const servers = Array.from(
    new Set(
      proxies
        .filter(proxy => shouldDecorateProxy(proxy.name, proxy.server))
        .map(proxy => proxy.server)
    )
  );

  const emojiByServer = new Map<string, string>();
  await runWithConcurrency(servers, DECORATION_CONCURRENCY, async server => {
    const countryCode = await getCountryCodeCached(server);
    if (countryCode) {
      emojiByServer.set(server, getEmoji(countryCode));
    }
  });

  const nameMap = new Map<string, string>();
  for (const proxy of proxies) {
    if (!shouldDecorateProxy(proxy.name, proxy.server)) {
      nameMap.set(proxy.name, proxy.name);
      continue;
    }

    const emoji = emojiByServer.get(proxy.server);
    nameMap.set(proxy.name, emoji ? `${emoji} ${proxy.name}` : proxy.name);
  }

  return nameMap;
}
