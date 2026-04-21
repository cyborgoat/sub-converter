/**
 * Generic proxy parser for trojan, vless, socks, http/https
 */

import { ProxyNode } from '../utils/types';
import { cleanQuery, decodeName, parseURL } from '../utils/url';

function parseNetlocUrl(entry: string): ProxyNode {
  const url = parseURL(entry);
  if (!url) {
    throw new Error('Invalid URL');
  }

  return {
    scheme: url.protocol.replace(':', ''),
    name: decodeName(url.hash),
    server: url.hostname,
    port: url.port || undefined,
    query: cleanQuery(url.search.slice(1)),
    raw: entry,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  };
}

export function parseTrojan(entry: string): ProxyNode {
  const node = parseNetlocUrl(entry);
  return {
    ...node,
    scheme: 'trojan',
    port: node.port || '443',
    password: node.password ?? node.username ?? '',
  };
}

export function parseVless(entry: string): ProxyNode {
  const node = parseNetlocUrl(entry);
  return {
    ...node,
    scheme: 'vless',
    port: node.port || '443',
    username: node.username || '',
  };
}

export function parseSocks(entry: string): ProxyNode {
  const node = parseNetlocUrl(entry);
  return {
    ...node,
    scheme: 'socks',
    port: node.port || '1080',
  };
}

export function parseHttp(entry: string): ProxyNode {
  const node = parseNetlocUrl(entry);
  return {
    ...node,
    scheme: node.scheme === 'https' ? 'https' : 'http',
    port: node.port || (node.scheme === 'https' ? '443' : '80'),
  };
}
