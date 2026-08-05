/**
 * Convert parsed proxy nodes to Clash config format
 */

import { ProxyNode, ClashProxy, ClashConfig } from '../utils/types.js';
import { parseEntry } from '../parsers/index.js';
import { ALL_PROXIES_PLACEHOLDER, POLICY_TEMPLATE } from '../config/policy-template.js';

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

function firstQueryValue(
  query: Record<string, string>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = query[key];
    if (value !== undefined && value !== '') {
      return value;
    }
  }
  return undefined;
}

function splitCommaSeparated(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const values = value.split(',').map(item => item.trim()).filter(Boolean);
  return values.length > 0 ? values : undefined;
}

function addVlessTransportOptions(proxy: ClashProxy, query: Record<string, string>): void {
  const network = firstQueryValue(query, 'type', 'network') || 'tcp';
  proxy.network = network;

  const path = firstQueryValue(query, 'path');
  const host = firstQueryValue(query, 'host');

  if (network === 'ws') {
    const wsOpts: Record<string, any> = {};
    if (path) wsOpts.path = path;
    if (host) wsOpts.headers = { Host: host };

    const earlyData = firstQueryValue(query, 'ed');
    if (earlyData && Number.isFinite(Number(earlyData))) {
      wsOpts['max-early-data'] = Number(earlyData);
    }
    const earlyDataHeader = firstQueryValue(query, 'eh');
    if (earlyDataHeader) wsOpts['early-data-header-name'] = earlyDataHeader;

    if (Object.keys(wsOpts).length > 0) proxy['ws-opts'] = wsOpts;
    return;
  }

  if (network === 'grpc') {
    const serviceName = firstQueryValue(query, 'serviceName', 'service-name');
    if (serviceName) {
      proxy['grpc-opts'] = { 'grpc-service-name': serviceName };
    }
    return;
  }

  if (network === 'xhttp') {
    const xhttpOpts: Record<string, any> = {};
    if (path) xhttpOpts.path = path;
    if (host) xhttpOpts.host = host;
    const mode = firstQueryValue(query, 'mode');
    if (mode) xhttpOpts.mode = mode;
    if (Object.keys(xhttpOpts).length > 0) proxy['xhttp-opts'] = xhttpOpts;
    return;
  }

  if (network === 'h2') {
    const h2Opts: Record<string, any> = {};
    const hosts = splitCommaSeparated(host);
    if (hosts) h2Opts.host = hosts;
    if (path) h2Opts.path = path;
    if (Object.keys(h2Opts).length > 0) proxy['h2-opts'] = h2Opts;
  }
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
    const query = node.query || {};
    const security = String(query.security || '').toLowerCase();
    const usesReality = security === 'reality';
    const usesTls = security === 'tls' || usesReality;

    if (!node.username) {
      throw new Error('VLESS node is missing its UUID');
    }
    if (usesReality && !firstQueryValue(query, 'pbk', 'public-key')) {
      throw new Error('VLESS Reality node is missing its public key');
    }

    const proxy: ClashProxy = {
      name,
      type: 'vless',
      server: node.server,
      port: parseInt(String(node.port), 10),
      uuid: node.username,
      udp: true,
      tls: usesTls,
    };

    const flow = firstQueryValue(query, 'flow');
    if (flow) proxy.flow = flow;

    const servername = firstQueryValue(query, 'sni', 'servername', 'serverName');
    if (servername) proxy.servername = servername;

    const fingerprint = firstQueryValue(query, 'fp', 'client-fingerprint');
    if (fingerprint && fingerprint !== 'none') {
      proxy['client-fingerprint'] = fingerprint;
    }

    const alpn = splitCommaSeparated(firstQueryValue(query, 'alpn'));
    if (alpn) proxy.alpn = alpn;

    const packetEncoding = firstQueryValue(query, 'packetEncoding', 'packet-encoding');
    if (packetEncoding) proxy['packet-encoding'] = packetEncoding;

    const encryption = firstQueryValue(query, 'encryption');
    if (encryption) proxy.encryption = encryption;

    if (query.allowInsecure !== undefined) {
      proxy['skip-cert-verify'] = parseBool(query.allowInsecure);
    }

    if (usesReality) {
      const publicKey = firstQueryValue(query, 'pbk', 'public-key') as string;
      const realityOpts: Record<string, any> = { 'public-key': publicKey };
      const shortId = query.sid ?? query['short-id'];
      if (shortId !== undefined) realityOpts['short-id'] = shortId;
      proxy['reality-opts'] = realityOpts;
    }

    addVlessTransportOptions(proxy, query);
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
): {
  config: ClashConfig;
  skipped: number;
  skippedDetails: Array<{ index: number; scheme: string; reason: string }>;
} {
  const proxies: ClashProxy[] = [];
  const proxyNames: string[] = [];
  let skipped = 0;
  const skippedDetails: Array<{ index: number; scheme: string; reason: string }> = [];

  for (let index = 0; index < entries.length; index++) {
    try {
      const node = parseEntry(entries[index]);
      const proxy = clashProxyFromNode(node, index + 1);
      proxies.push(proxy);
      proxyNames.push(proxy.name);
    } catch (error) {
      skipped++;
      const schemeMatch = entries[index].match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//);
      skippedDetails.push({
        index: index + 1,
        scheme: schemeMatch?.[1]?.toLowerCase() || 'unknown',
        reason: error instanceof Error ? error.message : String(error),
      });
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
      'skipped-node-count': skipped,
    },
  };

  return { config, skipped, skippedDetails };
}
