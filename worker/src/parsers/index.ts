/**
 * Entry parser dispatcher
 */

import { ProxyNode } from '../utils/types.js';
import { parseSS } from './ss.js';
import { parseVMess } from './vmess.js';
import { parseSSR } from './ssr.js';
import { parseTrojan, parseVless, parseSocks, parseHttp } from './generic.js';

export function parseEntry(entry: string): ProxyNode {
  const trimmed = entry.trim();

  if (trimmed.startsWith('ss://')) {
    return parseSS(trimmed);
  }
  if (trimmed.startsWith('vmess://')) {
    return parseVMess(trimmed);
  }
  if (trimmed.startsWith('ssr://')) {
    return parseSSR(trimmed);
  }
  if (trimmed.startsWith('trojan://')) {
    return parseTrojan(trimmed);
  }
  if (trimmed.startsWith('vless://')) {
    return parseVless(trimmed);
  }
  if (trimmed.startsWith('socks://')) {
    return parseSocks(trimmed);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return parseHttp(trimmed);
  }

  throw new Error(`Unknown proxy scheme: ${trimmed}`);
}
