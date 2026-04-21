/**
 * Convert parsed proxy nodes to Clash config format
 */

import { ProxyNode, ClashProxy, ClashConfig } from '../utils/types';
import { parseEntry } from '../parsers/index';
import { ALL_PROXIES_PLACEHOLDER, POLICY_TEMPLATE } from '../config/policy-template';

const UNIQUE_POLICY_RULES = Array.from(new Set(POLICY_TEMPLATE.rules));
const COMPILED_POLICY_GROUPS = POLICY_TEMPLATE['proxy-groups'].map(group => {
  const proxies = [...group.proxies] as string[];
  const allProxyIndex = proxies.indexOf(ALL_PROXIES_PLACEHOLDER);
  if (allProxyIndex === -1) {
    return {
      base: { ...group },
      prefix: proxies,
      suffix: [] as string[],
      hasPlaceholder: false as const,
    };
  }

  return {
    base: { ...group },
    prefix: proxies.slice(0, allProxyIndex),
    suffix: proxies.slice(allProxyIndex + 1),
    hasPlaceholder: true as const,
  };
});

function makeName(node: ProxyNode, index: number): string {
  const name = node.name;
  if (typeof name === 'string' && name.trim()) {
    return name.trim();
  }
  const server = node.server || 'node';
  const port = node.port || '0';
  const scheme = node.scheme || 'proxy';
  return `${scheme}-${index}@${server}:${port}`;
}

function parseBool(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return false;
}

function expandPolicyGroups(proxyNames: string[]) {
  return COMPILED_POLICY_GROUPS.map(group => {
    const expanded: Record<string, any> = { ...group.base };
    expanded.proxies = group.hasPlaceholder
      ? [...group.prefix, ...proxyNames, ...group.suffix]
      : [...group.prefix];
    return expanded;
  });
}

function clashProxyFromNode(node: ProxyNode, index: number): ClashProxy {
  const scheme = (node.scheme || '').toLowerCase();
  const name = makeName(node, index);

  if (scheme === 'ss') {
    const proxy: ClashProxy = {
      name,
      type: 'ss',
      server: node.server,
      port: parseInt(String(node.port), 10),
      cipher: node.cipher,
      password: node.password,
      udp: true,
      tfo: false,
    };
    if (node.query?.plugin) {
      proxy.plugin = node.query.plugin;
    }
    if (node.query?.['plugin-opts']) {
      proxy['plugin-opts'] = { mode: node.query['plugin-opts'] };
    }
    return proxy;
  }

  if (scheme === 'vmess') {
    const proxy: ClashProxy = {
      name,
      type: 'vmess',
      server: node.add,
      port: parseInt(String(node.port), 10),
      uuid: node.id,
      alterId: parseInt(String(node.aid || 0), 10),
      cipher: node.scy || 'auto',
      tls: parseBool(node.tls),
      'skip-cert-verify': true,
      udp: true,
      tfo: false,
    };
    if (node.net && node.net !== 'tcp') {
      proxy.network = node.net;
    }
    if (node.path && node.net === 'ws') {
      proxy['ws-opts'] = { path: node.path };
      if (node.host) {
        proxy['ws-opts'].headers = { Host: node.host };
      }
    }
    if (node.host && node.net !== 'ws') {
      proxy.servername = node.host;
    }
    if (node.sni) {
      proxy.servername = node.sni;
    }
    return proxy;
  }

  if (scheme === 'trojan') {
    const proxy: ClashProxy = {
      name,
      type: 'trojan',
      server: node.server,
      port: parseInt(String(node.port), 10),
      password: node.password,
      udp: true,
      'skip-cert-verify': true,
    };
    if (node.query?.sni) {
      proxy.sni = node.query.sni;
    }
    return proxy;
  }

  if (scheme === 'vless') {
    const proxy: ClashProxy = {
      name,
      type: 'vless',
      server: node.server,
      port: parseInt(String(node.port), 10),
      uuid: node.username,
      udp: true,
      tls: parseBool(node.query?.security === 'tls'),
    };
    if (node.query?.flow) {
      proxy.flow = node.query.flow;
    }
    if (node.query?.sni) {
      proxy.servername = node.query.sni;
    }
    return proxy;
  }

  if (scheme === 'socks') {
    return {
      name,
      type: 'socks5',
      server: node.server,
      port: parseInt(String(node.port), 10),
      username: node.username,
      password: node.password,
      udp: true,
    };
  }

  if (scheme === 'http' || scheme === 'https') {
    const proxy: ClashProxy = {
      name,
      type: 'http',
      server: node.server,
      port: parseInt(String(node.port), 10),
    };
    if (node.username !== null && node.username !== undefined) {
      proxy.username = node.username;
    }
    if (node.password !== null && node.password !== undefined) {
      proxy.password = node.password;
    }
    if (scheme === 'https') {
      proxy.tls = true;
      proxy['skip-cert-verify'] = true;
    }
    return proxy;
  }

  if (scheme === 'ssr') {
    return {
      name,
      type: 'ssr',
      server: node.server,
      port: parseInt(String(node.port), 10),
      cipher: node.cipher,
      password: node.password,
      protocol: node.protocol,
      obfs: node.obfs,
      udp: true,
    };
  }

  throw new Error(`unsupported scheme: ${scheme}`);
}

export function buildClashConfig(
  source: string,
  sourceType: string,
  encoding: string,
  entries: string[]
): { config: ClashConfig; skipped: number } {
  const proxies: ClashProxy[] = [];
  const proxyNames: string[] = [];
  let skipped = 0;

  for (let index = 0; index < entries.length; index++) {
    try {
      const node = parseEntry(entries[index]);
      const proxy = clashProxyFromNode(node, index + 1);
      proxies.push(proxy);
      proxyNames.push(proxy.name);
    } catch {
      skipped++;
    }
  }

  const proxyGroups = expandPolicyGroups(proxyNames);

  const config: ClashConfig = {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'Rule',
    'log-level': 'info',
    'external-controller': '127.0.0.1:9090',
    proxies,
    'proxy-groups': proxyGroups,
    rules: UNIQUE_POLICY_RULES,
    'subscription-info': {
      source,
      'source-type': sourceType,
      'source-encoding': encoding,
      'node-count': proxies.length,
    },
  };

  return { config, skipped };
}
