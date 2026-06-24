/**
 * Country flag decoration using ip-api.com
 */

interface IpApiResult {
  status?: string;
  countryCode?: string;
}

const COUNTRY_CODE_CACHE = new Map<string, Promise<string | null>>();
const DECORATION_CONCURRENCY = 8;

function countryCodeToEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🌍';
  }
  return String.fromCodePoint(
    ...[...code].map(char => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}

async function getCountryCode(server: string): Promise<string | null> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(server)}?fields=status,countryCode`,
      { headers: { 'User-Agent': 'sub-converter-worker/1.0' } }
    );
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as IpApiResult;
    if (data.status !== 'success' || !data.countryCode) {
      return null;
    }
    return data.countryCode;
  } catch {
    return null;
  }
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
      emojiByServer.set(server, countryCodeToEmoji(countryCode));
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
