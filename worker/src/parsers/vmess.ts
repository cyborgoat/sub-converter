/**
 * VMess parser
 */

import { ProxyNode } from '../utils/types';

export function parseVMess(entry: string): ProxyNode {
  if (!entry.startsWith('vmess://')) {
    throw new Error('Invalid vmess URL');
  }

  const payload = entry.replace('vmess://', '');

  try {
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    const config = JSON.parse(decoded);

    return {
      scheme: 'vmess',
      server: config.add || config.server,
      add: config.add || config.server,
      port: String(config.port),
      id: config.id,
      aid: config.aid || 0,
      scy: config.scy || 'auto',
      tls: config.tls,
      net: config.net || 'tcp',
      path: config.path,
      host: config.host,
      sni: config.sni,
      name: config.ps,
    };
  } catch (e) {
    throw new Error(`Failed to parse vmess: ${e}`);
  }
}
