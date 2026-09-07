/**
 * Compact Clash policy template (proxy-groups + rules).
 *
 * The single source of truth is `policy-template.json` in this directory.
 * It is valid JSON (the "JSON-compatible YAML" referenced in the README) and is
 * imported directly here so the data is never hand-written twice. The bundler
 * (esbuild via wrangler) and `tsc` both inline the JSON, so the Worker still has
 * no filesystem dependency at runtime.
 */

import policyTemplate from './policy-template.json' with { type: 'json' };

export const ALL_PROXIES_PLACEHOLDER = '__ALL_PROXIES__' as const;

export const POLICY_TEMPLATE = policyTemplate;
