/**
 * Country flag decoration using ipwho.is API
 */

interface GeoIPResult {
  country_code?: string;
  country_name?: string;
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

export async function decorateProxyName(proxyName: string, server: string): Promise<string> {
  // Skip if already decorated or empty
  if (!proxyName || proxyName.length === 0) {
    return proxyName;
  }

  // Skip if already decorated (starts with emoji)
  const firstChar = proxyName.charAt(0);
  if (firstChar && firstChar.charCodeAt(0) > 127) {
    return proxyName;
  }

  const countryCode = await getCountryCode(server);
  if (!countryCode) {
    return proxyName;
  }

  const emoji = getEmoji(countryCode);
  return `${emoji} ${proxyName}`;
}
