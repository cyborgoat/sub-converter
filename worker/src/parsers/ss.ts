/**
 * ShadowSocks parser
 */

import { ProxyNode } from '../utils/types';
import { padBase64 } from '../services/subscription';
import { cleanQuery, decodeName } from '../utils/url';

export function parseSS(entry: string): ProxyNode {
  let body = entry.slice('ss://'.length);
  let name: string | undefined;

  const hashIndex = body.indexOf('#');
  if (hashIndex !== -1) {
    name = decodeName(body.slice(hashIndex));
    body = body.slice(0, hashIndex);
  }

  let query: Record<string, string> = {};
  const queryIndex = body.indexOf('?');
  if (queryIndex !== -1) {
    query = cleanQuery(body.slice(queryIndex + 1));
    body = body.slice(0, queryIndex);
  }

  let decodedBody = body;
  if (!body.includes('@')) {
    try {
      decodedBody = atob(padBase64(body));
    } catch {
      decodedBody = body;
    }
  }

  if (!decodedBody.includes('@') || !decodedBody.includes(':')) {
    throw new Error('invalid ss entry');
  }

  const atIndex = decodedBody.lastIndexOf('@');
  const userInfo = decodedBody.slice(0, atIndex);
  const hostInfo = decodedBody.slice(atIndex + 1);
  const colonIndex = userInfo.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('invalid ss entry');
  }

  const method = userInfo.slice(0, colonIndex);
  const password = userInfo.slice(colonIndex + 1);
  const hostColonIndex = hostInfo.lastIndexOf(':');
  if (hostColonIndex === -1) {
    throw new Error('invalid ss entry');
  }

  const server = hostInfo.slice(0, hostColonIndex);
  const port = hostInfo.slice(hostColonIndex + 1);

  return {
    scheme: 'ss',
    name,
    server,
    port,
    cipher: method,
    password,
    query,
    raw: entry,
  };
}
