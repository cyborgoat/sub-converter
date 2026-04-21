/**
 * Common types and interfaces
 */

export interface ProxyNode {
  scheme: string;
  server: string;
  port?: string | number;
  [key: string]: any;
}

export interface ClashProxy {
  name: string;
  type: string;
  server: string;
  port: number;
  [key: string]: any;
}

export interface ClashConfig {
  port: number;
  'socks-port': number;
  'allow-lan': boolean;
  mode: string;
  'log-level': string;
  'external-controller': string;
  proxies: ClashProxy[];
  'proxy-groups': any[];
  rules: string[];
  'subscription-info'?: any;
}

export interface ParsedQueryParams {
  url: string;
  decorate: boolean;
  timeout: number;
}
