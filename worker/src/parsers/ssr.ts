/**
 * ShadowSocksR parser
 */

import { ProxyNode } from '../utils/types';
import { padBase64 } from '../services/subscription';
import { cleanQuery } from '../utils/url';

export function parseSSR(entry: string): ProxyNode {
  if (!entry.startsWith('ssr://')) {
    throw new Error('Invalid ssr URL');
  }

  const payload = atob(padBase64(entry.replace('ssr://', '')));

  try {
    const [mainPart, queryString = ''] = payload.split('/?');
    const parts = mainPart.split(':');
    if (parts.length < 6) {
      throw new Error('Invalid ssr format');
    }

    const [server, port, protocol, method, obfs, passwordBase64] = parts;
    const password = atob(padBase64(passwordBase64));
    const query = cleanQuery(queryString);
    const decodedQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (['remarks', 'group', 'protoparam', 'obfsparam'].includes(key)) {
        try {
          decodedQuery[key] = atob(padBase64(value));
        } catch {
          decodedQuery[key] = value;
        }
      } else {
        decodedQuery[key] = value;
      }
    }

    return {
      scheme: 'ssr',
      server,
      port,
      protocol,
      cipher: method,
      obfs,
      password,
      name: decodedQuery.remarks,
      query: decodedQuery,
      raw: entry,
    };
  } catch (e) {
    throw new Error(`Failed to parse ssr: ${e}`);
  }
}
