/**
 * Main Cloudflare Worker handler
 */

import { fetchSubscription, subscriptionText, splitEntries } from './services/subscription';
import { buildClashConfig } from './converters/clash';
import { renderYaml } from './renderers/yaml';
import { decorateProxyNames } from './decorators/flag';

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const subscriptionUrl = url.searchParams.get('url');
  if (!subscriptionUrl) {
    return new Response(
      'Missing required parameter: url\nUsage: ?url=<subscription_url>',
      { status: 400, headers: { 'Content-Type': 'text/plain' } }
    );
  }

  const decorate = url.searchParams.get('decorate');
  const shouldDecorate = decorate !== 'false' && decorate !== '0';

  try {
    // Fetch subscription
    const raw = await fetchSubscription(subscriptionUrl, 15000);
    const [text, sourceType, encoding] = subscriptionText(raw);
    const entries = splitEntries(text);

    if (entries.length === 0) {
      return new Response('No valid proxy entries found in subscription', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Build clash config
    const { config, skipped } = buildClashConfig(subscriptionUrl, sourceType, encoding, entries);
    if (config.proxies.length === 0) {
      return new Response(
        `No supported proxy entries were converted (${skipped} skipped).`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/plain' },
        }
      );
    }

    // Decorate proxies if requested
    if (shouldDecorate && config.proxies.length > 0) {
      const nameMap = await decorateProxyNames(config.proxies);
      const decoratedProxies = config.proxies.map(proxy => ({
        ...proxy,
        name: nameMap.get(proxy.name) ?? proxy.name,
      }));

      // Update proxy names in groups
      config.proxies = decoratedProxies;
      config['proxy-groups'] = config['proxy-groups'].map(group => ({
        ...group,
        proxies: group.proxies.map((p: string) => nameMap.get(p) ?? p),
      }));
    }

    // Render YAML
    const yaml = renderYaml(config);

    return new Response(yaml, {
      status: 200,
      headers: {
        'Content-Type': 'application/yaml; charset=utf-8',
        'Content-Disposition': 'attachment; filename=clash-profile',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error processing subscription:', message);

    return new Response(`Error: ${message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

export default {
  fetch: handleRequest,
};
