/**
 * Country flag decoration via geo-IP lookup
 */

interface GeoIPResult {
  success?: boolean;
  country_code?: string;
  flag?: { emoji?: string };
}

interface IpApiResult {
  status?: string;
  countryCode?: string;
}

interface GeoJsResult {
  country_code?: string;
}

interface DnsJsonResponse {
  Answer?: Array<{ type: number; data: string }>;
}

const FETCH_HEADERS = { 'User-Agent': 'sub-converter-worker/1.0' };
const COUNTRY_CODE_CACHE = new Map<string, Promise<string | null>>();
const DECORATION_CONCURRENCY = 8;

function isIPAddress(host: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return true;
  }
  return host.includes(':');
}

function countryCodeToEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '🌍';
  }
  return String.fromCodePoint(
    ...[...code].map(char => 0x1f1e6 + char.charCodeAt(0) - 65)
  );
}

async function resolveHostToIP(host: string): Promise<string | null> {
  if (isIPAddress(host)) {
    return host;
  }

  for (const recordType of ['A', 'AAAA'] as const) {
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${recordType}`,
        { headers: { Accept: 'application/dns-json', ...FETCH_HEADERS } }
      );
      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as DnsJsonResponse;
      const answer = data.Answer?.find(entry => entry.data);
      if (answer?.data) {
        return answer.data;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function lookupViaIpApi(host: string): Promise<string | null> {
  const response = await fetch(
    `http://ip-api.com/json/${encodeURIComponent(host)}?fields=status,countryCode`,
    { headers: FETCH_HEADERS }
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as IpApiResult;
  if (data.status !== 'success' || !data.countryCode) {
    return null;
  }
  return data.countryCode;
}

async function lookupViaIpWhoIs(ip: string): Promise<string | null> {
  const response = await fetch(
    `https://ipwho.is/${encodeURIComponent(ip)}?fields=country_code,success,flag`,
    { headers: FETCH_HEADERS }
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeoIPResult;
  if (data.success === false || !data.country_code) {
    return null;
  }
  return data.country_code;
}

async function lookupViaGeoJs(ip: string): Promise<string | null> {
  const response = await fetch(
    `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`,
    { headers: FETCH_HEADERS }
  );
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeoJsResult;
  return data.country_code || null;
}

async function getCountryCode(server: string): Promise<string | null> {
  try {
    try {
      const countryCode = await lookupViaIpApi(server);
      if (countryCode) {
        return countryCode;
      }
    } catch {
      // try next provider
    }

    const ip = await resolveHostToIP(server);
    const target = ip || (isIPAddress(server) ? server : null);
    if (!target) {
      return null;
    }

    for (const lookup of [lookupViaIpWhoIs, lookupViaGeoJs]) {
      try {
        const countryCode = await lookup(target);
        if (countryCode) {
          return countryCode;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getEmoji(countryCode: string): string {
  return countryCodeToEmoji(countryCode);
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
